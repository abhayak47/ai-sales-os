from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.schemas.activity import ActivityCreate, ActivityResponse
from app.models.lead import Activity, Lead
from app.services.auth import get_current_user

router = APIRouter(prefix="/activities", tags=["Activities"])
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

@router.get("/lead/{lead_id}", response_model=List[ActivityResponse])
def get_lead_activities(
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
    activities = db.query(Activity).filter(
        Activity.lead_id == lead_id
    ).order_by(Activity.created_at.desc()).all()
    return activities

@router.post("/", response_model=ActivityResponse)
def create_activity(
    activity: ActivityCreate,
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):
    user = get_current_user(token, db)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    lead = db.query(Lead).filter(
        Lead.id == activity.lead_id,
        Lead.user_id == user.id
    ).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    new_activity = Activity(
        user_id=user.id,
        lead_id=activity.lead_id,
        type=activity.type,
        title=activity.title,
        description=activity.description
    )
    db.add(new_activity)
    db.commit()
    db.refresh(new_activity)
    return new_activity

@router.delete("/{activity_id}")
def delete_activity(
    activity_id: int,
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):
    user = get_current_user(token, db)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    activity = db.query(Activity).filter(
        Activity.id == activity_id,
        Activity.user_id == user.id
    ).first()
    if not activity:
        raise HTTPException(status_code=404, detail="Activity not found")
    db.delete(activity)
    db.commit()
    return {"message": "Activity deleted"}