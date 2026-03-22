from datetime import datetime
from typing import Any, List, Optional

from pydantic import BaseModel


class LeadMemoryPinCreate(BaseModel):
    lead_id: int
    title: str
    content: str
    source: Optional[str] = "manual"


class LeadMemoryPinUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    is_pinned: Optional[bool] = None


class LeadMemoryPinResponse(BaseModel):
    id: int
    lead_id: int
    title: str
    content: str
    source: str
    is_pinned: bool
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class AIArtifactResponse(BaseModel):
    id: int
    artifact_type: str
    title: str
    payload: Any
    context_snapshot: Optional[str] = None
    created_at: datetime


class LeadMemoryBundleResponse(BaseModel):
    overview: str
    pinned_facts: List[LeadMemoryPinResponse]
    inferred_memory: List[str]
    saved_outputs: List[AIArtifactResponse]
