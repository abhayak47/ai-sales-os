from base64 import b64decode
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Response
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models.activity import Activity
from app.models.email import EmailMessage, EmailTemplate
from app.models.lead import Lead
from app.schemas.email import (
    EmailMessageResponse,
    EmailSendRequest,
    EmailTemplateCreate,
    EmailTemplateResponse,
    EmailTemplateUpdate,
)
from app.services.auth import get_current_user
from app.services.email_delivery import build_tracking_token, send_email_with_tracking
from app.services.workspace import workspace_get, workspace_query

router = APIRouter(prefix="/emails", tags=["Emails"])
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")
PIXEL_GIF = b64decode("R0lGODlhAQABAPAAAAAAAAAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==")


@router.get("/templates", response_model=list[EmailTemplateResponse])
def get_templates(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
):
    user = get_current_user(token, db)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return workspace_query(db, EmailTemplate, user).order_by(EmailTemplate.created_at.desc()).all()


@router.post("/templates", response_model=EmailTemplateResponse)
def create_template(
    payload: EmailTemplateCreate,
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
):
    user = get_current_user(token, db)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    template = EmailTemplate(
        user_id=user.id,
        organization_id=getattr(user, "organization_id", None),
        name=payload.name,
        subject=payload.subject,
        body=payload.body,
    )
    db.add(template)
    db.commit()
    db.refresh(template)
    return template


@router.put("/templates/{template_id}", response_model=EmailTemplateResponse)
def update_template(
    template_id: int,
    payload: EmailTemplateUpdate,
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
):
    user = get_current_user(token, db)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    template = workspace_get(db, EmailTemplate, user, template_id)
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    for key, value in payload.dict(exclude_unset=True).items():
        setattr(template, key, value)
    db.commit()
    db.refresh(template)
    return template


@router.get("/lead/{lead_id}", response_model=list[EmailMessageResponse])
def get_lead_emails(
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
    return (
        workspace_query(db, EmailMessage, user)
        .filter(EmailMessage.lead_id == lead_id)
        .order_by(EmailMessage.created_at.desc())
        .all()
    )


@router.post("/send", response_model=EmailMessageResponse)
def send_email(
    payload: EmailSendRequest,
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
):
    user = get_current_user(token, db)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    lead = workspace_get(db, Lead, user, payload.lead_id)
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    if not lead.email:
        raise HTTPException(status_code=400, detail="Lead does not have an email address")

    tracking_token = build_tracking_token()
    tracking_url = f"{settings.BACKEND_PUBLIC_URL.rstrip('/')}/emails/track/{tracking_token}"
    delivered, status = send_email_with_tracking(lead.email, payload.subject, payload.body, tracking_url)

    message = EmailMessage(
        user_id=user.id,
        organization_id=getattr(user, "organization_id", None),
        lead_id=lead.id,
        template_id=payload.template_id,
        recipient_email=lead.email,
        subject=payload.subject,
        body=payload.body,
        status=status,
        tracking_token=tracking_token,
        sent_at=datetime.utcnow() if delivered else None,
    )
    db.add(message)
    db.add(Activity(
        user_id=user.id,
        organization_id=getattr(user, "organization_id", None),
        lead_id=lead.id,
        type="email",
        title=f"Email {'sent' if delivered else 'logged'}: {payload.subject}",
        description=payload.body[:500],
    ))
    lead.last_activity_at = datetime.utcnow()
    db.commit()
    db.refresh(message)
    return message


@router.post("/{message_id}/mark-replied", response_model=EmailMessageResponse)
def mark_replied(
    message_id: int,
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
):
    user = get_current_user(token, db)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    message = workspace_get(db, EmailMessage, user, message_id)
    if not message:
        raise HTTPException(status_code=404, detail="Email not found")
    message.status = "replied"
    db.commit()
    db.refresh(message)
    return message


@router.get("/track/{tracking_token}")
def track_email_open(
    tracking_token: str,
    db: Session = Depends(get_db),
):
    message = db.query(EmailMessage).filter(EmailMessage.tracking_token == tracking_token).first()
    if message and not message.opened_at:
        message.opened_at = datetime.utcnow()
        message.status = "opened"
        db.commit()
    return Response(content=PIXEL_GIF, media_type="image/gif")
