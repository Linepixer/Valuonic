from datetime import datetime, timedelta, timezone
import jwt

from app.config import settings

SESSION_TOKEN_TYPE = "access"
EMAIL_VERIFICATION_TOKEN_TYPE = "email_verification"
ACCOUNT_DELETION_TOKEN_TYPE = "account_deletion"

EMAIL_VERIFICATION_EXPIRE = timedelta(hours=48)
ACCOUNT_DELETION_EXPIRE = timedelta(hours=1)

def _encode(data: dict, expires_at: datetime) -> str:
    return jwt.encode({**data, "exp": expires_at}, settings.SECRET_KEY, algorithm=settings.ALGORITHM)

def create_token(data: dict, expires_delta: timedelta) -> str:
    return _encode(data, datetime.now(timezone.utc) + expires_delta)

def create_session_token(user_id, session_id, expires_at: datetime) -> str:
    return _encode(
        {"sub": str(user_id), "type": SESSION_TOKEN_TYPE, "sid": str(session_id)},
        expires_at,
    )

def create_email_verification_token(user_id) -> str:
    return create_token(
        {"sub": str(user_id), "type": EMAIL_VERIFICATION_TOKEN_TYPE},
        expires_delta=EMAIL_VERIFICATION_EXPIRE,
    )

def create_account_deletion_token(user_id) -> str:
    return create_token(
        {"sub": str(user_id), "type": ACCOUNT_DELETION_TOKEN_TYPE},
        expires_delta=ACCOUNT_DELETION_EXPIRE,
    )

def decode_token(token: str) -> dict:
    return jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
