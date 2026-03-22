from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.lead import Lead
from app.models.lead_comment import LeadComment
from app.schemas.comment import LeadCommentCreate, LeadCommentResponse
from app.services.auth import get_current_user
from app.services.workspace import workspace_get, workspace_query

router = APIRouter(prefix="/comments", tags=["Comments"])
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


@router.get("/lead/{lead_id}", response_model=list[LeadCommentResponse])
def get_comments(
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
        workspace_query(db, LeadComment, user)
        .filter(LeadComment.lead_id == lead_id)
        .order_by(LeadComment.created_at.desc())
        .all()
    )


@router.post("/lead/{lead_id}", response_model=LeadCommentResponse)
def add_comment(
    lead_id: int,
    payload: LeadCommentCreate,
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
):
    user = get_current_user(token, db)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    lead = workspace_get(db, Lead, user, lead_id)
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    comment = LeadComment(
        user_id=user.id,
        organization_id=getattr(user, "organization_id", None),
        lead_id=lead.id,
        author_name=user.full_name,
        body=payload.body,
    )
    db.add(comment)
    db.commit()
    db.refresh(comment)
    return comment
