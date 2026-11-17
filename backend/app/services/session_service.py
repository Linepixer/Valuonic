from datetime import datetime, timedelta, timezone
from uuid import UUID

from fastapi import Response
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.config import settings
from app.core import security
from app.models.user_session import UserSession

AUTH_COOKIE_NAME = "access_token"

# Sliding window: active users stay signed in indefinitely, idle sessions die after SESSION_LIFETIME.
SESSION_LIFETIME = timedelta(days=30)
# Renewing on every request would mean a DB write per call; once a day is enough for a 30-day window.
SESSION_RENEW_AFTER = timedelta(days=1)


def _now() -> datetime:
    return datetime.now(timezone.utc)


def set_auth_cookie(response: Response, session: UserSession) -> str:
    token = security.create_session_token(session.user_id, session.id, session.expires_at)
    response.set_cookie(
        key=AUTH_COOKIE_NAME,
        value=token,
        httponly=True,
        secure=settings.COOKIE_SECURE,
        samesite="lax",
        max_age=int(SESSION_LIFETIME.total_seconds()),
    )
    return token


def clear_auth_cookie(response: Response) -> None:
    response.delete_cookie(
        key=AUTH_COOKIE_NAME,
        httponly=True,
        secure=settings.COOKIE_SECURE,
        samesite="lax",
    )


def start_session(db: Session, response: Response, user_id: UUID) -> str:
    now = _now()
    db.query(UserSession).filter(
        UserSession.user_id == user_id,
        or_(UserSession.expires_at <= now, UserSession.revoked_at.isnot(None)),
    ).delete(synchronize_session=False)

    session = UserSession(user_id=user_id, expires_at=now + SESSION_LIFETIME)
    db.add(session)
    db.commit()
    db.refresh(session)
    return set_auth_cookie(response, session)


def get_active_session(db: Session, session_id: UUID, user_id: UUID) -> UserSession | None:
    return db.query(UserSession).filter(
        UserSession.id == session_id,
        UserSession.user_id == user_id,
        UserSession.revoked_at.is_(None),
        UserSession.expires_at > _now(),
    ).first()


def renew_if_due(db: Session, response: Response, session: UserSession) -> None:
    now = _now()
    if session.expires_at - now > SESSION_LIFETIME - SESSION_RENEW_AFTER:
        return
    session.expires_at = now + SESSION_LIFETIME
    db.commit()
    set_auth_cookie(response, session)


def revoke_session(db: Session, session_id: UUID) -> None:
    db.query(UserSession).filter(
        UserSession.id == session_id,
        UserSession.revoked_at.is_(None),
    ).update({UserSession.revoked_at: _now()}, synchronize_session=False)
    db.commit()


def revoke_all_sessions(db: Session, user_id: UUID, except_session_id: UUID | None = None) -> None:
    query = db.query(UserSession).filter(
        UserSession.user_id == user_id,
        UserSession.revoked_at.is_(None),
    )
    if except_session_id is not None:
        query = query.filter(UserSession.id != except_session_id)
    query.update({UserSession.revoked_at: _now()}, synchronize_session=False)
    db.commit()
