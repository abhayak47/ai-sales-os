from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.schemas.lead import LeadCreate, LeadUpdate, LeadResponse
from app.models.lead import Lead
from app.services.auth import get_current_user

router = APIRouter(prefix="/leads", tags=["Leads"])
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

def get_user(token: str, db: Session):
    user = get_current_user(token, db)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return user

@router.get("/", response_model=List[LeadResponse])
def get_leads(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):
    user = get_user(token, db)
    leads = db.query(Lead).filter(Lead.user_id == user.id).all()
    return leads

@router.get("/{lead_id}", response_model=LeadResponse)
def get_lead(
    lead_id: int,
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):
    user = get_user(token, db)
    lead = db.query(Lead).filter(
        Lead.id == lead_id,
        Lead.user_id == user.id
    ).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    return lead

@router.post("/", response_model=LeadResponse)
def create_lead(
    lead: LeadCreate,
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):
    user = get_user(token, db)
    new_lead = Lead(**lead.dict(), user_id=user.id)
    db.add(new_lead)
    db.commit()
    db.refresh(new_lead)
    return new_lead

@router.put("/{lead_id}", response_model=LeadResponse)
def update_lead(
    lead_id: int,
    lead_data: LeadUpdate,
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):
    user = get_user(token, db)
    lead = db.query(Lead).filter(
        Lead.id == lead_id,
        Lead.user_id == user.id
    ).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    for key, value in lead_data.dict(exclude_unset=True).items():
        setattr(lead, key, value)
    db.commit()
    db.refresh(lead)
    return lead

@router.delete("/{lead_id}")
def delete_lead(
    lead_id: int,
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):
    user = get_user(token, db)
    lead = db.query(Lead).filter(
        Lead.id == lead_id,
        Lead.user_id == user.id
    ).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    db.delete(lead)
    db.commit()
    return {"message": "Lead deleted"}
@router.post("/{lead_id}/calculate-health")
def calculate_health(
    lead_id: int,
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):
    user = get_user(token, db)
    lead = db.query(Lead).filter(
        Lead.id == lead_id,
        Lead.user_id == user.id
    ).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    # Import Activity here
    from app.models.lead import Activity
    activities = db.query(Activity).filter(
        Activity.lead_id == lead_id
    ).all()

    # Calculate health score
    score = 50.0  # Base score

    # Status bonus
    status_scores = {
        "New": 40, "Contacted": 55,
        "Interested": 75, "Converted": 100, "Lost": 10
    }
    score = status_scores.get(lead.status, 50)

    # Activity bonus — more activities = healthier relationship
    activity_count = len(activities)
    if activity_count >= 5:
        score = min(score + 20, 100)
    elif activity_count >= 3:
        score = min(score + 10, 100)
    elif activity_count >= 1:
        score = min(score + 5, 100)

    # Determine health status
    if score >= 70:
        health_status = "Hot"
    elif score >= 40:
        health_status = "Warm"
    else:
        health_status = "Cold"

    lead.health_score = score
    lead.health_status = health_status
    db.commit()

    return {
        "health_score": score,
        "health_status": health_status
    }