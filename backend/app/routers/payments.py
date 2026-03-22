import hashlib
import hmac
import json
from datetime import datetime, timezone

import razorpay
from fastapi import APIRouter, Depends, Header, HTTPException, Request
from fastapi.security import OAuth2PasswordBearer
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models.billing import BillingEvent, BillingSubscription
from app.models.user import User
from app.services.auth import get_current_user

router = APIRouter(prefix="/payments", tags=["Payments"])
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

PLANS = {
    "packs": {
        "pro": {
            "name": "Growth Pack",
            "price": 99900,
            "credits": 100,
            "description": "One-time purchase with 100 AI credits",
            "billing_type": "one_time",
            "cta": "Best for solo closers",
        },
        "enterprise": {
            "name": "Scale Pack",
            "price": 299900,
            "credits": 500,
            "description": "One-time purchase with 500 AI credits",
            "billing_type": "one_time",
            "cta": "Best for heavy outbound and small teams",
        },
    },
    "subscriptions": {
        "starter_monthly": {
            "name": "Starter Monthly",
            "price": 199900,
            "credits": 250,
            "description": "Recurring monthly credits for consistent outbound",
            "billing_type": "subscription",
            "interval": "monthly",
            "period": 1,
            "total_count": 120,
            "cta": "For reps who need the AI stack every month",
        },
        "pro_monthly": {
            "name": "Pro Monthly",
            "price": 499900,
            "credits": 1000,
            "description": "Recurring monthly credits for serious teams",
            "billing_type": "subscription",
            "interval": "monthly",
            "period": 1,
            "total_count": 120,
            "cta": "For founders and teams building an AI-first sales motion",
        },
    },
}


class CreateOrderRequest(BaseModel):
    plan: str


class VerifyPaymentRequest(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str
    plan: str


class CreateSubscriptionRequest(BaseModel):
    plan: str


class VerifySubscriptionRequest(BaseModel):
    razorpay_payment_id: str
    razorpay_subscription_id: str
    razorpay_signature: str
    plan: str


def _razorpay_client():
    return razorpay.Client(
        auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET)
    )


def _now_utc():
    return datetime.now(timezone.utc)


def _find_plan(plan_code: str):
    if plan_code in PLANS["packs"]:
        return "pack", PLANS["packs"][plan_code]
    if plan_code in PLANS["subscriptions"]:
        return "subscription", PLANS["subscriptions"][plan_code]
    return None, None


def _ensure_not_processed(db: Session, external_id: str):
    existing = db.query(BillingEvent).filter(BillingEvent.external_id == external_id).first()
    return existing is None


def _record_event(db: Session, user_id: int | None, event_type: str, external_id: str, payload: dict):
    event = BillingEvent(
        user_id=user_id,
        event_type=event_type,
        external_id=external_id,
        payload=json.dumps(payload),
    )
    db.add(event)
    return event


def _grant_credits(db: Session, user: User, amount: int):
    user.ai_credits += amount


def _unix_to_datetime(value):
    if not value:
        return None
    return datetime.fromtimestamp(value, tz=timezone.utc)


@router.get("/plans")
def get_plans():
    return PLANS


@router.post("/create-order")
def create_order(
    request: CreateOrderRequest,
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):
    user = get_current_user(token, db)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    plan_type, plan = _find_plan(request.plan)
    if not plan or plan_type != "pack":
        raise HTTPException(status_code=400, detail="Invalid one-time plan")

    order = _razorpay_client().order.create({
        "amount": plan["price"],
        "currency": "INR",
        "payment_capture": 1,
        "notes": {
            "user_id": str(user.id),
            "plan": request.plan,
            "billing_type": "pack",
        },
    })

    return {
        "mode": "pack",
        "order_id": order["id"],
        "amount": plan["price"],
        "currency": "INR",
        "plan_name": plan["name"],
        "key_id": settings.RAZORPAY_KEY_ID,
    }


@router.post("/verify")
def verify_payment(
    request: VerifyPaymentRequest,
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):
    user = get_current_user(token, db)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    plan_type, plan = _find_plan(request.plan)
    if not plan or plan_type != "pack":
        raise HTTPException(status_code=400, detail="Invalid one-time plan")

    try:
        _razorpay_client().utility.verify_payment_signature({
            "razorpay_order_id": request.razorpay_order_id,
            "razorpay_payment_id": request.razorpay_payment_id,
            "razorpay_signature": request.razorpay_signature,
        })
    except Exception:
        raise HTTPException(status_code=400, detail="Payment verification failed")

    if _ensure_not_processed(db, request.razorpay_payment_id):
        _grant_credits(db, user, plan["credits"])
        _record_event(
            db,
            user.id,
            "pack_payment_verified",
            request.razorpay_payment_id,
            request.model_dump(),
        )
        user.plan = request.plan
        db.commit()

    return {
        "message": "Payment successful!",
        "plan": request.plan,
        "plan_name": plan["name"],
        "credits_added": plan["credits"],
        "total_credits": user.ai_credits,
    }


@router.post("/create-subscription")
def create_subscription(
    request: CreateSubscriptionRequest,
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):
    user = get_current_user(token, db)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    plan_type, plan = _find_plan(request.plan)
    if not plan or plan_type != "subscription":
        raise HTTPException(status_code=400, detail="Invalid subscription plan")

    client = _razorpay_client()
    provider_plan = client.plan.create({
        "period": plan["period"],
        "interval": plan["interval"],
        "item": {
            "name": plan["name"],
            "amount": plan["price"],
            "currency": "INR",
            "description": plan["description"],
        },
        "notes": {
            "app_plan": request.plan,
        },
    })

    subscription = client.subscription.create({
        "plan_id": provider_plan["id"],
        "total_count": plan["total_count"],
        "quantity": 1,
        "customer_notify": 1,
        "addons": [],
        "notes": {
            "user_id": str(user.id),
            "plan": request.plan,
            "billing_type": "subscription",
            "credits_per_cycle": str(plan["credits"]),
        },
    })

    db_subscription = BillingSubscription(
        user_id=user.id,
        plan_code=request.plan,
        provider_subscription_id=subscription["id"],
        status=subscription.get("status", "created"),
    )
    db.add(db_subscription)
    db.commit()

    return {
        "mode": "subscription",
        "subscription_id": subscription["id"],
        "plan_name": plan["name"],
        "amount": plan["price"],
        "currency": "INR",
        "key_id": settings.RAZORPAY_KEY_ID,
    }


@router.post("/verify-subscription")
def verify_subscription(
    request: VerifySubscriptionRequest,
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):
    user = get_current_user(token, db)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    plan_type, plan = _find_plan(request.plan)
    if not plan or plan_type != "subscription":
        raise HTTPException(status_code=400, detail="Invalid subscription plan")

    try:
        _razorpay_client().utility.verify_subscription_payment_signature({
            "razorpay_payment_id": request.razorpay_payment_id,
            "razorpay_subscription_id": request.razorpay_subscription_id,
            "razorpay_signature": request.razorpay_signature,
        })
    except Exception:
        raise HTTPException(status_code=400, detail="Subscription verification failed")

    db_subscription = db.query(BillingSubscription).filter(
        BillingSubscription.provider_subscription_id == request.razorpay_subscription_id
    ).first()
    if not db_subscription:
        db_subscription = BillingSubscription(
            user_id=user.id,
            plan_code=request.plan,
            provider_subscription_id=request.razorpay_subscription_id,
            status="active",
        )
        db.add(db_subscription)

    if _ensure_not_processed(db, request.razorpay_payment_id):
        _grant_credits(db, user, plan["credits"])
        _record_event(
            db,
            user.id,
            "subscription_payment_verified",
            request.razorpay_payment_id,
            request.model_dump(),
        )

    user.plan = request.plan
    user.subscription_plan = request.plan
    user.subscription_status = "active"
    user.razorpay_subscription_id = request.razorpay_subscription_id
    db_subscription.status = "active"
    db_subscription.current_start = _now_utc()
    db.commit()

    return {
        "message": "Subscription activated!",
        "plan": request.plan,
        "plan_name": plan["name"],
        "credits_added": plan["credits"],
        "total_credits": user.ai_credits,
    }


@router.get("/subscription-status")
def subscription_status(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):
    user = get_current_user(token, db)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    subscription = None
    if user.razorpay_subscription_id:
        subscription = db.query(BillingSubscription).filter(
            BillingSubscription.provider_subscription_id == user.razorpay_subscription_id
        ).first()

    return {
        "plan": user.plan,
        "subscription_status": user.subscription_status,
        "subscription_plan": user.subscription_plan,
        "subscription_id": user.razorpay_subscription_id,
        "current_end": subscription.current_end.isoformat() if subscription and subscription.current_end else None,
        "ai_credits": user.ai_credits,
    }


@router.post("/webhook")
async def razorpay_webhook(
    request: Request,
    db: Session = Depends(get_db),
    x_razorpay_signature: str | None = Header(default=None),
):
    if not settings.RAZORPAY_WEBHOOK_SECRET:
        raise HTTPException(status_code=400, detail="Webhook secret not configured")

    raw_body = await request.body()
    expected_signature = hmac.new(
        settings.RAZORPAY_WEBHOOK_SECRET.encode(),
        raw_body,
        hashlib.sha256,
    ).hexdigest()

    if not x_razorpay_signature or not hmac.compare_digest(expected_signature, x_razorpay_signature):
        raise HTTPException(status_code=400, detail="Invalid webhook signature")

    payload = json.loads(raw_body.decode("utf-8"))
    event_name = payload.get("event", "")
    subscription_entity = payload.get("payload", {}).get("subscription", {}).get("entity", {})
    payment_entity = payload.get("payload", {}).get("payment", {}).get("entity", {})
    provider_subscription_id = subscription_entity.get("id") or payment_entity.get("subscription_id")
    external_event_id = payment_entity.get("id") or payload.get("event") + "-" + (provider_subscription_id or "unknown")

    if not _ensure_not_processed(db, external_event_id):
        return {"status": "ignored", "reason": "already processed"}

    db_subscription = None
    user = None
    if provider_subscription_id:
        db_subscription = db.query(BillingSubscription).filter(
            BillingSubscription.provider_subscription_id == provider_subscription_id
        ).first()
        if db_subscription:
            user = db.query(User).filter(User.id == db_subscription.user_id).first()

    _record_event(db, user.id if user else None, event_name, external_event_id, payload)

    if user and db_subscription:
        if event_name in ["subscription.activated", "subscription.authenticated", "subscription.resumed"]:
            user.subscription_status = "active"
            db_subscription.status = "active"
        elif event_name in ["subscription.paused"]:
            user.subscription_status = "paused"
            db_subscription.status = "paused"
        elif event_name in ["subscription.cancelled", "subscription.completed", "subscription.halted"]:
            user.subscription_status = "cancelled"
            db_subscription.status = "cancelled"

        if subscription_entity:
            db_subscription.current_start = _unix_to_datetime(subscription_entity.get("current_start"))
            db_subscription.current_end = _unix_to_datetime(subscription_entity.get("current_end"))
            user.subscription_current_end = db_subscription.current_end

        if event_name in ["subscription.charged", "payment.captured"]:
            plan_code = db_subscription.plan_code
            _, plan = _find_plan(plan_code)
            if plan:
                _grant_credits(db, user, plan["credits"])
                user.plan = plan_code
                user.subscription_plan = plan_code
                user.subscription_status = "active"
                user.razorpay_subscription_id = provider_subscription_id

    db.commit()
    return {"status": "processed", "event": event_name}
