from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from app.database import get_db
from app.services.auth import get_current_user
from app.models.lead import Lead
from app.services.ai import sales_coach_chat
from collections import Counter

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


@router.get("/stats")
def get_dashboard_stats(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):
    user = get_current_user(token, db)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    leads = db.query(Lead).filter(Lead.user_id == user.id).all()

    if not leads:
        return {
            "total_leads": 0,
            "ai_credits": user.ai_credits,
            "user_email": user.email,
            "plan": user.plan,
            "pipeline_funnel": {
                "New": 0, "Contacted": 0,
                "Interested": 0, "Converted": 0, "Lost": 0
            },
            "predicted_revenue": 0,
            "win_rate": 0,
            "top_leads": [],
            "followup_today": [],
            "avg_score": 0,
            "hot_leads_count": 0,
            "converted_count": 0,
            "lost_count": 0,
            "conversion_rate": 0,
        }

    # ── Pipeline funnel counts ──
    status_counts = Counter(lead.status for lead in leads)
    pipeline_funnel = {
        "New": status_counts.get("New", 0),
        "Contacted": status_counts.get("Contacted", 0),
        "Interested": status_counts.get("Interested", 0),
        "Converted": status_counts.get("Converted", 0),
        "Lost": status_counts.get("Lost", 0),
    }

    # ── Predicted revenue (sum of all non-lost leads) ──
    predicted_revenue = sum(
        lead.predicted_revenue or 0
        for lead in leads
        if lead.status != "Lost"
    )

    # ── Win rate ──
    closed_leads = [l for l in leads if l.status in ["Converted", "Lost"]]
    converted = [l for l in leads if l.status == "Converted"]
    win_rate = (
        round((len(converted) / len(closed_leads)) * 100, 1)
        if closed_leads else 0
    )

    # ── Conversion rate (converted / total) ──
    conversion_rate = (
        round((len(converted) / len(leads)) * 100, 1)
        if leads else 0
    )

    # ── Top leads by score ──
    scored_leads = sorted(
        [l for l in leads if l.score and l.score > 0 and l.status != "Lost"],
        key=lambda x: x.score,
        reverse=True
    )[:5]

    top_leads = [
        {
            "id": l.id,
            "name": l.name,
            "company": l.company or "—",
            "status": l.status,
            "score": l.score or 0,
            "predicted_revenue": l.predicted_revenue or 0,
            "follow_up_date": l.follow_up_date or "—",
        }
        for l in scored_leads
    ]

    # ── Follow-up today alerts ──
    followup_keywords = ["today", "tomorrow", "in 1 day", "asap", "urgent"]
    followup_today = [
        {
            "id": l.id,
            "name": l.name,
            "company": l.company or "—",
            "status": l.status,
            "follow_up_date": l.follow_up_date,
            "score": l.score or 0,
        }
        for l in leads
        if l.follow_up_date and
        any(k in (l.follow_up_date or "").lower() for k in followup_keywords)
    ][:5]

    # ── Avg score ──
    scored = [l.score for l in leads if l.score and l.score > 0]
    avg_score = round(sum(scored) / len(scored), 1) if scored else 0

    # ── Hot leads (score >= 70) ──
    hot_leads_count = len([l for l in leads if (l.score or 0) >= 70])

    return {
        "total_leads": len(leads),
        "ai_credits": user.ai_credits,
        "user_email": user.email,
        "plan": user.plan,
        "pipeline_funnel": pipeline_funnel,
        "predicted_revenue": round(predicted_revenue, 0),
        "win_rate": win_rate,
        "conversion_rate": conversion_rate,
        "top_leads": top_leads,
        "followup_today": followup_today,
        "avg_score": avg_score,
        "hot_leads_count": hot_leads_count,
        "converted_count": len(converted),
        "lost_count": status_counts.get("Lost", 0),
    }


@router.get("/ai-briefing")
def get_ai_briefing(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):
    user = get_current_user(token, db)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    if user.ai_credits <= 0:
        raise HTTPException(
            status_code=403,
            detail="No AI credits left. Please upgrade."
        )

    leads = db.query(Lead).filter(Lead.user_id == user.id).all()

    if not leads:
        return {
            "briefing": "You have no leads yet! Start by adding leads to your pipeline or use the Chrome Extension to capture leads from LinkedIn."
        }

    # Build pipeline context for AI
    leads_context = "Current Pipeline:\n"
    for lead in leads:
        leads_context += f"- {lead.name} ({lead.company or 'No company'}) "
        leads_context += f"— Status: {lead.status}"
        if lead.score:
            leads_context += f" — Score: {lead.score}/100"
        if lead.predicted_revenue:
            leads_context += f" — Est. Revenue: ₹{lead.predicted_revenue:,.0f}"
        if lead.follow_up_date:
            leads_context += f" — Follow-up: {lead.follow_up_date}"
        if lead.notes:
            leads_context += f" — Notes: {lead.notes}"
        leads_context += "\n"

    briefing_prompt = """
    Give me a sharp, actionable daily sales briefing in 4-5 sentences.
    Tell me:
    1. Which 1-2 leads to prioritize today and why
    2. Any deals at risk I should rescue
    3. One specific action to take right now
    Keep it direct, motivating and specific. No fluff.
    """

    try:
        briefing = sales_coach_chat(
            message=briefing_prompt,
            leads_context=leads_context,
            chat_history=[]
        )
        user.ai_credits -= 1
        db.commit()
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"AI error: {str(e)}"
        )

    return {"briefing": briefing}