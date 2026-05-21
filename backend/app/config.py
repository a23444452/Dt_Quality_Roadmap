from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "sqlite:///./dev.db"
    jwt_secret: str = "change-me"
    jwt_expiry_hours: int = 8
    jwt_refresh_expiry_days: int = 7
    cors_origins: str = "http://localhost:5173"
    app_base_url: str = "http://localhost:5173"  # Frontend URL for email links
    smtp_host: str = ""  # Leave empty to use Corning internal SMTP (smtphub.corning.com)
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_password: str = ""
    smtp_sender: str = ""  # Email sender address (default: DtRoadmap@corning.com)
    admin_notification_emails: str = ""  # Comma-separated admin emails for notifications (if empty, query from DB)
    azure_ad_client_id: str = ""
    azure_ad_tenant_id: str = ""

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8", "extra": "ignore"}


settings = Settings()
