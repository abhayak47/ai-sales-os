from datetime import datetime
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.activity import Activity
from app.models.lead import Lead
from app.models.task import Task
from app.schemas.task import TaskResponse, TaskUpdate
from app.services.auth import get_current_user

router = APIRouter(prefix="/tasks", tags=["Tasks"])
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


def _task_sort_value(task: Task):
    priority_order = {"critical": 0, "high": 1, "medium": 2, "low": 3}
    due_value = task.due_at or datetime.max
    return priority_order.get(task.priority, 4), due_value, task.id


def _attach_lead_meta(task: Task, lead: Lead):
    task.lead_name = lead.name
    task.lead_email = lead.email
    task.lead_phone = lead.phone
    task.lead_company = lead.company
    return task


@router.get("/lead/{lead_id}", response_model=List[TaskResponse])
def get_lead_tasks(
    lead_id: int,
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
):
    user = get_current_user(token, db)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    lead = db.query(Lead).filter(Lead.id == lead_id, Lead.user_id == user.id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    tasks = db.query(Task).filter(Task.user_id == user.id, Task.lead_id == lead_id).all()
    return [_attach_lead_meta(task, lead) for task in sorted(tasks, key=_task_sort_value)]


@router.get("/queue")
def get_task_queue(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
):
    user = get_current_user(token, db)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    tasks = db.query(Task).filter(Task.user_id == user.id, Task.status != "completed").all()
    tasks = sorted(tasks, key=_task_sort_value)

    leads = {
        lead.id: lead
        for lead in db.query(Lead).filter(Lead.user_id == user.id).all()
    }

    return {
        "total_open": len(tasks),
        "critical": len([task for task in tasks if task.priority == "critical"]),
        "items": [
            {
                "id": task.id,
                "lead_id": task.lead_id,
                "title": task.title,
                "description": task.description,
                "priority": task.priority,
                "status": task.status,
                "kind": task.kind,
                "channel": task.channel,
                "subject": task.subject,
                "content": task.content,
                "sequence_step": task.sequence_step,
                "due_at": task.due_at.isoformat() if task.due_at else None,
                "lead_name": leads.get(task.lead_id).name if leads.get(task.lead_id) else "",
                "lead_email": leads.get(task.lead_id).email if leads.get(task.lead_id) else "",
                "lead_phone": leads.get(task.lead_id).phone if leads.get(task.lead_id) else "",
                "lead_company": leads.get(task.lead_id).company if leads.get(task.lead_id) else "",
            }
            for task in tasks[:12]
        ],
    }


@router.patch("/{task_id}", response_model=TaskResponse)
def update_task(
    task_id: int,
    payload: TaskUpdate,
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
):
    user = get_current_user(token, db)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    task = db.query(Task).filter(Task.id == task_id, Task.user_id == user.id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    was_completed = task.status == "completed"
    task.status = payload.status
    task.completed_at = datetime.utcnow() if payload.status == "completed" else None
    lead = db.query(Lead).filter(Lead.id == task.lead_id, Lead.user_id == user.id).first()
    if payload.status == "completed" and not was_completed and lead:
        activity_type = "note"
        if task.channel and task.channel.lower() == "call":
            activity_type = "call"
        elif task.channel and task.channel.lower() == "email":
            activity_type = "email"
        elif task.channel and task.channel.lower() == "whatsapp":
            activity_type = "whatsapp"
        elif task.kind == "sequence_step":
            activity_type = "email" if (task.channel or "").lower() == "email" else "note"

        activity_description = task.description or task.content or "Execution task completed."
        db.add(Activity(
            user_id=user.id,
            lead_id=task.lead_id,
            type=activity_type,
            title=f"Completed: {task.title}",
            description=activity_description,
        ))
        lead.last_activity_at = datetime.utcnow()
    db.commit()
    db.refresh(task)
    return _attach_lead_meta(task, lead) if lead else task
