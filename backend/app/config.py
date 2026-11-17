import os
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

    # Fail secure: only an explicit plain-HTTP local frontend may receive the session cookie without the Secure flag.
    COOKIE_SECURE: bool = not FRONTEND_URL.startswith(("http://localhost", "http://127.0.0.1"))
    
    @property
    def ADMIN_EMAILS(self) -> list[str]:
        emails = os.getenv("ADMIN_EMAILS", "")
        return [e.strip() for e in emails.split(",") if e.strip()]

settings = Settings()

if not settings.SECRET_KEY:
    raise ValueError("CRITICAL SECURITY ERROR: You MUST set a SECRET_KEY in the .env file!")
