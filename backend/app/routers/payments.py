from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
import razorpay
from app.database import get_db
from app.services.auth import get_current_user
from app.config import settings
from pydantic import BaseModel

router = APIRouter(prefix="/payments", tags=["Payments"])
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

# Plans
PLANS = {
    "pro": {
        "name": "Pro Plan",
        "price": 99900,  # ₹999 in paise
        "credits": 100,
        "description": "100 AI credits per month"
    },
    "enterprise": {
        "name": "Enterprise Plan",
        "price": 299900,  # ₹2999 in paise
        "credits": 500,
        "description": "500 AI credits per month"
    }
}

class CreateOrderRequest(BaseModel):
    plan: str

class VerifyPaymentRequest(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str
    plan: str

# Create order
@router.post("/create-order")
def create_order(
    request: CreateOrderRequest,
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):
    user = get_current_user(token, db)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    if request.plan not in PLANS:
        raise HTTPException(status_code=400, detail="Invalid plan")

    plan = PLANS[request.plan]

    client = razorpay.Client(
        auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET)
    )

    order = client.order.create({
        "amount": plan["price"],
        "currency": "INR",
        "payment_capture": 1,
        "notes": {
            "user_id": str(user.id),
            "plan": request.plan
        }
    })

    return {
        "order_id": order["id"],
        "amount": plan["price"],
        "currency": "INR",
        "plan_name": plan["name"],
        "key_id": settings.RAZORPAY_KEY_ID
    }

# Verify payment
@router.post("/verify")
def verify_payment(
    request: VerifyPaymentRequest,
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):
    user = get_current_user(token, db)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    client = razorpay.Client(
        auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET)
    )

    # Verify signature
    try:
        client.utility.verify_payment_signature({
            "razorpay_order_id": request.razorpay_order_id,
            "razorpay_payment_id": request.razorpay_payment_id,
            "razorpay_signature": request.razorpay_signature
        })
    except Exception:
        raise HTTPException(status_code=400, detail="Payment verification failed")

    # Update user plan and credits
    plan = PLANS[request.plan]
    user.plan = request.plan
    user.ai_credits += plan["credits"]
    db.commit()

    return {
        "message": "Payment successful!",
        "plan": request.plan,
        "credits_added": plan["credits"],
        "total_credits": user.ai_credits
    }

# Get plans
@router.get("/plans")
def get_plans():
    return PLANS