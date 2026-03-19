from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.ai import FollowUpRequest, FollowUpResponse, LeadAnalysisRequest, LeadAnalysisResponse
from app.services.ai import generate_followup, analyze_lead
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

    # Get the lead
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