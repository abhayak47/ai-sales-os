import re
from datetime import datetime, timedelta
from typing import Optional

from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session

from app.models.organization import Organization
from app.models.user import User
from app.models.credits import CreditsLedger
from app.schemas.user import UserCreate, TokenData
from app.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

def get_user_by_email(db: Session, email: str):
    return db.query(User).filter(User.email == email).first()


def _slugify(value: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")
    return slug or "workspace"


def _unique_org_slug(db: Session, base_value: str) -> str:
    base_slug = _slugify(base_value)
    slug = base_slug
    counter = 2
    while db.query(Organization).filter(Organization.slug == slug).first():
        slug = f"{base_slug}-{counter}"
        counter += 1
    return slug


def build_user_payload(db: Session, user: User):
    organization = None
    if getattr(user, "organization_id", None):
        organization = db.query(Organization).filter(Organization.id == user.organization_id).first()

    return {
        "id": user.id,
        "organization_id": user.organization_id,
        "organization_name": organization.name if organization else None,
        "organization_slug": organization.slug if organization else None,
        "full_name": user.full_name,
        "email": user.email,
        "role": user.role or "owner",
        "job_title": user.job_title,
        "plan": user.plan,
        "ai_credits": user.ai_credits,
        "subscription_status": user.subscription_status,
        "subscription_plan": user.subscription_plan,
        "is_onboarded": user.is_onboarded,
        "onboarding_step": user.onboarding_step,
        "created_at": user.created_at,
    }


def create_user(db: Session, user: UserCreate):
    hashed_password = hash_password(user.password)
    workspace_name = f"{user.full_name.split()[0]}'s workspace" if user.full_name.strip() else "New workspace"
    organization = Organization(
        name=workspace_name,
        slug=_unique_org_slug(db, user.full_name or user.email.split("@")[0]),
    )
    db.add(organization)
    db.flush()

    db_user = User(
        organization_id=organization.id,
        full_name=user.full_name,
        email=user.email,
        hashed_password=hashed_password,
        role="owner",
        ai_credits=25,  # 25 free credits on signup
        is_onboarded=False,
        onboarding_step=0
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)

    # Log initial credits
    ledger = CreditsLedger(
        user_id=db_user.id,
        action="signup_bonus",
        credits_used=0,
        credits_before=0,
        credits_after=25
    )
    db.add(ledger)
    db.commit()
    return db_user

def authenticate_user(db: Session, email: str, password: str):
    user = get_user_by_email(db, email)
    if not user:
        return False
    if not verify_password(password, user.hashed_password):
        return False
    return user

def get_current_user(token: str, db: Session):
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            return None
        token_data = TokenData(email=email)
    except JWTError:
        return None
    user = get_user_by_email(db, email=token_data.email)
    return user

def deduct_credits(db: Session, user: User, action: str, amount: int) -> bool:
    if user.ai_credits < amount:
        return False
    credits_before = user.ai_credits
    user.ai_credits -= amount

    ledger = CreditsLedger(
        user_id=user.id,
        action=action,
        credits_used=amount,
        credits_before=credits_before,
        credits_after=user.ai_credits
    )
    db.add(ledger)
    db.commit()
    return True
