from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.activity import Activity
from app.models.lead import Lead
from app.models.task import Task
from app.schemas.ai import (
    DealStrategyResponse,
    EmailSequenceRequest,
    EmailSequenceResponse,
    ExecutionPlanResponse,
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
    generate_execution_plan,
    generate_followup,
    generate_meeting_prep,
    generate_objection_playbook,
    generate_revival_campaign,
    generate_stakeholder_map,
    sales_coach_chat,
    score_lead,
)
from app.services.auth import deduct_credits, get_current_user
from app.services.documents import extract_text_from_upload
from app.services.lead_memory import get_pinned_facts, get_recent_artifacts, save_ai_artifact, build_memory_context
from app.services.research import search_web_briefs

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
    "execution_plan": 4,
}


def _refund_credits(db: Session, user, amount: int) -> None:
    user.ai_credits += amount
    db.commit()


def _get_owned_lead(lead_id: int, user_id: int, db: Session) -> Lead:
    lead = db.query(Lead).filter(Lead.id == lead_id, Lead.user_id == user_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    return lead


def _recent_activities(lead_id: int, db: Session):
    return (
        db.query(Activity)
        .filter(Activity.lead_id == lead_id)
        .order_by(Activity.created_at.desc())
        .limit(10)
        .all()
    )


def _build_lead_context(lead: Lead, db: Session) -> str:
    activities = list(reversed(_recent_activities(lead.id, db)))
    pinned_facts = get_pinned_facts(db, user_id=lead.user_id, lead_id=lead.id)
    recent_artifacts = get_recent_artifacts(db, user_id=lead.user_id, lead_id=lead.id, limit=6)
    activity_lines = []
    for activity in activities:
        description = activity.description or "No additional detail"
        activity_lines.append(f"- {activity.type}: {activity.title}. Detail: {description}")

    last_activity = lead.last_activity_at.isoformat() if lead.last_activity_at else "No recorded activity"

    return "\n".join(
        [
            f"Lead name: {lead.name}",
            f"Company: {lead.company or 'Unknown'}",
            f"Status: {lead.status}",
            f"Email: {lead.email or 'Unknown'}",
            f"Phone: {lead.phone or 'Unknown'}",
            f"Lead notes: {lead.notes or 'No notes yet'}",
            f"Lead score: {lead.score or 0}/100",
            f"Predicted revenue: INR {lead.predicted_revenue or 0}",
            f"Relationship score: {lead.relationship_score or 50}/100",
            f"Health score: {lead.health_status or 'Warm'} ({lead.health_score or 50}/100)",
            f"Suggested follow-up date: {lead.follow_up_date or 'Not set'}",
            f"Last activity timestamp: {last_activity}",
            "Timeline notes:",
            "\n".join(activity_lines) if activity_lines else "- No activities logged yet",
            build_memory_context(lead, list(reversed(activities)), pinned_facts, recent_artifacts),
        ]
    )


def _save_artifact(db: Session, *, user_id: int, lead: Lead, artifact_type: str, title: str, payload, context_snapshot: str):
    return save_ai_artifact(
        db,
        user_id=user_id,
        lead_id=lead.id,
        artifact_type=artifact_type,
        title=title,
        payload=payload,
        context_snapshot=context_snapshot,
    )


def _build_research_query(lead: Lead, db: Session) -> str:
    activities = _recent_activities(lead.id, db)
    latest_summary = activities[0].description if activities and activities[0].description else lead.notes or ""
    return f"{lead.company or lead.name} {latest_summary} industry opportunities practical solution ideas"


def _resolve_due_at(timing: str):
    now = datetime.utcnow()
    normalized = (timing or "").strip().lower()
    if "today" in normalized or "within" in normalized:
        return now + timedelta(hours=2)
    if "tomorrow" in normalized:
        return now + timedelta(days=1)
    if "2 day" in normalized:
        return now + timedelta(days=2)
    if "3 day" in normalized:
        return now + timedelta(days=3)
    if "week" in normalized:
        return now + timedelta(days=5)
    return now + timedelta(days=1)


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
    context_snapshot = _build_lead_context(lead, db)
    try:
        result = analyze_lead(
            name=lead.name,
            company=lead.company or "Unknown",
            status=lead.status,
            notes=lead.notes or "",
            timeline_context=context_snapshot,
        )
        _save_artifact(
            db,
            user_id=user.id,
            lead=lead,
            artifact_type="lead_analysis",
            title=f"AI analysis for {lead.name}",
            payload=result,
            context_snapshot=context_snapshot,
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
    context_snapshot = _build_lead_context(lead, db)
    try:
        result = score_lead(
            name=lead.name,
            company=lead.company or "Unknown",
            status=lead.status,
            notes=lead.notes or "",
            timeline_context=context_snapshot,
        )
        lead.score = result["score"]
        lead.predicted_revenue = result["predicted_revenue"]
        lead.follow_up_date = result["follow_up_date"]
        db.commit()
        _save_artifact(
            db,
            user_id=user.id,
            lead=lead,
            artifact_type="lead_score",
            title=f"Lead score for {lead.name}",
            payload=result,
            context_snapshot=context_snapshot,
        )
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
    context_snapshot = _build_lead_context(lead, db)
    try:
        result = generate_email_sequence(
            name=lead.name,
            company=lead.company or "their company",
            context=f"{request.context}\n\nTimeline context:\n{context_snapshot}",
            tone=request.tone,
        )
        _save_artifact(
            db,
            user_id=user.id,
            lead=lead,
            artifact_type="email_sequence",
            title=f"Email sequence for {lead.name}",
            payload=result,
            context_snapshot=context_snapshot,
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
        lines = ["Current pipeline with real context:"]
        for lead in leads:
            lines.append(_build_lead_context(lead, db))
        leads_context = "\n\n".join(lines)
    else:
        leads_context = "No leads in pipeline yet."

    try:
        chat_history = [{"role": msg.role, "content": msg.content} for msg in request.chat_history]
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
    context_snapshot = _build_lead_context(lead, db)

    try:
        research_briefs = search_web_briefs(_build_research_query(lead, db), limit=5)
        result = analyze_meeting_notes(
            notes=request.notes,
            lead_name=lead.name,
            company=lead.company or "Unknown",
            context=context_snapshot,
            mom_template=request.mom_template or "",
            research_briefs=research_briefs,
        )
        _save_artifact(
            db,
            user_id=user.id,
            lead=lead,
            artifact_type="meeting_analysis",
            title=f"Meeting intel for {lead.name}",
            payload=result,
            context_snapshot=context_snapshot,
        )
    except Exception as exc:
        _refund_credits(db, user, CREDIT_COSTS["meeting_analysis"])
        raise HTTPException(status_code=500, detail=f"AI error: {str(exc)}")

    return result


@router.post("/meeting-analysis/upload", response_model=MeetingAnalysisResponse)
async def meeting_analysis_upload_endpoint(
    lead_id: int = Form(...),
    mom_template: str = Form(""),
    notes: str = Form(""),
    transcript_file: UploadFile = File(...),
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
):
    user = get_current_user(token, db)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    lead = _get_owned_lead(lead_id, user.id, db)
    if not deduct_credits(db, user, "meeting_analysis", CREDIT_COSTS["meeting_analysis"]):
        raise HTTPException(status_code=403, detail=f"Need {CREDIT_COSTS['meeting_analysis']} credits. Please upgrade.")
    context_snapshot = _build_lead_context(lead, db)

    try:
        file_content = await transcript_file.read()
        transcript_text = extract_text_from_upload(transcript_file.filename or "", file_content)
        merged_notes = "\n\n".join(part for part in [notes.strip(), transcript_text.strip()] if part)
        research_briefs = search_web_briefs(_build_research_query(lead, db), limit=5)
        result = analyze_meeting_notes(
            notes=merged_notes,
            lead_name=lead.name,
            company=lead.company or "Unknown",
            context=context_snapshot,
            mom_template=mom_template,
            research_briefs=research_briefs,
        )
        _save_artifact(
            db,
            user_id=user.id,
            lead=lead,
            artifact_type="meeting_analysis",
            title=f"Meeting intel for {lead.name}",
            payload=result,
            context_snapshot=context_snapshot,
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
    context_snapshot = _build_lead_context(lead, db)
    try:
        result = generate_deal_strategy(
            lead_name=lead.name,
            company=lead.company or "Unknown",
            status=lead.status,
            context=context_snapshot,
        )
        _save_artifact(
            db,
            user_id=user.id,
            lead=lead,
            artifact_type="deal_strategy",
            title=f"Deal strategy for {lead.name}",
            payload=result,
            context_snapshot=context_snapshot,
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
    context_snapshot = _build_lead_context(lead, db)
    try:
        result = generate_objection_playbook(
            lead_name=lead.name,
            company=lead.company or "Unknown",
            objection=request.objection,
            context=context_snapshot,
        )
        _save_artifact(
            db,
            user_id=user.id,
            lead=lead,
            artifact_type="objection_playbook",
            title=f"Objection playbook for {lead.name}",
            payload={**result, "objection": request.objection},
            context_snapshot=context_snapshot,
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
    context_snapshot = _build_lead_context(lead, db)
    try:
        result = generate_revival_campaign(
            lead_name=lead.name,
            company=lead.company or "Unknown",
            status=lead.status,
            context=context_snapshot,
        )
        _save_artifact(
            db,
            user_id=user.id,
            lead=lead,
            artifact_type="revival_campaign",
            title=f"Revival campaign for {lead.name}",
            payload=result,
            context_snapshot=context_snapshot,
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
    context_snapshot = _build_lead_context(lead, db)
    try:
        result = generate_stakeholder_map(
            lead_name=lead.name,
            company=lead.company or "Unknown",
            context=context_snapshot,
        )
        _save_artifact(
            db,
            user_id=user.id,
            lead=lead,
            artifact_type="stakeholder_map",
            title=f"Stakeholder map for {lead.name}",
            payload=result,
            context_snapshot=context_snapshot,
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
    context_snapshot = _build_lead_context(lead, db)
    try:
        result = generate_meeting_prep(
            lead_name=lead.name,
            company=lead.company or "Unknown",
            status=lead.status,
            context=context_snapshot,
            research_briefs=search_web_briefs(_build_research_query(lead, db), limit=6),
        )
        _save_artifact(
            db,
            user_id=user.id,
            lead=lead,
            artifact_type="meeting_prep",
            title=f"Meeting prep for {lead.name}",
            payload=result,
            context_snapshot=context_snapshot,
        )
    except Exception as exc:
        _refund_credits(db, user, CREDIT_COSTS["meeting_prep"])
        raise HTTPException(status_code=500, detail=f"AI error: {str(exc)}")
    return result


@router.post("/activate-execution", response_model=ExecutionPlanResponse)
def activate_execution_endpoint(
    request: LeadContextRequest,
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
):
    user = get_current_user(token, db)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    lead = _get_owned_lead(request.lead_id, user.id, db)
    if not deduct_credits(db, user, "execution_plan", CREDIT_COSTS["execution_plan"]):
        raise HTTPException(status_code=403, detail=f"Need {CREDIT_COSTS['execution_plan']} credits. Please upgrade.")
    context_snapshot = _build_lead_context(lead, db)

    try:
        result = generate_execution_plan(
            lead_name=lead.name,
            company=lead.company or "Unknown",
            status=lead.status,
            context=context_snapshot,
        )

        db.query(Task).filter(
            Task.user_id == user.id,
            Task.lead_id == lead.id,
            Task.status != "completed",
            Task.kind.in_(["task", "follow_up", "sequence_step"]),
        ).delete(synchronize_session=False)

        for item in result["tasks"]:
            db.add(Task(
                user_id=user.id,
                lead_id=lead.id,
                kind="task",
                title=item["title"],
                description=item["description"],
                priority=item["priority"],
                due_at=_resolve_due_at(item["timing"]),
            ))

        follow_up = result["follow_up"]
        db.add(Task(
            user_id=user.id,
            lead_id=lead.id,
            kind="follow_up",
            title=f"Send {follow_up['channel']} follow-up",
            description=f"Scheduled {follow_up['timing']}",
            priority="high",
            channel=follow_up["channel"],
            subject=follow_up["subject"],
            content=follow_up["message"],
            due_at=_resolve_due_at(follow_up["timing"]),
        ))

        for step in result["sequence"]:
            db.add(Task(
                user_id=user.id,
                lead_id=lead.id,
                kind="sequence_step",
                title=f"Sequence step {step['step']}: {step['channel']}",
                description=step["objective"],
                priority="medium" if step["step"] > 1 else "high",
                channel=step["channel"],
                content=step["message"],
                due_at=_resolve_due_at(step["timing"]),
                sequence_step=step["step"],
            ))

        db.commit()
        _save_artifact(
            db,
            user_id=user.id,
            lead=lead,
            artifact_type="execution_plan",
            title=f"Execution plan for {lead.name}",
            payload=result,
            context_snapshot=context_snapshot,
        )
    except Exception as exc:
        db.rollback()
        _refund_credits(db, user, CREDIT_COSTS["execution_plan"])
        raise HTTPException(status_code=500, detail=f"AI error: {str(exc)}")

    return result
