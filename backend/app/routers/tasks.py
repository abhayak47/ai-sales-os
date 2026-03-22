from datetime import datetime
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.activity import Activity
from app.models.lead import Lead
from app.models.task import Task
from app.schemas.task import TaskCreate, TaskResponse, TaskUpdate
from app.services.auth import get_current_user
from app.services.workspace import can_edit_lead, workspace_get, workspace_query

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

    lead = workspace_get(db, Lead, user, lead_id)
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    tasks = workspace_query(db, Task, user).filter(Task.lead_id == lead_id).all()
    return [_attach_lead_meta(task, lead) for task in sorted(tasks, key=_task_sort_value)]


@router.post("/", response_model=TaskResponse)
def create_task(
    payload: TaskCreate,
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
):
    user = get_current_user(token, db)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    lead = workspace_get(db, Lead, user, payload.lead_id)
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    if not can_edit_lead(user, lead):
        raise HTTPException(status_code=403, detail="Not allowed to create tasks for this lead")

    task = Task(
        user_id=user.id,
        organization_id=getattr(user, "organization_id", None),
        lead_id=payload.lead_id,
        assignee_user_id=payload.assignee_user_id or getattr(lead, "owner_user_id", None) or user.id,
        kind=payload.kind,
        title=payload.title,
        description=payload.description,
        priority=payload.priority,
        status="open",
        channel=payload.channel,
        subject=payload.subject,
        content=payload.content,
        due_at=payload.due_at,
        sequence_step=payload.sequence_step,
    )
    db.add(task)
    db.commit()
    db.refresh(task)
    return _attach_lead_meta(task, lead)


@router.get("/queue")
def get_task_queue(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
):
    user = get_current_user(token, db)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    tasks = workspace_query(db, Task, user).filter(Task.status != "completed").all()
    tasks = sorted(tasks, key=_task_sort_value)

    leads = {lead.id: lead for lead in workspace_query(db, Lead, user).all()}

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
                "assignee_user_id": task.assignee_user_id,
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

    task = workspace_get(db, Task, user, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    was_completed = task.status == "completed"
    if payload.status is not None:
        task.status = payload.status
        task.completed_at = datetime.utcnow() if payload.status == "completed" else None
    if payload.priority is not None:
        task.priority = payload.priority
    if payload.due_at is not None:
        task.due_at = payload.due_at
    if payload.assignee_user_id is not None:
        task.assignee_user_id = payload.assignee_user_id

    lead = workspace_get(db, Lead, user, task.lead_id)
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
            organization_id=getattr(user, "organization_id", None),
            lead_id=task.lead_id,
            type=activity_type,
            title=f"Completed: {task.title}",
            description=activity_description,
        ))
        lead.last_activity_at = datetime.utcnow()

    db.commit()
    db.refresh(task)
    return _attach_lead_meta(task, lead) if lead else task
