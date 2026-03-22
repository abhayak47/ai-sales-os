from datetime import datetime, timedelta

from app.models.task import Task


def create_stage_automation_tasks(db, lead, actor_user_id: int):
    if lead.status == "Contacted":
        task = Task(
            user_id=actor_user_id,
            organization_id=getattr(lead, "organization_id", None),
            assignee_user_id=getattr(lead, "owner_user_id", None) or actor_user_id,
            lead_id=lead.id,
            kind="reminder",
            title=f"Follow up with {lead.name}",
            description="New contact stage reached. Make sure a real follow-up happens while the conversation is fresh.",
            priority="high",
            status="open",
            channel="whatsapp",
            due_at=datetime.utcnow() + timedelta(days=2),
        )
        db.add(task)
    elif lead.status == "Interested":
        task = Task(
            user_id=actor_user_id,
            organization_id=getattr(lead, "organization_id", None),
            assignee_user_id=getattr(lead, "owner_user_id", None) or actor_user_id,
            lead_id=lead.id,
            kind="reminder",
            title=f"Book a decision step with {lead.name}",
            description="Interested deals should leave this stage with a proposal review, stakeholder intro, or decision date.",
            priority="critical",
            status="open",
            channel="call",
            due_at=datetime.utcnow() + timedelta(days=1),
        )
        db.add(task)
