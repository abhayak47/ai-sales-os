from pydantic import BaseModel

class FollowUpRequest(BaseModel):
    context: str
    client_type: str
    tone: str

class FollowUpResponse(BaseModel):
    email: str
    whatsapp: str
    short: str