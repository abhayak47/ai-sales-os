from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.activity import Activity
from app.models.lead import Lead
from app.schemas.lead import LeadCreate, LeadListResponse, LeadResponse, LeadUpdate, SavedViewsResponse
from app.services.auth import get_current_user

router = APIRouter(prefix="/leads", tags=["Leads"])
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


def get_user(token: str, db: Session):
    user = get_current_user(token, db)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return user


def _base_query(user_id: int, db: Session):
    return db.query(Lead).filter(Lead.user_id == user_id)


def _apply_filters(query, search: str | None, status: str | None):
    if status and status != "All":
        query = query.filter(Lead.status == status)
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


def _build_summary(user_id: int, db: Session):
    leads = _base_query(user_id, db).all()
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


def _build_saved_views(user_id: int, db: Session):
    base = _base_query(user_id, db)
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
    view: str | None = None,
    sort_by: Literal["updated_at", "created_at", "last_activity_at", "score", "revenue", "name", "company", "status"] = "updated_at",
    sort_dir: Literal["asc", "desc"] = "desc",
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=100),
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
):
    user = get_user(token, db)
    filtered_query = _apply_saved_view(_apply_filters(_base_query(user.id, db), search, status), view)
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
            "view": view,
            "sort_by": sort_by,
            "sort_dir": sort_dir,
        },
        "summary": _build_summary(user.id, db),
    }


@router.get("/views", response_model=SavedViewsResponse)
def get_saved_views(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
):
    user = get_user(token, db)
    return {"views": _build_saved_views(user.id, db)}


@router.get("/{lead_id}", response_model=LeadResponse)
def get_lead(
    lead_id: int,
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
):
    user = get_user(token, db)
    lead = db.query(Lead).filter(Lead.id == lead_id, Lead.user_id == user.id).first()
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
    new_lead = Lead(**lead.dict(), user_id=user.id)
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
    lead = db.query(Lead).filter(Lead.id == lead_id, Lead.user_id == user.id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    for key, value in lead_data.dict(exclude_unset=True).items():
        setattr(lead, key, value)
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
    lead = db.query(Lead).filter(Lead.id == lead_id, Lead.user_id == user.id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
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
    lead = db.query(Lead).filter(Lead.id == lead_id, Lead.user_id == user.id).first()
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
