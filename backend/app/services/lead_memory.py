import json
from typing import Iterable, List

from sqlalchemy.orm import Session

from app.models.activity import Activity
from app.models.lead import Lead
from app.models.lead_memory import AIArtifact, LeadMemoryPin


def _safe_json_loads(value: str):
    try:
        return json.loads(value)
    except Exception:
        return value


def _stringify_payload(payload) -> str:
    if isinstance(payload, str):
        return payload
    return json.dumps(payload, ensure_ascii=True)


def save_ai_artifact(
    db: Session,
    *,
    user_id: int,
    lead_id: int,
    artifact_type: str,
    title: str,
    payload,
    context_snapshot: str = "",
) -> AIArtifact:
    artifact = AIArtifact(
        user_id=user_id,
        lead_id=lead_id,
        artifact_type=artifact_type,
        title=title,
        payload=_stringify_payload(payload),
        context_snapshot=context_snapshot[:6000] if context_snapshot else None,
    )
    db.add(artifact)
    db.commit()
    db.refresh(artifact)
    return artifact


def get_pinned_facts(db: Session, *, user_id: int, lead_id: int) -> List[LeadMemoryPin]:
    return (
        db.query(LeadMemoryPin)
        .filter(
            LeadMemoryPin.user_id == user_id,
            LeadMemoryPin.lead_id == lead_id,
            LeadMemoryPin.is_pinned.is_(True),
        )
        .order_by(LeadMemoryPin.updated_at.desc(), LeadMemoryPin.id.desc())
        .all()
    )


def get_recent_artifacts(
    db: Session,
    *,
    user_id: int,
    lead_id: int,
    limit: int = 12,
    artifact_types: Iterable[str] | None = None,
) -> List[AIArtifact]:
    query = (
        db.query(AIArtifact)
        .filter(AIArtifact.user_id == user_id, AIArtifact.lead_id == lead_id)
        .order_by(AIArtifact.created_at.desc(), AIArtifact.id.desc())
    )
    if artifact_types:
        query = query.filter(AIArtifact.artifact_type.in_(list(artifact_types)))
    return query.limit(limit).all()


def serialize_artifact(artifact: AIArtifact) -> dict:
    return {
        "id": artifact.id,
        "artifact_type": artifact.artifact_type,
        "title": artifact.title,
        "payload": _safe_json_loads(artifact.payload),
        "context_snapshot": artifact.context_snapshot,
        "created_at": artifact.created_at,
    }


def infer_memory_points(lead: Lead, activities: List[Activity], artifacts: List[AIArtifact]) -> List[str]:
    points: List[str] = []

    if lead.notes:
        points.append(f"Lead notes: {lead.notes}")
    if lead.status:
        points.append(f"Current stage: {lead.status}")
    if lead.follow_up_date:
        points.append(f"Suggested follow-up window: {lead.follow_up_date}")
    if lead.predicted_revenue:
        points.append(f"Estimated revenue: INR {int(lead.predicted_revenue)}")

    for activity in activities[:4]:
        detail = activity.description or "No extra detail"
        points.append(f"{activity.type.title()} on {activity.created_at.date()}: {activity.title}. {detail}")

    for artifact in artifacts[:3]:
        payload = _safe_json_loads(artifact.payload)
        if isinstance(payload, dict):
            preferred_keys = [
                "execution_summary",
                "executive_summary",
                "summary",
                "meeting_goal",
                "objection_diagnosis",
                "campaign_angle",
            ]
            summary_value = next((payload.get(key) for key in preferred_keys if payload.get(key)), None)
            if summary_value:
                points.append(f"{artifact.title}: {summary_value}")
        elif isinstance(payload, str):
            points.append(f"{artifact.title}: {payload[:200]}")

    deduped = []
    seen = set()
    for point in points:
        normalized = point.strip().lower()
        if normalized and normalized not in seen:
            deduped.append(point)
            seen.add(normalized)
    return deduped[:10]


def build_memory_overview(lead: Lead, pinned_facts: List[LeadMemoryPin], inferred_memory: List[str]) -> str:
    headline = f"{lead.name} at {lead.company}" if lead.company else lead.name
    summary_parts = [f"{headline} is currently in {lead.status} stage."]
    if pinned_facts:
        summary_parts.append(f"{len(pinned_facts)} pinned facts are shaping AI outputs.")
    if inferred_memory:
        summary_parts.append("Recent timeline and AI output history are available for contextual grounding.")
    return " ".join(summary_parts)


def build_memory_context(
    lead: Lead,
    activities: List[Activity],
    pinned_facts: List[LeadMemoryPin],
    artifacts: List[AIArtifact],
) -> str:
    lines = []

    if pinned_facts:
        lines.append("Pinned facts:")
        lines.extend([f"- {item.title}: {item.content}" for item in pinned_facts[:8]])

    inferred = infer_memory_points(lead, activities, artifacts)
    if inferred:
        lines.append("Inferred lead memory:")
        lines.extend([f"- {item}" for item in inferred[:10]])

    if artifacts:
        lines.append("Previously generated AI outputs:")
        for artifact in artifacts[:6]:
            payload = _safe_json_loads(artifact.payload)
            if isinstance(payload, dict):
                snapshot = next(
                    (payload.get(key) for key in ["summary", "executive_summary", "execution_summary", "meeting_goal"] if payload.get(key)),
                    None,
                )
            else:
                snapshot = str(payload)
            lines.append(f"- {artifact.artifact_type}: {snapshot or artifact.title}")

    return "\n".join(lines)
