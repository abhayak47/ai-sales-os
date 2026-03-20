from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.sql import func
from app.database import Base

class CreditsLedger(Base):
    __tablename__ = "credits_ledger"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    action = Column(String, nullable=False)  # e.g. "followup", "analysis", "sequence"
    credits_used = Column(Integer, nullable=False)
    credits_before = Column(Integer, nullable=False)
    credits_after = Column(Integer, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())