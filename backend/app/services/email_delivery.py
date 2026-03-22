import smtplib
import uuid
from email.message import EmailMessage

from app.config import settings


def smtp_is_configured() -> bool:
    return bool(settings.SMTP_EMAIL and settings.SMTP_PASSWORD and settings.SMTP_HOST and settings.SMTP_PORT)


def build_tracking_token() -> str:
    return uuid.uuid4().hex


def send_email_with_tracking(recipient_email: str, subject: str, body: str, tracking_url: str):
    if not smtp_is_configured():
        return False, "logged"

    html_body = (
        f"<div style='white-space: pre-wrap; font-family: Arial, sans-serif;'>{body}</div>"
        f"<img src='{tracking_url}' width='1' height='1' alt='' style='display:none;' />"
    )

    message = EmailMessage()
    message["Subject"] = subject
    message["From"] = f"{settings.SMTP_FROM_NAME} <{settings.SMTP_EMAIL}>"
    message["To"] = recipient_email
    message.set_content(body)
    message.add_alternative(html_body, subtype="html")

    server = smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT)
    try:
        if settings.SMTP_USE_TLS:
            server.starttls()
        server.login(settings.SMTP_EMAIL, settings.SMTP_PASSWORD)
        server.send_message(message)
    finally:
        server.quit()

    return True, "sent"
