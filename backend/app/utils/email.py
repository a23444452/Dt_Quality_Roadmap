import logging
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from app.config import settings

logger = logging.getLogger(__name__)

# Corning internal SMTP settings (no authentication required)
CORNING_SMTP_HOST = "smtphub.corning.com"
CORNING_SMTP_PORT = 25
DEFAULT_SENDER = "DtRoadmap@corning.com"


def send_email(to_emails: list[str], subject: str, body: str, sender: str | None = None) -> bool:
    """Send an HTML email to multiple recipients.

    For Corning internal network: uses smtphub.corning.com:25 without authentication.
    For external SMTP: requires smtp_host, smtp_user, smtp_password in settings.

    Returns True if email was sent successfully, False if sending failed.
    """
    if not to_emails:
        logger.info("No recipients provided, skipping email send")
        return False

    # Determine SMTP settings
    smtp_host = settings.smtp_host or CORNING_SMTP_HOST
    smtp_port = settings.smtp_port if settings.smtp_host else CORNING_SMTP_PORT
    from_email = sender or settings.smtp_sender or settings.smtp_user or DEFAULT_SENDER
    use_auth = bool(settings.smtp_host and settings.smtp_user and settings.smtp_password)

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = from_email
        msg["To"] = ", ".join(to_emails)

        html_part = MIMEText(body, "html", "utf-8")
        msg.attach(html_part)

        with smtplib.SMTP(smtp_host, smtp_port) as server:
            if use_auth:
                server.starttls()
                server.login(settings.smtp_user, settings.smtp_password)
            server.sendmail(from_email, to_emails, msg.as_string())

        logger.info(f"Email sent successfully to {len(to_emails)} recipients via {smtp_host}")
        return True

    except Exception as e:
        logger.error(f"Failed to send email: {e}")
        return False


def send_new_user_registration_notification(
    admin_emails: list[str],
    username: str,
    display_name: str,
    email: str,
) -> bool:
    """Send notification to admins when a new user registers."""
    base_url = settings.app_base_url.rstrip("/")
    subject = f"[D^t Roadmap] 新用戶註冊待審核: {username}"
    body = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            h2 {{ color: #1e40af; }}
            .info {{ background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 15px 0; }}
            .info p {{ margin: 5px 0; }}
            .btn {{ display: inline-block; background: #2563eb; color: white; padding: 10px 20px;
                    text-decoration: none; border-radius: 5px; margin-top: 15px; }}
            .btn:hover {{ background: #1d4ed8; }}
        </style>
    </head>
    <body>
        <div class="container">
            <h2>新用戶註冊通知</h2>
            <p>有新使用者註冊，等待您的審核：</p>
            <div class="info">
                <p><strong>顯示名稱：</strong>{display_name}</p>
                <p><strong>帳號：</strong>{username}</p>
                <p><strong>Email：</strong>{email}</p>
            </div>
            <p>請登入系統進行審核：</p>
            <a href="{base_url}/admin/users" class="btn">前往 User Management</a>
        </div>
    </body>
    </html>
    """
    return send_email(admin_emails, subject, body)


def send_user_approved_notification(user_email: str, username: str, display_name: str) -> bool:
    """Send notification to user when their registration is approved."""
    base_url = settings.app_base_url.rstrip("/")
    subject = "[D^t Roadmap] Your Account Has Been Approved"
    body = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            h2 {{ color: #16a34a; }}
            .info {{ background: #f0fdf4; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #16a34a; }}
            .info p {{ margin: 5px 0; }}
            .btn {{ display: inline-block; background: #16a34a; color: white; padding: 10px 20px;
                    text-decoration: none; border-radius: 5px; margin-top: 15px; }}
            .btn:hover {{ background: #15803d; }}
            .footer {{ margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; color: #666; font-size: 12px; }}
        </style>
    </head>
    <body>
        <div class="container">
            <h2>Account Approved</h2>
            <p>Hi {display_name},</p>
            <p>Congratulations! Your D^t Solution Roadmap account <strong>{username}</strong> has been approved and you can now log in to the system.</p>
            <p>For more details, please visit this page:</p>
            <a href="{base_url}/login" class="btn">Log In Now</a>
            <div class="footer">
                <p>Best regards,<br>D^t Solution Roadmap System</p>
                <p><em>Note: Replies to this email address are not monitored.</em></p>
            </div>
        </div>
    </body>
    </html>
    """
    return send_email([user_email], subject, body)


def send_user_rejected_notification(
    user_email: str, username: str, display_name: str, reason: str | None = None
) -> bool:
    """Send notification to user when their registration is rejected."""
    reason_text = f"<p><strong>Reason:</strong> {reason}</p>" if reason else ""
    subject = "[D^t Roadmap] Your Registration Has Been Rejected"
    body = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            h2 {{ color: #dc2626; }}
            .info {{ background: #fef2f2; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #dc2626; }}
            .info p {{ margin: 5px 0; }}
            .footer {{ margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; color: #666; font-size: 12px; }}
        </style>
    </head>
    <body>
        <div class="container">
            <h2>Registration Rejected</h2>
            <p>Hi {display_name},</p>
            <p>We regret to inform you that your D^t Solution Roadmap account <strong>{username}</strong> registration has not been approved.</p>
            <div class="info">
                {reason_text}
            </div>
            <p>If you have any questions, please contact the system administrator.</p>
            <div class="footer">
                <p>Best regards,<br>D^t Solution Roadmap System</p>
                <p><em>Note: Replies to this email address are not monitored.</em></p>
            </div>
        </div>
    </body>
    </html>
    """
    return send_email([user_email], subject, body)


def send_user_disabled_notification(user_email: str, username: str, display_name: str) -> bool:
    """Send notification to user when their account is disabled."""
    subject = "[D^t Roadmap] Your Account Has Been Disabled"
    body = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            h2 {{ color: #6b7280; }}
            .info {{ background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #6b7280; }}
            .info p {{ margin: 5px 0; }}
            .footer {{ margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; color: #666; font-size: 12px; }}
        </style>
    </head>
    <body>
        <div class="container">
            <h2>Account Disabled</h2>
            <p>Hi {display_name},</p>
            <p>Your D^t Solution Roadmap account <strong>{username}</strong> has been disabled by the administrator.</p>
            <p>You will no longer be able to log in to the system.</p>
            <p>If you believe this was done in error, please contact the system administrator.</p>
            <div class="footer">
                <p>Best regards,<br>D^t Solution Roadmap System</p>
                <p><em>Note: Replies to this email address are not monitored.</em></p>
            </div>
        </div>
    </body>
    </html>
    """
    return send_email([user_email], subject, body)
