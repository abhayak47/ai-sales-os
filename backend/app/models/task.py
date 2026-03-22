from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.sql import func

from app.database import Base


class Task(Base):
    __tablename__ = "tasks"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    lead_id = Column(Integer, ForeignKey("leads.id"), nullable=False)
    kind = Column(String, nullable=False, default="task")
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    priority = Column(String, nullable=False, default="medium")
    status = Column(String, nullable=False, default="open")
    channel = Column(String, nullable=True)
    subject = Column(String, nullable=True)
    content = Column(Text, nullable=True)
    due_at = Column(DateTime(timezone=True), nullable=True)
    sequence_step = Column(Integer, nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
