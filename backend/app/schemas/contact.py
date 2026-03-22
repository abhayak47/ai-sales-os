from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel


class ContactCreate(BaseModel):
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    company: Optional[str] = None
    title: Optional[str] = None
    segment: Optional[str] = "general"
    tags: Optional[List[str]] = None
    notes: Optional[str] = None
    status: Optional[str] = "active"


class ContactUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    company: Optional[str] = None
    title: Optional[str] = None
    segment: Optional[str] = None
    tags: Optional[List[str]] = None
    notes: Optional[str] = None
    status: Optional[str] = None


class ContactResponse(BaseModel):
    id: int
    user_id: int
    organization_id: Optional[int] = None
    lead_id: Optional[int] = None
    owner_user_id: Optional[int] = None
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    company: Optional[str] = None
    title: Optional[str] = None
    segment: Optional[str] = "general"
    tags: Optional[List[str]] = None
    notes: Optional[str] = None
    status: str
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
