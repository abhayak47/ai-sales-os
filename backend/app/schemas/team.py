from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr


class TeamMemberCreate(BaseModel):
    full_name: str
    email: EmailStr
    password: str
    role: str = "rep"
    job_title: Optional[str] = None


class TeamMemberUpdate(BaseModel):
    role: Optional[str] = None
    job_title: Optional[str] = None
    is_active: Optional[bool] = None


class TeamMemberResponse(BaseModel):
    id: int
    full_name: str
    email: str
    role: str
    job_title: Optional[str] = None
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True
