from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.ai import (
    FollowUpRequest, FollowUpResponse,
    LeadAnalysisRequest, LeadAnalysisResponse,
    SalesCoachRequest, SalesCoachResponse
)
from app.services.ai import generate_followup, analyze_lead, sales_coach_chat
from app.services.auth import get_current_user
from app.models.lead import Lead

router = APIRouter(prefix="/ai", tags=["AI"])
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


@router.post("/followup", response_model=FollowUpResponse)
def generate_follow_up(
    request: FollowUpRequest,
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):
    user = get_current_user(token, db)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    if user.ai_credits <= 0:
        raise HTTPException(status_code=403, detail="No AI credits left. Please upgrade.")
    try:
        result = generate_followup(
            context=request.context,
            client_type=request.client_type,
            tone=request.tone
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI error: {str(e)}")
    user.ai_credits -= 1
    db.commit()
    return result


@router.post("/analyze-lead", response_model=LeadAnalysisResponse)
def analyze_lead_endpoint(
    request: LeadAnalysisRequest,
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):
    user = get_current_user(token, db)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    lead = db.query(Lead).filter(
        Lead.id == request.lead_id,
        Lead.user_id == user.id
    ).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    if user.ai_credits <= 0:
        raise HTTPException(status_code=403, detail="No AI credits left. Please upgrade.")
    try:
        result = analyze_lead(
            name=lead.name,
            company=lead.company or "Unknown",
            status=lead.status,
            notes=lead.notes or ""
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI error: {str(e)}")
    user.ai_credits -= 1
    db.commit()
    return result


@router.post("/coach", response_model=SalesCoachResponse)
def sales_coach(
    request: SalesCoachRequest,
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):
    user = get_current_user(token, db)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    if user.ai_credits <= 0:
        raise HTTPException(status_code=403, detail="No AI credits left. Please upgrade.")

    # Get user's leads for context
    leads = db.query(Lead).filter(Lead.user_id == user.id).all()
    leads_context = ""
    if leads:
        leads_context = "Current Pipeline:\n"
        for lead in leads:
            leads_context += f"- {lead.name} ({lead.company or 'No company'}) — Status: {lead.status}"
            if lead.notes:
                leads_context += f" — Notes: {lead.notes}"
            leads_context += "\n"
    else:
        leads_context = "No leads in pipeline yet."

    try:
        chat_history = [
            {"role": msg.role, "content": msg.content}
            for msg in request.chat_history
        ]
        result = sales_coach_chat(
            message=request.message,
            leads_context=leads_context,
            chat_history=chat_history
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI error: {str(e)}")

    user.ai_credits -= 1
    db.commit()
    return {"response": result}