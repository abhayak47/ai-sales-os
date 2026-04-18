from fastapi import HTTPException


ROLE_RANK = {
    "member": 1,
    "admin": 2,
    "owner": 3,
}


def workspace_query(db, model, user):
    if hasattr(model, "organization_id") and getattr(user, "organization_id", None):
        return db.query(model).filter(model.organization_id == user.organization_id)
    if hasattr(model, "user_id"):
        return db.query(model).filter(model.user_id == user.id)
    if hasattr(model, "id"):
        return db.query(model).filter(model.id == user.id)
    return db.query(model)


def workspace_get(db, model, user, object_id: int):
    return workspace_query(db, model, user).filter(model.id == object_id).first()


def role_allows(user, minimum_role: str):
    current_role = (getattr(user, "role", None) or "owner").lower()
    return ROLE_RANK.get(current_role, 0) >= ROLE_RANK.get(minimum_role, 0)


def require_role(user, minimum_role: str):
    if not role_allows(user, minimum_role):
        raise HTTPException(status_code=403, detail=f"{minimum_role.title()} access required")


def can_edit_lead(user, lead):
    current_role = (getattr(user, "role", None) or "owner").lower()
    if current_role in {"owner", "admin"}:
        return True
    if getattr(lead, "owner_user_id", None) == user.id:
        return True
    return getattr(lead, "user_id", None) == user.id
