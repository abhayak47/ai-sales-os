from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.activity import Activity
from app.models.lead import Lead
from app.models.lead_memory import LeadMemoryPin
from app.schemas.memory import (
    AIArtifactResponse,
    LeadMemoryBundleResponse,
    LeadMemoryPinCreate,
    LeadMemoryPinResponse,
    LeadMemoryPinUpdate,
)
from app.services.auth import get_current_user
from app.services.lead_memory import (
    build_memory_overview,
    get_pinned_facts,
    get_recent_artifacts,
    infer_memory_points,
    serialize_artifact,
)

router = APIRouter(prefix="/memory", tags=["Memory"])
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


def _get_user(token: str, db: Session):
    user = get_current_user(token, db)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return user


def _get_lead(lead_id: int, user_id: int, db: Session):
    lead = db.query(Lead).filter(Lead.id == lead_id, Lead.user_id == user_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    return lead


@router.get("/lead/{lead_id}", response_model=LeadMemoryBundleResponse)
def get_lead_memory(
    lead_id: int,
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
):
    user = _get_user(token, db)
    lead = _get_lead(lead_id, user.id, db)

    activities = (
        db.query(Activity)
        .filter(Activity.lead_id == lead_id, Activity.user_id == user.id)
        .order_by(Activity.created_at.desc())
        .limit(8)
        .all()
    )
    pinned = get_pinned_facts(db, user_id=user.id, lead_id=lead_id)
    artifacts = get_recent_artifacts(db, user_id=user.id, lead_id=lead_id, limit=12)
    inferred = infer_memory_points(lead, activities, artifacts)

    return {
        "overview": build_memory_overview(lead, pinned, inferred),
        "pinned_facts": pinned,
        "inferred_memory": inferred,
        "saved_outputs": [serialize_artifact(artifact) for artifact in artifacts],
    }


@router.get("/artifacts/{lead_id}", response_model=list[AIArtifactResponse])
def get_lead_artifacts(
    lead_id: int,
    artifact_type: str | None = None,
    limit: int = 20,
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
):
    user = _get_user(token, db)
    _get_lead(lead_id, user.id, db)

    types = [item.strip() for item in artifact_type.split(",")] if artifact_type else None
    artifacts = get_recent_artifacts(db, user_id=user.id, lead_id=lead_id, limit=min(limit, 50), artifact_types=types)
    return [serialize_artifact(artifact) for artifact in artifacts]


@router.post("/pins", response_model=LeadMemoryPinResponse)
def create_memory_pin(
    payload: LeadMemoryPinCreate,
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
):
    user = _get_user(token, db)
    _get_lead(payload.lead_id, user.id, db)
    memory_pin = LeadMemoryPin(
        user_id=user.id,
        lead_id=payload.lead_id,
        title=payload.title.strip(),
        content=payload.content.strip(),
        source=payload.source or "manual",
        is_pinned=True,
    )
    db.add(memory_pin)
    db.commit()
    db.refresh(memory_pin)
    return memory_pin


@router.patch("/pins/{pin_id}", response_model=LeadMemoryPinResponse)
def update_memory_pin(
    pin_id: int,
    payload: LeadMemoryPinUpdate,
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
):
    user = _get_user(token, db)
    memory_pin = (
        db.query(LeadMemoryPin)
        .filter(LeadMemoryPin.id == pin_id, LeadMemoryPin.user_id == user.id)
        .first()
    )
    if not memory_pin:
        raise HTTPException(status_code=404, detail="Pinned fact not found")

    for key, value in payload.dict(exclude_unset=True).items():
        setattr(memory_pin, key, value)

    db.commit()
    db.refresh(memory_pin)
    return memory_pin


@router.delete("/pins/{pin_id}")
def delete_memory_pin(
    pin_id: int,
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
):
    user = _get_user(token, db)
    memory_pin = (
        db.query(LeadMemoryPin)
        .filter(LeadMemoryPin.id == pin_id, LeadMemoryPin.user_id == user.id)
        .first()
    )
    if not memory_pin:
        raise HTTPException(status_code=404, detail="Pinned fact not found")

    db.delete(memory_pin)
    db.commit()
    return {"message": "Pinned fact removed"}
