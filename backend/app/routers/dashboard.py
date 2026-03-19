from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from app.database import get_db
from app.services.auth import get_current_user
from app.models.lead import Lead

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

@router.get("/stats")
def get_stats(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):
    user = get_current_user(token, db)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    leads = db.query(Lead).filter(Lead.user_id == user.id).all()
    total_leads = len(leads)
    converted = len([l for l in leads if l.status == "Converted"])
    contacted = len([l for l in leads if l.status == "Contacted"])
    interested = len([l for l in leads if l.status == "Interested"])
    lost = len([l for l in leads if l.status == "Lost"])
    new_leads = len([l for l in leads if l.status == "New"])

    conversion_rate = round((converted / total_leads * 100), 1) if total_leads > 0 else 0

    return {
        "user": {
            "full_name": user.full_name,
            "email": user.email,
            "plan": user.plan,
            "ai_credits": user.ai_credits,
        },
        "leads": {
            "total": total_leads,
            "new": new_leads,
            "contacted": contacted,
            "interested": interested,
            "converted": converted,
            "lost": lost,
            "conversion_rate": conversion_rate,
        }
    }