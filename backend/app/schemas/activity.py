from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class ActivityCreate(BaseModel):
    lead_id: int
    type: str
    title: str
    description: Optional[str] = None

class ActivityResponse(BaseModel):
    id: int
    user_id: int
    organization_id: Optional[int] = None
    lead_id: int
    type: str
    title: str
    description: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True
