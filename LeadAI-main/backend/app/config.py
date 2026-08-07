import os
from pydantic_settings import BaseSettings
from dotenv import load_dotenv

load_dotenv()

class Settings(BaseSettings):
    PROJECT_NAME: str = "LeadAI Internal Lead Tool"
    SECRET_KEY: str = os.getenv("JWT_SECRET") or os.getenv("SECRET_KEY", "leadai-internal-company-secret-key-2026")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 30  # 30 days

    # Database (Absolute SQLite Path Resolution)
    @property
    def DATABASE_URL(self) -> str:
        raw_url = os.getenv("DATABASE_URL", "sqlite:///./leadai.db")
        if raw_url.startswith("sqlite:///./") or raw_url == "sqlite:///leadai.db":
            base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
            db_path = os.path.join(base_dir, "leadai.db").replace("\\", "/")
            return f"sqlite:///{db_path}"
        return raw_url

    # API Keys (Loaded strictly from .env)
    APIFY_TOKEN: str = os.getenv("APIFY_TOKEN") or os.getenv("APIFY_API_TOKEN", "")
    APIFY_API_TOKEN: str = os.getenv("APIFY_TOKEN") or os.getenv("APIFY_API_TOKEN", "")
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")

    # Server-Side SMTP Email Configuration (Loaded strictly from .env)
    SMTP_HOST: str = os.getenv("SMTP_HOST", "smtp.hostinger.com")
    SMTP_PORT: int = int(os.getenv("SMTP_PORT", "587"))
    SMTP_USER: str = os.getenv("SMTP_USER", "")
    SMTP_PASS: str = os.getenv("SMTP_PASS") or os.getenv("SMTP_PASSWORD", "")
    EMAIL_FROM: str = os.getenv("EMAIL_FROM") or os.getenv("SMTP_FROM", "")

    # Company Internal Settings (defaults)
    COMPANY_NAME: str = os.getenv("COMPANY_NAME", "Internal LeadAI Agency")
    COMPANY_EMAIL: str = os.getenv("COMPANY_EMAIL", "admin@company.internal")
    DEFAULT_SENDER_NAME: str = os.getenv("DEFAULT_SENDER_NAME", "Lead Generation Team")

    class Config:
        case_sensitive = True

settings = Settings()
