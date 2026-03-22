from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy import String, cast, or_
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.activity import Activity
from app.models.lead import Lead
from app.schemas.lead import LeadCreate, LeadListResponse, LeadResponse, LeadUpdate, SavedViewsResponse
from app.services.auth import get_current_user
from app.services.automation import create_stage_automation_tasks
from app.services.workspace import can_edit_lead, require_role, workspace_query

router = APIRouter(prefix="/leads", tags=["Leads"])
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


def get_user(token: str, db: Session):
    user = get_current_user(token, db)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return user


def _normalize_tags(tags: list[str] | None):
    return sorted({tag.strip() for tag in (tags or []) if tag and tag.strip()})


def _base_query(user, db: Session):
    return workspace_query(db, Lead, user)


def _apply_filters(query, search: str | None, status: str | None, segment: str | None, tag: str | None):
    if status and status != "All":
        query = query.filter(Lead.status == status)
    if segment and segment != "All":
        query = query.filter(Lead.segment == segment)
    if tag:
        normalized_tag = tag.strip().lower()
        if normalized_tag:
            query = query.filter(cast(Lead.tags, String).ilike(f'%"{normalized_tag}"%'))
    if search:
        pattern = f"%{search.strip()}%"
        query = query.filter(
            or_(
                Lead.name.ilike(pattern),
                Lead.company.ilike(pattern),
                Lead.email.ilike(pattern),
                Lead.phone.ilike(pattern),
                Lead.notes.ilike(pattern),
            )
        )
    return query


def _apply_saved_view(query, view: str | None):
    if not view:
        return query

    if view == "hot_deals":
        return query.filter(Lead.status == "Interested")

    if view == "needs_follow_up":
        return query.filter(
            Lead.status.in_(["New", "Contacted", "Interested"]),
            or_(
                Lead.follow_up_date.isnot(None),
                Lead.health_score < 45,
                Lead.relationship_score < 45,
            ),
        )

    if view == "decision_this_week":
        return query.filter(
            Lead.status.in_(["Interested", "Contacted"]),
            Lead.score >= 60,
        )

    return query


def _apply_sort(query, sort_by: str, sort_dir: str):
    sort_columns = {
        "created_at": Lead.created_at,
        "updated_at": Lead.updated_at,
        "last_activity_at": Lead.last_activity_at,
        "score": Lead.score,
        "revenue": Lead.predicted_revenue,
        "name": Lead.name,
        "company": Lead.company,
        "status": Lead.status,
    }
    column = sort_columns.get(sort_by, Lead.updated_at)
    ordered = column.desc() if sort_dir == "desc" else column.asc()
    return query.order_by(ordered, Lead.id.desc())


def _build_summary(user, db: Session):
    leads = _base_query(user, db).all()
    return {
        "total": len(leads),
        "new": len([lead for lead in leads if lead.status == "New"]),
        "contacted": len([lead for lead in leads if lead.status == "Contacted"]),
        "interested": len([lead for lead in leads if lead.status == "Interested"]),
        "converted": len([lead for lead in leads if lead.status == "Converted"]),
        "lost": len([lead for lead in leads if lead.status == "Lost"]),
        "needs_attention": len(
            [
                lead
                for lead in leads
                if lead.status not in ["Converted", "Lost"]
                and ((lead.health_score or 50) < 45 or (lead.relationship_score or 50) < 45)
            ]
        ),
    }


def _build_saved_views(user, db: Session):
    base = _base_query(user, db)
    hot_deals = _apply_saved_view(base, "hot_deals").count()
    needs_follow_up = _apply_saved_view(base, "needs_follow_up").count()
    decision_this_week = _apply_saved_view(base, "decision_this_week").count()

    return [
        {
            "id": "hot_deals",
            "label": "My Hot Deals",
            "description": "Interested deals where momentum matters most.",
            "count": hot_deals,
            "path": "/leads?view=hot_deals",
            "accent": "fuchsia",
        },
        {
            "id": "needs_follow_up",
            "label": "Needs Follow-Up",
            "description": "Leads that are active but need a timely next touch.",
            "count": needs_follow_up,
            "path": "/leads?view=needs_follow_up",
            "accent": "amber",
        },
        {
            "id": "decision_this_week",
            "label": "Decision This Week",
            "description": "High-likelihood deals to push toward a concrete commitment.",
            "count": decision_this_week,
            "path": "/leads?view=decision_this_week",
            "accent": "emerald",
        },
    ]


@router.get("/", response_model=LeadListResponse)
def get_leads(
    search: str | None = None,
    status: str | None = None,
    segment: str | None = None,
    tag: str | None = None,
    view: str | None = None,
    sort_by: Literal["updated_at", "created_at", "last_activity_at", "score", "revenue", "name", "company", "status"] = "updated_at",
    sort_dir: Literal["asc", "desc"] = "desc",
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=100),
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
):
    user = get_user(token, db)
    filtered_query = _apply_saved_view(_apply_filters(_base_query(user, db), search, status, segment, tag), view)
    total = filtered_query.count()
    items = (
        _apply_sort(filtered_query, sort_by, sort_dir)
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    total_pages = max((total + page_size - 1) // page_size, 1)

    return {
        "items": items,
        "meta": {
            "page": page,
            "page_size": page_size,
            "total": total,
            "total_pages": total_pages,
            "search": search,
            "status": status,
            "segment": segment,
            "tag": tag,
            "view": view,
            "sort_by": sort_by,
            "sort_dir": sort_dir,
        },
        "summary": _build_summary(user, db),
    }


@router.get("/views", response_model=SavedViewsResponse)
def get_saved_views(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
):
    user = get_user(token, db)
    return {"views": _build_saved_views(user, db)}


@router.get("/{lead_id}", response_model=LeadResponse)
def get_lead(
    lead_id: int,
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
):
    user = get_user(token, db)
    lead = _base_query(user, db).filter(Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    return lead


@router.post("/", response_model=LeadResponse)
def create_lead(
    lead: LeadCreate,
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
):
    user = get_user(token, db)
    payload = lead.dict()
    payload["segment"] = payload.get("segment") or "general"
    payload["tags"] = _normalize_tags(payload.get("tags"))
    requested_owner_id = payload.pop("owner_user_id", None)
    if requested_owner_id and requested_owner_id != user.id:
        require_role(user, "manager")
    new_lead = Lead(
        **payload,
        user_id=user.id,
        organization_id=getattr(user, "organization_id", None),
        owner_user_id=requested_owner_id or user.id,
    )
    db.add(new_lead)
    db.commit()
    db.refresh(new_lead)
    return new_lead


@router.put("/{lead_id}", response_model=LeadResponse)
def update_lead(
    lead_id: int,
    lead_data: LeadUpdate,
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
):
    user = get_user(token, db)
    lead = _base_query(user, db).filter(Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    if not can_edit_lead(user, lead):
        raise HTTPException(status_code=403, detail="Not allowed to edit this lead")

    updates = lead_data.dict(exclude_unset=True)
    if "tags" in updates:
        updates["tags"] = _normalize_tags(updates.get("tags"))
    if "segment" in updates and not updates.get("segment"):
        updates["segment"] = "general"
    if "owner_user_id" in updates and updates.get("owner_user_id") and updates["owner_user_id"] != lead.owner_user_id:
        require_role(user, "manager")

    previous_status = lead.status
    for key, value in updates.items():
        setattr(lead, key, value)
    if "status" in updates and updates["status"] != previous_status:
        create_stage_automation_tasks(db, lead, user.id)
    db.commit()
    db.refresh(lead)
    return lead


@router.delete("/{lead_id}")
def delete_lead(
    lead_id: int,
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
):
    user = get_user(token, db)
    lead = _base_query(user, db).filter(Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    require_role(user, "manager")
    db.delete(lead)
    db.commit()
    return {"message": "Lead deleted"}


@router.post("/{lead_id}/calculate-health")
def calculate_health(
    lead_id: int,
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
):
    user = get_user(token, db)
    lead = _base_query(user, db).filter(Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    activities = db.query(Activity).filter(Activity.lead_id == lead_id).all()
    score = {
        "New": 40,
        "Contacted": 55,
        "Interested": 75,
        "Converted": 100,
        "Lost": 10,
    }.get(lead.status, 50)

    activity_count = len(activities)
    if activity_count >= 5:
        score = min(score + 20, 100)
    elif activity_count >= 3:
        score = min(score + 10, 100)
    elif activity_count >= 1:
        score = min(score + 5, 100)

    if score >= 70:
        health_status = "Hot"
    elif score >= 40:
        health_status = "Warm"
    else:
        health_status = "Cold"

    lead.health_score = score
    lead.health_status = health_status
    db.commit()

    return {"health_score": score, "health_status": health_status}
