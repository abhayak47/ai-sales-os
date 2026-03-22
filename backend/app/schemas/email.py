from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class EmailTemplateCreate(BaseModel):
    name: str
    subject: str
    body: str


class EmailTemplateUpdate(BaseModel):
    name: Optional[str] = None
    subject: Optional[str] = None
    body: Optional[str] = None


class EmailTemplateResponse(BaseModel):
    id: int
    name: str
    subject: str
    body: str
    created_at: datetime

    class Config:
        from_attributes = True


class EmailSendRequest(BaseModel):
    lead_id: int
    subject: str
    body: str
    template_id: Optional[int] = None


class EmailMessageResponse(BaseModel):
    id: int
    lead_id: int
    template_id: Optional[int] = None
    recipient_email: str
    subject: str
    body: str
    status: str
    tracking_token: Optional[str] = None
    sent_at: Optional[datetime] = None
    opened_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True
