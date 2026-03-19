from fastapi import APIRouter, HTTPException
from sqlalchemy.orm import Session
from fastapi import Depends
from app.database import get_db
from app.models.lead import Lead
from app.models.user import User
from pydantic import BaseModel
from typing import Optional

router = APIRouter(prefix="/capture", tags=["Lead Capture"])

class CaptureLeadRequest(BaseModel):
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    company: Optional[str] = None
    notes: Optional[str] = None

def find_user_by_username(username: str, db: Session):
    # Try exact email prefix match first
    users = db.query(User).all()
    for user in users:
        email_prefix = user.email.split("@")[0].lower()
        if email_prefix == username.lower():
            return user
    return None

@router.get("/user/{username}")
def get_capture_page_info(username: str, db: Session = Depends(get_db)):
    user = find_user_by_username(username, db)
    if not user:
        raise HTTPException(status_code=404, detail="Page not found")
    return {
        "name": user.full_name,
        "username": username
    }

@router.post("/user/{username}")
def capture_lead(
    username: str,
    lead: CaptureLeadRequest,
    db: Session = Depends(get_db)
):
    user = find_user_by_username(username, db)
    if not user:
        raise HTTPException(status_code=404, detail="Page not found")

    new_lead = Lead(
        user_id=user.id,
        name=lead.name,
        email=lead.email,
        phone=lead.phone,
        company=lead.company,
        notes=lead.notes or "Submitted via lead capture form",
        status="New"
    )
    db.add(new_lead)
    db.commit()
    db.refresh(new_lead)
    return {"message": "Thank you! We'll be in touch soon."}
