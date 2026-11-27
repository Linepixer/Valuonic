import os
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from dotenv import load_dotenv

# Pull in environment variables from the root .env file
load_dotenv(dotenv_path="../.env")

class Settings:
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL", 
        "postgresql://valuonic:local_dev_pwd@localhost:5432/valuonic" # Local dev fallback
    )
    
    SECRET_KEY: str = os.getenv("SECRET_KEY")
    ALGORITHM: str = "HS256"

    ENV: str = os.getenv("ENV", "development")

    GOOGLE_CLIENT_ID: str = os.getenv("GOOGLE_CLIENT_ID", "")

    FRONTEND_URL: str = os.getenv("FRONTEND_URL", "")

    # Not TZ: docker-compose passes the .env to Postgres too, and on a fresh volume TZ would become the database's
    # timezone, shifting the dates of imported price history.
    APP_TIMEZONE: str = os.getenv("APP_TIMEZONE") or "America/Argentina/Buenos_Aires"

    # Fail secure: only an explicit plain-HTTP local frontend may receive the session cookie without the Secure flag.
    COOKIE_SECURE: bool = not FRONTEND_URL.startswith(("http://localhost", "http://127.0.0.1"))
    
    @property
    def ADMIN_EMAILS(self) -> list[str]:
        emails = os.getenv("ADMIN_EMAILS", "")
        return [e.strip() for e in emails.split(",") if e.strip()]

settings = Settings()

if not settings.SECRET_KEY:
    raise ValueError("CRITICAL SECURITY ERROR: You MUST set a SECRET_KEY in the .env file!")

try:
    ZoneInfo(settings.APP_TIMEZONE)
except (ZoneInfoNotFoundError, ValueError):
    raise ValueError(
        f"APP_TIMEZONE '{settings.APP_TIMEZONE}' is not a valid IANA timezone, e.g. America/Argentina/Buenos_Aires."
    )

# Keys that have been published in .env.example. Anyone can sign valid tokens with them, so they are only
# tolerated with a plain-HTTP localhost frontend, never on a real deployment.
PUBLISHED_EXAMPLE_SECRET_KEYS = {
    "dev-only-secret-key-do-not-use-in-production-000000",
    "your_super_secret_key_here",
}

if settings.COOKIE_SECURE and settings.SECRET_KEY in PUBLISHED_EXAMPLE_SECRET_KEYS:
    raise ValueError(
        "CRITICAL SECURITY ERROR: SECRET_KEY is the public example value from .env.example. "
        "Generate your own with: openssl rand -hex 32"
    )

# .env.example makes the local demo account an admin; its address and password are public, so the same rule applies.
DEMO_ADMIN_EMAIL = "demo@example.com"

if settings.COOKIE_SECURE and DEMO_ADMIN_EMAIL in settings.ADMIN_EMAILS:
    raise ValueError(
        f"CRITICAL SECURITY ERROR: ADMIN_EMAILS includes {DEMO_ADMIN_EMAIL}, the demo admin from .env.example. "
        "Replace it with your own email."
    )
