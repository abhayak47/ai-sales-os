from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text
from sqlalchemy.sql import func

from app.database import Base


class BillingSubscription(Base):
    __tablename__ = "billing_subscriptions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    plan_code = Column(String, nullable=False)
    provider = Column(String, default="razorpay", nullable=False)
    provider_subscription_id = Column(String, unique=True, nullable=False, index=True)
    provider_customer_id = Column(String, nullable=True)
    status = Column(String, default="created", nullable=False)
    current_start = Column(DateTime(timezone=True), nullable=True)
    current_end = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class BillingEvent(Base):
    __tablename__ = "billing_events"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    provider = Column(String, default="razorpay", nullable=False)
    event_type = Column(String, nullable=False)
    external_id = Column(String, unique=True, nullable=False, index=True)
    status = Column(String, default="processed", nullable=False)
    payload = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
