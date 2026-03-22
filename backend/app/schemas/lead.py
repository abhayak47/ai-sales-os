from pydantic import BaseModel
from typing import List, Optional
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


class LeadListSummary(BaseModel):
    total: int
    new: int
    contacted: int
    interested: int
    converted: int
    lost: int
    needs_attention: int


class LeadListMeta(BaseModel):
    page: int
    page_size: int
    total: int
    total_pages: int
    search: Optional[str] = None
    status: Optional[str] = None
    view: Optional[str] = None
    sort_by: str
    sort_dir: str


class LeadListResponse(BaseModel):
    items: List[LeadResponse]
    meta: LeadListMeta
    summary: LeadListSummary


class SavedViewCard(BaseModel):
    id: str
    label: str
    description: str
    count: int
    path: str
    accent: str


class SavedViewsResponse(BaseModel):
    views: List[SavedViewCard]
