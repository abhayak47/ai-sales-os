from datetime import datetime

from pydantic import BaseModel


class LeadCommentCreate(BaseModel):
    body: str


class LeadCommentResponse(BaseModel):
    id: int
    user_id: int
    organization_id: int | None = None
    lead_id: int
    author_name: str
    body: str
    created_at: datetime

    class Config:
        from_attributes = True
