from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.ai import (
    FollowUpRequest, FollowUpResponse,
    LeadAnalysisRequest, LeadAnalysisResponse,
    SalesCoachRequest, SalesCoachResponse,
    EmailSequenceRequest, EmailSequenceResponse
)
from app.services.ai import (
    generate_followup, analyze_lead,
    sales_coach_chat, score_lead,
    generate_email_sequence
)
from app.services.auth import get_current_user, deduct_credits
from app.models.lead import Lead

router = APIRouter(prefix="/ai", tags=["AI"])
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

# Credit costs
CREDIT_COSTS = {
    "followup": 1,
    "analyze_lead": 3,
    "score_lead": 1,
    "email_sequence": 5,
    "coach": 1,
}

@router.get("/credit-costs")
def get_credit_costs():
    return CREDIT_COSTS

@router.post("/followup", response_model=FollowUpResponse)
def generate_follow_up(
    request: FollowUpRequest,
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):
    user = get_current_user(token, db)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    if not deduct_credits(db, user, "followup", CREDIT_COSTS["followup"]):
        raise HTTPException(status_code=403, detail=f"Need {CREDIT_COSTS['followup']} credits. Please upgrade.")
    try:
        result = generate_followup(
            context=request.context,
            client_type=request.client_type,
            tone=request.tone
        )
    except Exception as e:
        # Refund credits on error
        user.ai_credits += CREDIT_COSTS["followup"]
        db.commit()
        raise HTTPException(status_code=500, detail=f"AI error: {str(e)}")
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
    if not deduct_credits(db, user, "analyze_lead", CREDIT_COSTS["analyze_lead"]):
        raise HTTPException(status_code=403, detail=f"Need {CREDIT_COSTS['analyze_lead']} credits. Please upgrade.")
    try:
        result = analyze_lead(
            name=lead.name,
            company=lead.company or "Unknown",
            status=lead.status,
            notes=lead.notes or ""
        )
    except Exception as e:
        user.ai_credits += CREDIT_COSTS["analyze_lead"]
        db.commit()
        raise HTTPException(status_code=500, detail=f"AI error: {str(e)}")
    return result


@router.post("/score-lead/{lead_id}")
def score_lead_endpoint(
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
    if not deduct_credits(db, user, "score_lead", CREDIT_COSTS["score_lead"]):
        raise HTTPException(status_code=403, detail=f"Need {CREDIT_COSTS['score_lead']} credits. Please upgrade.")
    try:
        result = score_lead(
            name=lead.name,
            company=lead.company or "Unknown",
            status=lead.status,
            notes=lead.notes or ""
        )
        lead.score = result["score"]
        lead.predicted_revenue = result["predicted_revenue"]
        lead.follow_up_date = result["follow_up_date"]
        db.commit()
    except Exception as e:
        user.ai_credits += CREDIT_COSTS["score_lead"]
        db.commit()
        raise HTTPException(status_code=500, detail=f"AI error: {str(e)}")
    return result


@router.post("/email-sequence", response_model=EmailSequenceResponse)
def email_sequence_endpoint(
    request: EmailSequenceRequest,
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
    if not deduct_credits(db, user, "email_sequence", CREDIT_COSTS["email_sequence"]):
        raise HTTPException(status_code=403, detail=f"Need {CREDIT_COSTS['email_sequence']} credits. Please upgrade.")
    try:
        result = generate_email_sequence(
            name=lead.name,
            company=lead.company or "their company",
            context=request.context,
            tone=request.tone
        )
    except Exception as e:
        user.ai_credits += CREDIT_COSTS["email_sequence"]
        db.commit()
        raise HTTPException(status_code=500, detail=f"AI error: {str(e)}")
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
    if not deduct_credits(db, user, "coach", CREDIT_COSTS["coach"]):
        raise HTTPException(status_code=403, detail=f"Need {CREDIT_COSTS['coach']} credits. Please upgrade.")

    leads = db.query(Lead).filter(Lead.user_id == user.id).all()
    leads_context = ""
    if leads:
        leads_context = "Current Pipeline:\n"
        for lead in leads:
            leads_context += f"- {lead.name} ({lead.company or 'No company'}) — Status: {lead.status}"
            if lead.notes:
                leads_context += f" — Notes: {lead.notes}"
            if lead.score:
                leads_context += f" — Score: {lead.score}/100"
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
        user.ai_credits += CREDIT_COSTS["coach"]
        db.commit()
        raise HTTPException(status_code=500, detail=f"AI error: {str(e)}")
    return {"response": result}