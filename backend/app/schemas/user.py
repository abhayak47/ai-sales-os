from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime

class UserCreate(BaseModel):
    full_name: str
    email: EmailStr
    password: str
    invite_token: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: int
    organization_id: Optional[int] = None
    organization_name: Optional[str] = None
    organization_slug: Optional[str] = None
    full_name: str
    email: str
    role: str = "owner"
    job_title: Optional[str] = None
    plan: str
    ai_credits: int
    subscription_status: Optional[str] = "inactive"
    subscription_plan: Optional[str] = None
    is_onboarded: bool
    onboarding_step: int
    created_at: datetime

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None
