from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class LeadCreate(BaseModel):
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    company: Optional[str] = None
    status: Optional[str] = "New"
    notes: Optional[str] = None

class LeadUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    company: Optional[str] = None
    status: Optional[str] = None
    notes: Optional[str] = None

class LeadResponse(BaseModel):
    id: int
    user_id: int
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    company: Optional[str] = None
    status: str
    notes: Optional[str] = None
    score: Optional[float] = 0.0
    predicted_revenue: Optional[float] = 0.0
    follow_up_date: Optional[str] = None
    health_score: Optional[float] = 50.0
    health_status: Optional[str] = "Warm"
    relationship_score: Optional[int] = 50
    last_activity_at: Optional[datetime] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
