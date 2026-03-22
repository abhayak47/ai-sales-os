from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy import String, cast, or_
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.contact import Contact
from app.models.lead import Lead
from app.schemas.contact import ContactCreate, ContactResponse, ContactUpdate
from app.services.auth import get_current_user
from app.services.workspace import require_role, workspace_get, workspace_query

router = APIRouter(prefix="/contacts", tags=["Contacts"])
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


def _normalize_tags(tags: list[str] | None):
    return sorted({tag.strip() for tag in (tags or []) if tag and tag.strip()})


@router.get("/", response_model=list[ContactResponse])
def get_contacts(
    search: str | None = None,
    segment: str | None = None,
    tag: str | None = None,
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
):
    user = get_current_user(token, db)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    query = workspace_query(db, Contact, user)
    if segment and segment != "All":
        query = query.filter(Contact.segment == segment)
    if tag:
        query = query.filter(cast(Contact.tags, String).ilike(f'%"{tag.strip().lower()}"%'))
    if search:
        pattern = f"%{search.strip()}%"
        query = query.filter(
            or_(
                Contact.name.ilike(pattern),
                Contact.company.ilike(pattern),
                Contact.email.ilike(pattern),
                Contact.phone.ilike(pattern),
                Contact.notes.ilike(pattern),
            )
        )
    return query.order_by(Contact.created_at.desc(), Contact.id.desc()).all()


@router.post("/", response_model=ContactResponse)
def create_contact(
    payload: ContactCreate,
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
):
    user = get_current_user(token, db)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    contact = Contact(
        user_id=user.id,
        organization_id=getattr(user, "organization_id", None),
        owner_user_id=user.id,
        name=payload.name,
        email=payload.email,
        phone=payload.phone,
        company=payload.company,
        title=payload.title,
        segment=payload.segment or "general",
        tags=_normalize_tags(payload.tags),
        notes=payload.notes,
        status=payload.status or "active",
    )
    db.add(contact)
    db.commit()
    db.refresh(contact)
    return contact


@router.post("/from-lead/{lead_id}", response_model=ContactResponse)
def convert_lead_to_contact(
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

    existing = workspace_query(db, Contact, user).filter(Contact.lead_id == lead_id).first()
    if existing:
        return existing

    contact = Contact(
        user_id=user.id,
        organization_id=getattr(user, "organization_id", None),
        lead_id=lead.id,
        owner_user_id=lead.owner_user_id or user.id,
        name=lead.name,
        email=lead.email,
        phone=lead.phone,
        company=lead.company,
        segment=lead.segment or "general",
        tags=_normalize_tags(lead.tags),
        notes=lead.notes,
        status="active",
    )
    db.add(contact)
    db.commit()
    db.refresh(contact)
    return contact


@router.put("/{contact_id}", response_model=ContactResponse)
def update_contact(
    contact_id: int,
    payload: ContactUpdate,
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
):
    user = get_current_user(token, db)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    contact = workspace_get(db, Contact, user, contact_id)
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")

    updates = payload.dict(exclude_unset=True)
    if "tags" in updates:
        updates["tags"] = _normalize_tags(updates.get("tags"))
    if "segment" in updates and not updates.get("segment"):
        updates["segment"] = "general"
    for key, value in updates.items():
        setattr(contact, key, value)
    db.commit()
    db.refresh(contact)
    return contact


@router.delete("/{contact_id}")
def delete_contact(
    contact_id: int,
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
):
    user = get_current_user(token, db)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    require_role(user, "manager")
    contact = workspace_get(db, Contact, user, contact_id)
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    db.delete(contact)
    db.commit()
    return {"message": "Contact deleted"}
