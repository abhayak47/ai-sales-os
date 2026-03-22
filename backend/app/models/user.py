from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text
from sqlalchemy.sql import func
from app.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)
    plan = Column(String, default="free")
    ai_credits = Column(Integer, default=25)  # 25 free credits on signup
    subscription_status = Column(String, default="inactive")
    subscription_plan = Column(String, nullable=True)
    razorpay_customer_id = Column(String, nullable=True)
    razorpay_subscription_id = Column(String, nullable=True)
    subscription_current_end = Column(DateTime(timezone=True), nullable=True)
    is_onboarded = Column(Boolean, default=False)
    onboarding_step = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
