from pydantic import BaseModel
from typing import List, Optional

class FollowUpRequest(BaseModel):
    context: str
    client_type: str
    tone: str

class FollowUpResponse(BaseModel):
    email: str
    whatsapp: str
    short: str

class LeadAnalysisRequest(BaseModel):
    lead_id: int

class LeadAnalysisResponse(BaseModel):
    deal_score: float
    win_probability: float
    deal_temperature: str
    next_action: str
    next_action_timing: str
    risk_factors: str
    opportunity: str
    suggested_message: str
    coach_advice: str

class ChatMessage(BaseModel):
    role: str
    content: str

class SalesCoachRequest(BaseModel):
    message: str
    chat_history: Optional[List[ChatMessage]] = []

class SalesCoachResponse(BaseModel):
    response: str