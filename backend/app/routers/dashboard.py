from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from app.database import get_db
from app.services.auth import get_current_user
from app.models.lead import Lead
from datetime import datetime

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

@router.get("/stats")
def get_stats(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):
    user = get_current_user(token, db)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    leads = db.query(Lead).filter(Lead.user_id == user.id).all()
    total_leads = len(leads)
    converted = len([l for l in leads if l.status == "Converted"])
    contacted = len([l for l in leads if l.status == "Contacted"])
    interested = len([l for l in leads if l.status == "Interested"])
    lost = len([l for l in leads if l.status == "Lost"])
    new_leads = len([l for l in leads if l.status == "New"])
    conversion_rate = round((converted / total_leads * 100), 1) if total_leads > 0 else 0

    return {
        "user": {
            "id": user.id,
            "full_name": user.full_name,
            "email": user.email,
            "plan": user.plan,
            "ai_credits": user.ai_credits,
            "is_onboarded": user.is_onboarded,
        },
        "leads": {
            "total": total_leads,
            "new": new_leads,
            "contacted": contacted,
            "interested": interested,
            "converted": converted,
            "lost": lost,
            "conversion_rate": conversion_rate,
        }
    }


@router.get("/today-focus")
def get_today_focus(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):
    user = get_current_user(token, db)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    leads = db.query(Lead).filter(Lead.user_id == user.id).all()
    actions = []

    # Check for hot leads
    hot_leads = [l for l in leads if l.status == "Interested"]
    for lead in hot_leads[:2]:
        actions.append({
            "type": "follow_up",
            "priority": "high",
            "icon": "🔥",
            "title": f"Follow up with {lead.name}",
            "desc": f"{lead.name} is interested — strike while iron is hot!",
            "lead_id": lead.id,
            "action_path": "/followup",
            "credits": 0
        })

    # Check for new leads
    new_leads = [l for l in leads if l.status == "New"]
    for lead in new_leads[:2]:
        actions.append({
            "type": "contact",
            "priority": "medium",
            "icon": "👋",
            "title": f"Contact {lead.name}",
            "desc": f"New lead — reach out and start the conversation",
            "lead_id": lead.id,
            "action_path": "/leads",
            "credits": 0
        })

    # Check for contacted leads
    contacted_leads = [l for l in leads if l.status == "Contacted"]
    for lead in contacted_leads[:1]:
        actions.append({
            "type": "nurture",
            "priority": "medium",
            "icon": "💬",
            "title": f"Nurture {lead.name}",
            "desc": f"You contacted them — send a value-add follow-up",
            "lead_id": lead.id,
            "action_path": "/followup",
            "credits": 0
        })

    # If no leads
    if not leads:
        actions.append({
            "type": "add_lead",
            "priority": "high",
            "icon": "➕",
            "title": "Add your first lead",
            "desc": "Start by adding a real prospect you're working with",
            "lead_id": None,
            "action_path": "/leads",
            "credits": 0
        })

    # Always suggest AI analysis for top lead
    if leads:
        top_lead = hot_leads[0] if hot_leads else leads[0]
        actions.append({
            "type": "ai_analysis",
            "priority": "low",
            "icon": "🧠",
            "title": f"AI Brain analysis for {top_lead.name}",
            "desc": "Get AI insights, deal score and next best action",
            "lead_id": top_lead.id,
            "action_path": "/leads",
            "credits": 3
        })

    return {
        "date": datetime.now().strftime("%A, %d %B %Y"),
        "actions": actions[:5]
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

    lead = db.query(Lead).filter(
        Lead.id == lead_id,
        Lead.user_id == user.id
    ).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    from app.models.lead import Activity
    activities = db.query(Activity).filter(
        Activity.lead_id == lead_id
    ).order_by(Activity.created_at.desc()).all()

    last_activity = activities[0] if activities else None
    activity_count = len(activities)
    first_name = lead.name.split()[0]

    # Build context from real data
    context_parts = []
    if lead.notes:
        context_parts.append(f"Notes: {lead.notes}")
    if activities:
        recent = activities[:3]
        for a in recent:
            context_parts.append(f"{a.type}: {a.title} — {a.description or ''}")
    context = " | ".join(context_parts) if context_parts else "No history yet"

    recommendations = []

    if lead.status == "New":
        msg = f"Hi {first_name},"
        if lead.company:
            msg += f" I came across {lead.company} and"
        msg += f" I'd love to connect and explore if we can create value for you. Would you be open to a quick 15-min call this week?"
        recommendations.append({
            "channel": "WhatsApp",
            "timing": "Today",
            "message": msg,
            "reason": "First contact — WhatsApp gets 5x higher response rate than email"
        })

    elif lead.status == "Contacted":
        if last_activity:
            msg = f"Hi {first_name}, following up on our {last_activity.type}."
            if last_activity.description:
                msg += f" You had mentioned — '{last_activity.description[:80]}...'" if len(last_activity.description) > 80 else f" You had mentioned — '{last_activity.description}'"
            msg += " Did you get a chance to think about it? Happy to answer any questions!"
        else:
            msg = f"Hi {first_name}, just following up on my previous message. Would love to connect — even a 10-min call works!"
        recommendations.append({
            "channel": "WhatsApp",
            "timing": "Tomorrow",
            "message": msg,
            "reason": "Reference past interaction to show you remember them"
        })

    elif lead.status == "Interested":
        call_msg = f"Call {first_name}"
        if lead.company:
            call_msg += f" at {lead.company}"
        if lead.notes:
            call_msg += f" — Context: {lead.notes[:100]}"
        call_msg += " — Discuss specifics, handle objections and move to proposal stage"

        whatsapp_msg = f"Hi {first_name},"
        if last_activity and last_activity.description:
            whatsapp_msg += f" great connecting with you! Based on what we discussed about '{last_activity.description[:60]}', I'm putting together a tailored proposal."
        else:
            whatsapp_msg += " I'm excited about the opportunity to work together! I'm putting together a tailored proposal for you."
        whatsapp_msg += " Should have it ready by tomorrow — does that timeline work for you?"

        recommendations.append({
            "channel": "Call",
            "timing": "Today",
            "message": call_msg,
            "reason": f"🔥 {first_name} is INTERESTED — call now while momentum is high!"
        })
        recommendations.append({
            "channel": "WhatsApp",
            "timing": "Today",
            "message": whatsapp_msg,
            "reason": "Send post-call WhatsApp to keep momentum and set next step"
        })

    elif lead.status == "Converted":
        msg = f"Hi {first_name}, hope everything is going smoothly!"
        if lead.notes:
            msg += f" Just checking in on {lead.notes[:50]}."
        msg += " We're always here if you need anything. Also, if you know anyone who could benefit from our services, we'd really appreciate a referral 🙏"
        recommendations.append({
            "channel": "WhatsApp",
            "timing": "This week",
            "message": msg,
            "reason": "Nurture converted client for referrals and upsells"
        })

    elif lead.status == "Lost":
        msg = f"Hi {first_name}, I hope things are going well!"
        if last_activity:
            msg += f" It's been a while since we last spoke about {last_activity.title}."
        msg += " Things change, and I wanted to check if there's a better time to reconnect. No pressure at all!"
        recommendations.append({
            "channel": "Email",
            "timing": "Next week",
            "message": msg,
            "reason": "Re-engage cold/lost lead with low-pressure outreach"
        })

    return {
        "lead_name": lead.name,
        "lead_status": lead.status,
        "last_activity": last_activity.title if last_activity else "No activity yet",
        "activity_count": activity_count,
        "context_used": context,
        "recommendations": recommendations
    }