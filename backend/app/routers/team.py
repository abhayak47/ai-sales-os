from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
import secrets
from datetime import datetime, timedelta

from app.database import get_db
from app.models.organization import TeamInvite
from app.models.user import User
from app.schemas.team import TeamInviteCreate, TeamInviteResponse, TeamMemberCreate, TeamMemberResponse, TeamMemberUpdate
from app.services.auth import get_current_user, get_user_by_email, hash_password
from app.services.workspace import require_role, workspace_query

router = APIRouter(prefix="/team", tags=["Team"])
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

router = APIRouter(prefix="/team", tags=["Team"])
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


@router.get("/members", response_model=list[TeamMemberResponse])
def get_members(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
):
    user = get_current_user(token, db)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return workspace_query(db, User, user).order_by(User.created_at.asc()).all()


@router.post("/members", response_model=TeamMemberResponse)
def create_member(
    payload: TeamMemberCreate,
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
):
    user = get_current_user(token, db)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    require_role(user, "admin")

    existing = get_user_by_email(db, payload.email)
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    member = User(
        organization_id=getattr(user, "organization_id", None),
        full_name=payload.full_name,
        email=payload.email,
        hashed_password=hash_password(payload.password),
        role=payload.role,
        job_title=payload.job_title,
        is_active=True,
        plan=user.plan,
        ai_credits=0,
        is_onboarded=True,
        onboarding_step=4,
    )
    db.add(member)
    db.commit()
    db.refresh(member)
    return member


@router.patch("/members/{member_id}", response_model=TeamMemberResponse)
def update_member(
    member_id: int,
    payload: TeamMemberUpdate,
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
):
    user = get_current_user(token, db)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    require_role(user, "admin")

    member = workspace_query(db, User, user).filter(User.id == member_id).first()
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")
    if member.id == user.id and payload.role and payload.role != member.role:
        raise HTTPException(status_code=400, detail="Change another member's role first before changing your own")

    for key, value in payload.dict(exclude_unset=True).items():
        setattr(member, key, value)
    db.commit()
    db.refresh(member)
    return member


@router.get("/invites", response_model=list[TeamInviteResponse])
def get_invites(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
):
    user = get_current_user(token, db)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return workspace_query(db, TeamInvite, user).order_by(TeamInvite.created_at.desc()).all()


@router.post("/invites", response_model=TeamInviteResponse)
def create_invite(
    payload: TeamInviteCreate,
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
):
    user = get_current_user(token, db)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    require_role(user, "admin")

    existing = db.query(TeamInvite).filter(
        TeamInvite.organization_id == user.organization_id,
        TeamInvite.email == payload.email,
        TeamInvite.status == "pending"
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Invite already sent")

    invite = TeamInvite(
        organization_id=user.organization_id,
        inviter_user_id=user.id,
        email=payload.email,
        role=payload.role,
        token=secrets.token_urlsafe(32),
        expires_at=datetime.utcnow() + timedelta(days=7),
    )
    db.add(invite)
    db.commit()
    db.refresh(invite)
    # TODO: Send email with invite link
    return invite


@router.post("/invites/{invite_id}/accept")
def accept_invite(
    invite_id: int,
    payload: TeamMemberCreate,
    db: Session = Depends(get_db),
):
    invite = db.query(TeamInvite).filter(TeamInvite.id == invite_id).first()
    if not invite or invite.status != "pending" or invite.expires_at < datetime.utcnow():
        raise HTTPException(status_code=400, detail="Invalid or expired invite")

    existing = get_user_by_email(db, payload.email)
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    member = User(
        organization_id=invite.organization_id,
        full_name=payload.full_name,
        email=payload.email,
        hashed_password=hash_password(payload.password),
        role=invite.role,
        job_title=payload.job_title,
        is_active=True,
        plan="free",
        ai_credits=25,
    )
    db.add(member)
    db.commit()

    invite.status = "accepted"
    db.commit()

    return {"message": "Invite accepted, account created"}
