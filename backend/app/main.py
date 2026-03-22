from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import inspect, text

from app.config import settings
from app.database import Base, engine
from app.routers import auth, ai, leads, payments, dashboard, capture, activities, tasks
from app.models import user, lead, credits, activity, billing, task


SQLITE_COMPAT_COLUMNS = {
    "users": {
        "plan": "ALTER TABLE users ADD COLUMN plan VARCHAR DEFAULT 'free'",
        "ai_credits": "ALTER TABLE users ADD COLUMN ai_credits INTEGER DEFAULT 25",
        "subscription_status": "ALTER TABLE users ADD COLUMN subscription_status VARCHAR DEFAULT 'inactive'",
        "subscription_plan": "ALTER TABLE users ADD COLUMN subscription_plan VARCHAR",
        "razorpay_customer_id": "ALTER TABLE users ADD COLUMN razorpay_customer_id VARCHAR",
        "razorpay_subscription_id": "ALTER TABLE users ADD COLUMN razorpay_subscription_id VARCHAR",
        "subscription_current_end": "ALTER TABLE users ADD COLUMN subscription_current_end DATETIME",
        "is_onboarded": "ALTER TABLE users ADD COLUMN is_onboarded BOOLEAN DEFAULT 0",
        "onboarding_step": "ALTER TABLE users ADD COLUMN onboarding_step INTEGER DEFAULT 0",
        "updated_at": "ALTER TABLE users ADD COLUMN updated_at DATETIME",
    },
    "leads": {
        "score": "ALTER TABLE leads ADD COLUMN score FLOAT DEFAULT 0",
        "predicted_revenue": "ALTER TABLE leads ADD COLUMN predicted_revenue FLOAT DEFAULT 0",
        "follow_up_date": "ALTER TABLE leads ADD COLUMN follow_up_date VARCHAR",
        "health_score": "ALTER TABLE leads ADD COLUMN health_score FLOAT DEFAULT 50",
        "health_status": "ALTER TABLE leads ADD COLUMN health_status VARCHAR DEFAULT 'Warm'",
        "updated_at": "ALTER TABLE leads ADD COLUMN updated_at DATETIME",
        "last_activity_at": "ALTER TABLE leads ADD COLUMN last_activity_at DATETIME",
        "relationship_score": "ALTER TABLE leads ADD COLUMN relationship_score INTEGER DEFAULT 50",
    },
    "tasks": {
        "kind": "ALTER TABLE tasks ADD COLUMN kind VARCHAR DEFAULT 'task'",
        "priority": "ALTER TABLE tasks ADD COLUMN priority VARCHAR DEFAULT 'medium'",
        "status": "ALTER TABLE tasks ADD COLUMN status VARCHAR DEFAULT 'open'",
        "channel": "ALTER TABLE tasks ADD COLUMN channel VARCHAR",
        "subject": "ALTER TABLE tasks ADD COLUMN subject VARCHAR",
        "content": "ALTER TABLE tasks ADD COLUMN content TEXT",
        "due_at": "ALTER TABLE tasks ADD COLUMN due_at DATETIME",
        "sequence_step": "ALTER TABLE tasks ADD COLUMN sequence_step INTEGER",
        "completed_at": "ALTER TABLE tasks ADD COLUMN completed_at DATETIME",
    },
}


def sync_sqlite_schema():
    if not settings.DATABASE_URL.startswith("sqlite"):
        return

    inspector = inspect(engine)
    with engine.begin() as connection:
        for table_name, columns in SQLITE_COMPAT_COLUMNS.items():
            if not inspector.has_table(table_name):
                continue

            existing_columns = {column["name"] for column in inspector.get_columns(table_name)}
            for column_name, statement in columns.items():
                if column_name not in existing_columns:
                    connection.execute(text(statement))


Base.metadata.create_all(bind=engine)
sync_sqlite_schema()

cors_origins = [origin.strip() for origin in settings.CORS_ORIGINS.split(",") if origin.strip()]
if settings.DEBUG and "http://127.0.0.1:5173" not in cors_origins:
    cors_origins.append("http://127.0.0.1:5173")

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="AI-powered Sales Operating System"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins if cors_origins else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(ai.router)
app.include_router(leads.router)
app.include_router(payments.router)
app.include_router(dashboard.router)
app.include_router(capture.router)
app.include_router(activities.router)
app.include_router(tasks.router)

@app.get("/")
def root():
    return {
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "status": "running"
    }

@app.get("/health")
def health_check():
    return {"status": "healthy"}
