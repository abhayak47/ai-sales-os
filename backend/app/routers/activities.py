from datetime import datetime
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.activity import Activity
from app.models.lead import Lead
from app.schemas.activity import ActivityCreate, ActivityResponse
from app.services.auth import get_current_user
from app.services.workspace import can_edit_lead, workspace_get, workspace_query

router = APIRouter(prefix="/activities", tags=["Activities"])
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


@router.get("/lead/{lead_id}", response_model=List[ActivityResponse])
def get_lead_activities(
    lead_id: int,
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
):
    user = get_current_user(token, db)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    lead = workspace_get(db, Lead, user, lead_id)
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    return (
        workspace_query(db, Activity, user)
        .filter(Activity.lead_id == lead_id)
        .order_by(Activity.created_at.desc())
        .all()
    )


@router.post("/", response_model=ActivityResponse)
def create_activity(
    activity: ActivityCreate,
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
):
    user = get_current_user(token, db)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    lead = workspace_get(db, Lead, user, activity.lead_id)
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    if not can_edit_lead(user, lead):
        raise HTTPException(status_code=403, detail="Not allowed to log activities for this lead")

    new_activity = Activity(
        user_id=user.id,
        organization_id=getattr(user, "organization_id", None),
        lead_id=activity.lead_id,
        type=activity.type,
        title=activity.title,
        description=activity.description,
    )

    db.add(new_activity)
    lead.last_activity_at = datetime.utcnow()
    if activity.type in ["call", "meeting"]:
        lead.relationship_score = min((lead.relationship_score or 50) + 5, 100)
    else:
        lead.relationship_score = min((lead.relationship_score or 50) + 2, 100)

    db.commit()
    db.refresh(new_activity)
    return new_activity


@router.delete("/{activity_id}")
def delete_activity(
    activity_id: int,
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
):
    user = get_current_user(token, db)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    activity = workspace_get(db, Activity, user, activity_id)
    if not activity:
        raise HTTPException(status_code=404, detail="Activity not found")

    db.delete(activity)
    db.commit()
    return {"message": "Activity deleted"}
