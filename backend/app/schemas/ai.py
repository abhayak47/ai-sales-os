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

class EmailSequenceRequest(BaseModel):
    lead_id: int
    context: str
    tone: str

class EmailDay(BaseModel):
    day: int
    subject: str
    body: str

class EmailSequenceResponse(BaseModel):
    sequence: List[EmailDay]

class MeetingAnalysisRequest(BaseModel):
    lead_id: int
    notes: str

class MeetingAnalysisResponse(BaseModel):
    summary: str
    key_points: List[str]
    action_items: List[str]
    objections: List[str]
    next_steps: str
    deal_status: str
    follow_up_email: str


class LeadContextRequest(BaseModel):
    lead_id: int


class ObjectionPlaybookRequest(BaseModel):
    lead_id: int
    objection: str


class DealStrategyResponse(BaseModel):
    executive_summary: str
    deal_narrative: str
    leverage_points: List[str]
    blind_spots: List[str]
    likely_objections: List[str]
    action_plan: List[str]


class ObjectionPlaybookResponse(BaseModel):
    objection_diagnosis: str
    root_issue: str
    rebuttal_strategy: str
    proof_points: List[str]
    response_script: str
    follow_up_message: str


class RevivalCampaignStep(BaseModel):
    step: int
    channel: str
    timing: str
    message: str
    objective: str


class RevivalCampaignResponse(BaseModel):
    diagnosis: str
    campaign_angle: str
    sequence: List[RevivalCampaignStep]
    do_not_do: List[str]


class StakeholderMapResponse(BaseModel):
    champion: str
    decision_maker: str
    economic_buyer: str
    blockers: List[str]
    missing_people: List[str]
    access_strategy: List[str]


class MeetingPrepResponse(BaseModel):
    meeting_goal: str
    agenda: List[str]
    strategic_questions: List[str]
    red_flags: List[str]
    close_plan: List[str]
