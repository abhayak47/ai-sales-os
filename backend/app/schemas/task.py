from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class TaskUpdate(BaseModel):
    status: str


class TaskResponse(BaseModel):
    id: int
    user_id: int
    lead_id: int
    kind: str
    title: str
    description: Optional[str] = None
    priority: str
    status: str
    channel: Optional[str] = None
    subject: Optional[str] = None
    content: Optional[str] = None
    due_at: Optional[datetime] = None
    sequence_step: Optional[int] = None
    completed_at: Optional[datetime] = None
    created_at: datetime
    lead_name: Optional[str] = None
    lead_email: Optional[str] = None
    lead_phone: Optional[str] = None
    lead_company: Optional[str] = None

    class Config:
        from_attributes = True
