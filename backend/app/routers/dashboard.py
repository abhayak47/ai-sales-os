from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.activity import Activity
from app.models.lead import Lead
from app.services.auth import build_user_payload, get_current_user

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


def _status_priority_value(priority: str) -> int:
    return {"critical": 0, "high": 1, "medium": 2, "low": 3}.get(priority, 4)


def _days_since(reference_date) -> int:
    if hasattr(reference_date, "replace"):
        reference_date = reference_date.replace(tzinfo=None)
    return max((datetime.now() - reference_date).days, 0)


def _workspace_leads_query(user, db: Session):
    if getattr(user, "organization_id", None):
        return db.query(Lead).filter(Lead.organization_id == user.organization_id)
    return db.query(Lead).filter(Lead.user_id == user.id)


def _workspace_lead(user, db: Session, lead_id: int):
    return _workspace_leads_query(user, db).filter(Lead.id == lead_id).first()


def _build_outreach_draft(lead: Lead, last_activity, action_type: str) -> str:
    first_name = lead.name.split()[0]
    company_context = f" at {lead.company}" if lead.company else ""

    if action_type == "call_now":
        return (
            f"Call {first_name}{company_context} today. Open with their current priority, "
            "reference the most recent interaction, and ask for one concrete next step before hanging up."
        )

    if action_type == "revive":
        topic = f" about {last_activity.title}" if last_activity else ""
        return (
            f"Hi {first_name}, circling back on our earlier conversation{topic}. "
            "Has the priority shifted, or is there a better time for us to reconnect this week?"
        )

    if action_type == "nurture":
        return (
            f"Hi {first_name}, sharing a quick idea that could help {lead.company or 'your team'} move faster. "
            "If useful, I can send a short breakdown or walk you through it in 10 minutes."
        )

    return (
        f"Hi {first_name}, I wanted to reach out because I think there may be a strong fit{company_context}. "
        "Would you be open to a short intro call this week?"
    )


def _build_command_for_lead(lead: Lead, activities):
    last_activity = activities[0] if activities else None
    reference_date = (
        lead.last_activity_at
        or (last_activity.created_at if last_activity else None)
        or lead.created_at
    )
    days_inactive = _days_since(reference_date)

    status_weight = {
        "New": 48,
        "Contacted": 62,
        "Interested": 86,
        "Converted": 35,
        "Lost": 10,
    }.get(lead.status, 45)
    health_score = int(lead.health_score or 50)
    relationship_score = int(lead.relationship_score or 50)
    inactivity_penalty = min(days_inactive * 4, 35)
    momentum_score = max(
        min(status_weight + (health_score // 5) + (relationship_score // 10) - inactivity_penalty, 100),
        0,
    )

    if lead.status == "Interested" and days_inactive >= 2:
        priority = "critical"
        action_type = "call_now"
        channel = "Call"
        timing = "Within 2 hours"
        why_now = f"Interested lead with {days_inactive} day(s) of silence. Momentum is slipping."
    elif lead.status == "Contacted" and days_inactive >= 4:
        priority = "high"
        action_type = "revive"
        channel = "WhatsApp"
        timing = "Today"
        why_now = f"Contacted lead has gone quiet for {days_inactive} day(s). They need a re-engagement touchpoint."
    elif lead.status == "New" and days_inactive >= 1:
        priority = "high"
        action_type = "first_touch"
        channel = "WhatsApp"
        timing = "Today"
        why_now = "New lead has not been worked yet. Speed matters most at this stage."
    elif lead.status == "Converted":
        priority = "medium"
        action_type = "nurture"
        channel = "WhatsApp"
        timing = "This week"
        why_now = "Converted customer is ready for referral, upsell, or testimonial outreach."
    else:
        priority = "medium"
        action_type = "nurture"
        channel = "Email"
        timing = "Today"
        why_now = "Keep the deal warm with a value-add follow-up."

    evidence = [
        f"Status: {lead.status}",
        f"Inactivity: {days_inactive} day(s)",
        f"Relationship score: {relationship_score}/100",
        f"Health score: {health_score}/100",
    ]
    if last_activity:
        evidence.append(f"Last activity: {last_activity.type} - {last_activity.title}")

    power_moves = [
        "End every outreach with a clear next step and date.",
        "Reference something specific from lead history so the message feels human.",
        "Push for one concrete commitment instead of a vague 'let me know'.",
    ]

    if lead.status == "Interested":
        power_moves[0] = "Push for a decision-driving call, proposal review, or stakeholder intro."
    elif lead.status == "Converted":
        power_moves[0] = "Ask for a referral, expansion use case, or testimonial while satisfaction is high."

    return {
        "lead_id": lead.id,
        "lead_name": lead.name,
        "company": lead.company or "",
        "status": lead.status,
        "priority": priority,
        "momentum_score": momentum_score,
        "days_inactive": days_inactive,
        "recommended_channel": channel,
        "recommended_timing": timing,
        "next_best_action": action_type.replace("_", " ").title(),
        "why_now": why_now,
        "draft_message": _build_outreach_draft(lead, last_activity, action_type),
        "power_moves": power_moves,
        "evidence": evidence,
        "last_activity": last_activity.title if last_activity else "No activity yet",
        "health_score": health_score,
        "relationship_score": relationship_score,
    }


@router.get("/stats")
def get_stats(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):
    user = get_current_user(token, db)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    leads = _workspace_leads_query(user, db).all()
    total_leads = len(leads)
    converted = len([l for l in leads if l.status == "Converted"])
    contacted = len([l for l in leads if l.status == "Contacted"])
    interested = len([l for l in leads if l.status == "Interested"])
    lost = len([l for l in leads if l.status == "Lost"])
    new_leads = len([l for l in leads if l.status == "New"])
    conversion_rate = round((converted / total_leads * 100), 1) if total_leads > 0 else 0
    segments_live = len({(lead.segment or "general") for lead in leads})
    tagged_leads = len([lead for lead in leads if lead.tags])
    open_pipeline = len([lead for lead in leads if lead.status not in ["Converted", "Lost"]])
    user_payload = build_user_payload(db, user)

    return {
        "user": user_payload,
        "workspace": {
            "name": user_payload.get("organization_name") or "Personal workspace",
            "slug": user_payload.get("organization_slug"),
            "role": user_payload.get("role") or "owner",
            "segments_live": segments_live,
            "tagged_leads": tagged_leads,
            "open_pipeline": open_pipeline,
            "scope": "workspace" if user_payload.get("organization_id") else "personal",
        },
        "leads": {
            "total": total_leads,
            "new": new_leads,
            "contacted": contacted,
            "interested": interested,
            "converted": converted,
            "lost": lost,
            "conversion_rate": conversion_rate,
        },
    }


@router.get("/today-focus")
def get_today_focus(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):
    user = get_current_user(token, db)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    leads = _workspace_leads_query(user, db).all()
    actions = []

    hot_leads = [l for l in leads if l.status == "Interested"]
    for lead in hot_leads[:2]:
        actions.append({
            "type": "follow_up",
            "priority": "high",
            "icon": "Fire",
            "title": f"Follow up with {lead.name}",
            "desc": f"{lead.name} is interested. Strike while momentum is high.",
            "lead_id": lead.id,
            "action_path": f"/leads/{lead.id}",
            "credits": 0,
        })

    new_leads = [l for l in leads if l.status == "New"]
    for lead in new_leads[:2]:
        actions.append({
            "type": "contact",
            "priority": "medium",
            "icon": "Wave",
            "title": f"Contact {lead.name}",
            "desc": "New lead. Reach out and start the conversation.",
            "lead_id": lead.id,
            "action_path": f"/leads/{lead.id}",
            "credits": 0,
        })

    contacted_leads = [l for l in leads if l.status == "Contacted"]
    for lead in contacted_leads[:1]:
        actions.append({
            "type": "nurture",
            "priority": "medium",
            "icon": "Chat",
            "title": f"Nurture {lead.name}",
            "desc": "Add value before the lead goes cold.",
            "lead_id": lead.id,
            "action_path": f"/leads/{lead.id}",
            "credits": 0,
        })

    if not leads:
        actions.append({
            "type": "add_lead",
            "priority": "high",
            "icon": "Plus",
            "title": "Add your first lead",
            "desc": "Start by adding a real prospect you are working with.",
            "lead_id": None,
            "action_path": "/leads",
            "credits": 0,
        })

    if leads:
        top_lead = hot_leads[0] if hot_leads else leads[0]
        actions.append({
            "type": "ai_analysis",
            "priority": "low",
            "icon": "Brain",
            "title": f"Analyze {top_lead.name}",
            "desc": "Get deal score, risks, and the next best move.",
            "lead_id": top_lead.id,
            "action_path": f"/leads/{top_lead.id}",
            "credits": 3,
        })

    return {
        "date": datetime.now().strftime("%A, %d %B %Y"),
        "actions": actions[:5],
    }


@router.get("/smart-followup/{lead_id}")
def get_smart_followup(
    lead_id: int,
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):
    user = get_current_user(token, db)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    lead = _workspace_lead(user, db, lead_id)
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    activities = db.query(Activity).filter(
        Activity.lead_id == lead_id
    ).order_by(Activity.created_at.desc()).all()

    last_activity = activities[0] if activities else None
    activity_count = len(activities)
    first_name = lead.name.split()[0]

    context_parts = []
    if lead.notes:
        context_parts.append(f"Notes: {lead.notes}")
    for activity in activities[:3]:
        context_parts.append(f"{activity.type}: {activity.title} - {activity.description or ''}")
    context = " | ".join(context_parts) if context_parts else "No history yet"

    recommendations = []

    if lead.status == "New":
        message = f"Hi {first_name}, I came across {lead.company or 'your work'} and would love to explore if there is a fit. Would you be open to a quick 15-minute call this week?"
        recommendations.append({
            "channel": "WhatsApp",
            "timing": "Today",
            "message": message,
            "reason": "Fast first-touch outreach works best while the lead is still fresh.",
        })
    elif lead.status == "Contacted":
        context_line = f" on {last_activity.title}" if last_activity else ""
        message = f"Hi {first_name}, following up{context_line}. Did you get a chance to think it through? Happy to answer any questions."
        recommendations.append({
            "channel": "WhatsApp",
            "timing": "Tomorrow",
            "message": message,
            "reason": "A specific callback to the last interaction increases reply rates.",
        })
    elif lead.status == "Interested":
        recommendations.append({
            "channel": "Call",
            "timing": "Today",
            "message": f"Call {first_name} and push for a concrete next step: proposal review, decision call, or stakeholder intro.",
            "reason": "Interested deals need momentum, not passive nurturing.",
        })
        recommendations.append({
            "channel": "WhatsApp",
            "timing": "Today",
            "message": f"Hi {first_name}, great speaking with you. I am putting together the next step based on what we discussed. Does tomorrow work for a quick review?",
            "reason": "Use written follow-up to lock in the next commitment.",
        })
    elif lead.status == "Converted":
        recommendations.append({
            "channel": "WhatsApp",
            "timing": "This week",
            "message": f"Hi {first_name}, checking in to make sure everything is running smoothly. If useful, I can also share ideas for the next growth step.",
            "reason": "Converted customers are the easiest path to expansion and referrals.",
        })
    elif lead.status == "Lost":
        recommendations.append({
            "channel": "Email",
            "timing": "Next week",
            "message": f"Hi {first_name}, wanted to reconnect in case priorities have shifted since we last spoke. If timing is better now, I would be glad to pick things up.",
            "reason": "Lost deals are best re-opened with a low-pressure re-entry.",
        })

    return {
        "lead_name": lead.name,
        "lead_status": lead.status,
        "lead_email": lead.email,
        "lead_phone": lead.phone,
        "last_activity": last_activity.title if last_activity else "No activity yet",
        "activity_count": activity_count,
        "context_used": context,
        "recommendations": recommendations,
    }


@router.get("/command-center")
def get_command_center(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):
    user = get_current_user(token, db)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    leads = _workspace_leads_query(user, db).all()
    plays = []
    for lead in leads:
        activities = db.query(Activity).filter(
            Activity.lead_id == lead.id
        ).order_by(Activity.created_at.desc()).all()
        play = _build_command_for_lead(lead, activities)
        if lead.status != "Lost":
            plays.append(play)

    plays.sort(key=lambda play: (_status_priority_value(play["priority"]), -play["momentum_score"], -play["days_inactive"]))

    return {
        "headline": "AI Deal Command Center",
        "summary": {
            "total_open_leads": len([lead for lead in leads if lead.status not in ["Converted", "Lost"]]),
            "critical_plays": len([play for play in plays if play["priority"] == "critical"]),
            "high_priority_plays": len([play for play in plays if play["priority"] == "high"]),
        },
        "plays": plays[:8],
    }


@router.get("/deal-command/{lead_id}")
def get_deal_command(
    lead_id: int,
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):
    user = get_current_user(token, db)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    lead = _workspace_lead(user, db, lead_id)
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    activities = db.query(Activity).filter(
        Activity.lead_id == lead.id
    ).order_by(Activity.created_at.desc()).all()
    play = _build_command_for_lead(lead, activities)

    return {
        **play,
        "obvious_risks": [
            "No clear next meeting booked" if play["days_inactive"] >= 2 else "Momentum depends on continued follow-up",
            "The deal may stall if outreach stays generic",
            "You need one concrete commitment from the buyer in the next touchpoint",
        ],
        "recommended_sequence": [
            f"{play['recommended_channel']} {play['recommended_timing']}",
            "Log the outcome immediately after outreach",
            "Set the next follow-up date before ending the interaction",
        ],
    }


@router.get("/deal-risks")
def get_deal_risks(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):
    user = get_current_user(token, db)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    leads = _workspace_leads_query(user, db).filter(
        Lead.status.notin_(["Converted", "Lost"])
    ).all()

    risks = []
    for lead in leads:
        activities = db.query(Activity).filter(
            Activity.lead_id == lead.id
        ).order_by(Activity.created_at.desc()).all()

        last_activity_date = None
        if activities:
            last_activity_date = activities[0].created_at.replace(tzinfo=None)

        lead_created = lead.created_at.replace(tzinfo=None)
        reference_date = last_activity_date or lead_created
        days_inactive = (datetime.now() - reference_date).days

        risk_level = None
        risk_reason = None
        rescue_strategy = None

        if lead.status == "Interested" and days_inactive >= 3:
            risk_level = "Critical"
            risk_reason = f"Hot lead has gone cold. No contact for {days_inactive} days."
            rescue_strategy = f"Call {lead.name.split()[0]} immediately, reference the last conversation, and create urgency with a concrete next step."
        elif lead.status == "Contacted" and days_inactive >= 7:
            risk_level = "High"
            risk_reason = f"No follow-up for {days_inactive} days after first contact."
            rescue_strategy = f"Send a value-add WhatsApp to {lead.name.split()[0]} with a relevant case study or insight."
        elif lead.status == "New" and days_inactive >= 5:
            risk_level = "Medium"
            risk_reason = f"New lead has not been contacted for {days_inactive} days."
            rescue_strategy = f"Reach out to {lead.name.split()[0]} today with a personalized first-touch message."

        if risk_level:
            risks.append({
                "lead_id": lead.id,
                "lead_name": lead.name,
                "company": lead.company or "",
                "status": lead.status,
                "days_inactive": days_inactive,
                "risk_level": risk_level,
                "risk_reason": risk_reason,
                "rescue_strategy": rescue_strategy,
            })

    risks.sort(key=lambda item: item["days_inactive"], reverse=True)
    return {"risks": risks, "total": len(risks)}
