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
