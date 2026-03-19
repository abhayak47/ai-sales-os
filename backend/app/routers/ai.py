from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.ai import FollowUpRequest, FollowUpResponse
from app.services.ai import generate_followup
from app.services.auth import get_current_user

router = APIRouter(prefix="/ai", tags=["AI"])

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

@router.post("/followup", response_model=FollowUpResponse)
def generate_follow_up(
    request: FollowUpRequest,
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):
    # Check user is logged in
    user = get_current_user(token, db)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    # Check credits
    if user.ai_credits <= 0:
        raise HTTPException(status_code=403, detail="No AI credits left. Please upgrade.")

    # Generate followup
    try:
        result = generate_followup(
            context=request.context,
            client_type=request.client_type,
            tone=request.tone
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI error: {str(e)}")

    # Deduct 1 credit
    user.ai_credits -= 1
    db.commit()

    return result