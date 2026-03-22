from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.activity import Activity
from app.models.lead import Lead
from app.schemas.ai import (
    DealStrategyResponse,
    EmailSequenceRequest,
    EmailSequenceResponse,
    FollowUpRequest,
    FollowUpResponse,
    LeadAnalysisRequest,
    LeadAnalysisResponse,
    LeadContextRequest,
    MeetingAnalysisRequest,
    MeetingAnalysisResponse,
    MeetingPrepResponse,
    ObjectionPlaybookRequest,
    ObjectionPlaybookResponse,
    RevivalCampaignResponse,
    SalesCoachRequest,
    SalesCoachResponse,
    StakeholderMapResponse,
)
from app.services.ai import (
    analyze_lead,
    analyze_meeting_notes,
    generate_deal_strategy,
    generate_email_sequence,
    generate_followup,
    generate_meeting_prep,
    generate_objection_playbook,
    generate_revival_campaign,
    generate_stakeholder_map,
    sales_coach_chat,
    score_lead,
)
from app.services.auth import deduct_credits, get_current_user

router = APIRouter(prefix="/ai", tags=["AI"])
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

CREDIT_COSTS = {
    "followup": 1,
    "analyze_lead": 3,
    "score_lead": 1,
    "email_sequence": 5,
    "coach": 1,
    "meeting_analysis": 3,
    "deal_strategy": 3,
    "objection_playbook": 2,
    "revival_campaign": 3,
    "stakeholder_map": 2,
    "meeting_prep": 2,
}


def _refund_credits(db: Session, user, amount: int) -> None:
    user.ai_credits += amount
    db.commit()


def _get_owned_lead(lead_id: int, user_id: int, db: Session) -> Lead:
    lead = db.query(Lead).filter(
        Lead.id == lead_id,
        Lead.user_id == user_id,
    ).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    return lead


def _build_lead_context(lead: Lead, db: Session) -> str:
    activities = (
        db.query(Activity)
        .filter(Activity.lead_id == lead.id)
        .order_by(Activity.created_at.desc())
        .limit(8)
        .all()
    )

    activity_lines = []
    for activity in reversed(activities):
        description = activity.description or "No additional detail"
        activity_lines.append(
            f"- {activity.type}: {activity.title}. Detail: {description}"
        )

    last_activity = (
        lead.last_activity_at.isoformat() if lead.last_activity_at else "No recorded activity"
    )

    return "\n".join(
        [
            f"Lead name: {lead.name}",
            f"Company: {lead.company or 'Unknown'}",
            f"Status: {lead.status}",
            f"Email: {lead.email or 'Unknown'}",
            f"Phone: {lead.phone or 'Unknown'}",
            f"Notes: {lead.notes or 'No notes yet'}",
            f"Lead score: {lead.score or 0}/100",
            f"Predicted revenue: INR {lead.predicted_revenue or 0}",
            f"Relationship score: {lead.relationship_score or 50}/100",
            f"Health: {lead.health_status or 'Warm'} ({lead.health_score or 50}/100)",
            f"Suggested follow-up date: {lead.follow_up_date or 'Not set'}",
            f"Last activity timestamp: {last_activity}",
            "Recent timeline:",
            "\n".join(activity_lines) if activity_lines else "- No activities logged yet",
        ]
    )


@router.get("/credit-costs")
def get_credit_costs():
    return CREDIT_COSTS


@router.post("/followup", response_model=FollowUpResponse)
def generate_follow_up(
    request: FollowUpRequest,
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
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
            tone=request.tone,
        )
    except Exception as exc:
        _refund_credits(db, user, CREDIT_COSTS["followup"])
        raise HTTPException(status_code=500, detail=f"AI error: {str(exc)}")
    return result


@router.post("/analyze-lead", response_model=LeadAnalysisResponse)
def analyze_lead_endpoint(
    request: LeadAnalysisRequest,
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
):
    user = get_current_user(token, db)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    lead = _get_owned_lead(request.lead_id, user.id, db)
    if not deduct_credits(db, user, "analyze_lead", CREDIT_COSTS["analyze_lead"]):
        raise HTTPException(status_code=403, detail=f"Need {CREDIT_COSTS['analyze_lead']} credits. Please upgrade.")
    try:
        result = analyze_lead(
            name=lead.name,
            company=lead.company or "Unknown",
            status=lead.status,
            notes=lead.notes or "",
        )
    except Exception as exc:
        _refund_credits(db, user, CREDIT_COSTS["analyze_lead"])
        raise HTTPException(status_code=500, detail=f"AI error: {str(exc)}")
    return result


@router.post("/score-lead/{lead_id}")
def score_lead_endpoint(
    lead_id: int,
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
):
    user = get_current_user(token, db)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    lead = _get_owned_lead(lead_id, user.id, db)
    if not deduct_credits(db, user, "score_lead", CREDIT_COSTS["score_lead"]):
        raise HTTPException(status_code=403, detail=f"Need {CREDIT_COSTS['score_lead']} credits. Please upgrade.")
    try:
        result = score_lead(
            name=lead.name,
            company=lead.company or "Unknown",
            status=lead.status,
            notes=lead.notes or "",
        )
        lead.score = result["score"]
        lead.predicted_revenue = result["predicted_revenue"]
        lead.follow_up_date = result["follow_up_date"]
        db.commit()
    except Exception as exc:
        _refund_credits(db, user, CREDIT_COSTS["score_lead"])
        raise HTTPException(status_code=500, detail=f"AI error: {str(exc)}")
    return result


@router.post("/email-sequence", response_model=EmailSequenceResponse)
def email_sequence_endpoint(
    request: EmailSequenceRequest,
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
):
    user = get_current_user(token, db)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    lead = _get_owned_lead(request.lead_id, user.id, db)
    if not deduct_credits(db, user, "email_sequence", CREDIT_COSTS["email_sequence"]):
        raise HTTPException(status_code=403, detail=f"Need {CREDIT_COSTS['email_sequence']} credits. Please upgrade.")
    try:
        result = generate_email_sequence(
            name=lead.name,
            company=lead.company or "their company",
            context=request.context,
            tone=request.tone,
        )
    except Exception as exc:
        _refund_credits(db, user, CREDIT_COSTS["email_sequence"])
        raise HTTPException(status_code=500, detail=f"AI error: {str(exc)}")
    return result


@router.post("/coach", response_model=SalesCoachResponse)
def sales_coach(
    request: SalesCoachRequest,
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
):
    user = get_current_user(token, db)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    if not deduct_credits(db, user, "coach", CREDIT_COSTS["coach"]):
        raise HTTPException(status_code=403, detail=f"Need {CREDIT_COSTS['coach']} credits. Please upgrade.")

    leads = db.query(Lead).filter(Lead.user_id == user.id).all()
    if leads:
        lines = ["Current Pipeline:"]
        for lead in leads:
            line = f"- {lead.name} ({lead.company or 'No company'}) | Status: {lead.status}"
            if lead.notes:
                line += f" | Notes: {lead.notes}"
            if lead.score:
                line += f" | Score: {lead.score}/100"
            lines.append(line)
        leads_context = "\n".join(lines)
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
            chat_history=chat_history,
        )
    except Exception as exc:
        _refund_credits(db, user, CREDIT_COSTS["coach"])
        raise HTTPException(status_code=500, detail=f"AI error: {str(exc)}")
    return {"response": result}


@router.post("/meeting-analysis", response_model=MeetingAnalysisResponse)
def meeting_analysis_endpoint(
    request: MeetingAnalysisRequest,
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
):
    user = get_current_user(token, db)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    lead = _get_owned_lead(request.lead_id, user.id, db)

    if not deduct_credits(db, user, "meeting_analysis", CREDIT_COSTS["meeting_analysis"]):
        raise HTTPException(status_code=403, detail=f"Need {CREDIT_COSTS['meeting_analysis']} credits. Please upgrade.")

    try:
        result = analyze_meeting_notes(
            notes=request.notes,
            lead_name=lead.name,
            company=lead.company or "Unknown",
        )
    except Exception as exc:
        _refund_credits(db, user, CREDIT_COSTS["meeting_analysis"])
        raise HTTPException(status_code=500, detail=f"AI error: {str(exc)}")

    return result


@router.post("/deal-strategy", response_model=DealStrategyResponse)
def deal_strategy_endpoint(
    request: LeadContextRequest,
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
):
    user = get_current_user(token, db)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    lead = _get_owned_lead(request.lead_id, user.id, db)
    if not deduct_credits(db, user, "deal_strategy", CREDIT_COSTS["deal_strategy"]):
        raise HTTPException(status_code=403, detail=f"Need {CREDIT_COSTS['deal_strategy']} credits. Please upgrade.")
    try:
        result = generate_deal_strategy(
            lead_name=lead.name,
            company=lead.company or "Unknown",
            status=lead.status,
            context=_build_lead_context(lead, db),
        )
    except Exception as exc:
        _refund_credits(db, user, CREDIT_COSTS["deal_strategy"])
        raise HTTPException(status_code=500, detail=f"AI error: {str(exc)}")
    return result


@router.post("/objection-playbook", response_model=ObjectionPlaybookResponse)
def objection_playbook_endpoint(
    request: ObjectionPlaybookRequest,
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
):
    user = get_current_user(token, db)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    lead = _get_owned_lead(request.lead_id, user.id, db)
    if not deduct_credits(db, user, "objection_playbook", CREDIT_COSTS["objection_playbook"]):
        raise HTTPException(status_code=403, detail=f"Need {CREDIT_COSTS['objection_playbook']} credits. Please upgrade.")
    try:
        result = generate_objection_playbook(
            lead_name=lead.name,
            company=lead.company or "Unknown",
            objection=request.objection,
            context=_build_lead_context(lead, db),
        )
    except Exception as exc:
        _refund_credits(db, user, CREDIT_COSTS["objection_playbook"])
        raise HTTPException(status_code=500, detail=f"AI error: {str(exc)}")
    return result


@router.post("/revival-campaign", response_model=RevivalCampaignResponse)
def revival_campaign_endpoint(
    request: LeadContextRequest,
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
):
    user = get_current_user(token, db)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    lead = _get_owned_lead(request.lead_id, user.id, db)
    if not deduct_credits(db, user, "revival_campaign", CREDIT_COSTS["revival_campaign"]):
        raise HTTPException(status_code=403, detail=f"Need {CREDIT_COSTS['revival_campaign']} credits. Please upgrade.")
    try:
        result = generate_revival_campaign(
            lead_name=lead.name,
            company=lead.company or "Unknown",
            status=lead.status,
            context=_build_lead_context(lead, db),
        )
    except Exception as exc:
        _refund_credits(db, user, CREDIT_COSTS["revival_campaign"])
        raise HTTPException(status_code=500, detail=f"AI error: {str(exc)}")
    return result


@router.post("/stakeholder-map", response_model=StakeholderMapResponse)
def stakeholder_map_endpoint(
    request: LeadContextRequest,
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
):
    user = get_current_user(token, db)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    lead = _get_owned_lead(request.lead_id, user.id, db)
    if not deduct_credits(db, user, "stakeholder_map", CREDIT_COSTS["stakeholder_map"]):
        raise HTTPException(status_code=403, detail=f"Need {CREDIT_COSTS['stakeholder_map']} credits. Please upgrade.")
    try:
        result = generate_stakeholder_map(
            lead_name=lead.name,
            company=lead.company or "Unknown",
            context=_build_lead_context(lead, db),
        )
    except Exception as exc:
        _refund_credits(db, user, CREDIT_COSTS["stakeholder_map"])
        raise HTTPException(status_code=500, detail=f"AI error: {str(exc)}")
    return result


@router.post("/meeting-prep", response_model=MeetingPrepResponse)
def meeting_prep_endpoint(
    request: LeadContextRequest,
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
):
    user = get_current_user(token, db)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    lead = _get_owned_lead(request.lead_id, user.id, db)
    if not deduct_credits(db, user, "meeting_prep", CREDIT_COSTS["meeting_prep"]):
        raise HTTPException(status_code=403, detail=f"Need {CREDIT_COSTS['meeting_prep']} credits. Please upgrade.")
    try:
        result = generate_meeting_prep(
            lead_name=lead.name,
            company=lead.company or "Unknown",
            status=lead.status,
            context=_build_lead_context(lead, db),
        )
    except Exception as exc:
        _refund_credits(db, user, CREDIT_COSTS["meeting_prep"])
        raise HTTPException(status_code=500, detail=f"AI error: {str(exc)}")
    return result
