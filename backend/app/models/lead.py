from sqlalchemy import JSON, Column, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.sql import func

from app.database import Base


class Lead(Base):
    __tablename__ = "leads"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    organization_id = Column(Integer, ForeignKey("organizations.id"), nullable=True, index=True)
    owner_user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, nullable=True)
    phone = Column(String, nullable=True)
    company = Column(String, nullable=True)
    status = Column(String, default="New")
    segment = Column(String, default="general")
    tags = Column(JSON, default=list)
    notes = Column(Text, nullable=True)
    score = Column(Float, default=0.0)
    predicted_revenue = Column(Float, default=0.0)
    follow_up_date = Column(String, nullable=True)
    health_score = Column(Float, default=50.0)  # 0-100
    health_status = Column(String, default="Warm")  # Cold, Warm, Hot
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    last_activity_at = Column(DateTime, nullable=True)
    relationship_score = Column(Integer, default=50)
