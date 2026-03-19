from pydantic import BaseModel

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