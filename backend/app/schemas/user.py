from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime

# Used when user registers
class UserCreate(BaseModel):
    full_name: str
    email: EmailStr
    password: str

# Used when user logs in
class UserLogin(BaseModel):
    email: EmailStr
    password: str

# What we send back to frontend (never send password!)
class UserResponse(BaseModel):
    id: int
    full_name: str
    email: str
    plan: str
    ai_credits: int
    created_at: datetime

    class Config:
        from_attributes = True

# JWT Token response
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None