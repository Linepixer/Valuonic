from uuid import UUID

from fastapi import Depends, HTTPException, status, Request, Response
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from jwt.exceptions import InvalidTokenError

from app.database import get_db
from app.core import security
from app.models.user import User
from app.services import session_service

# OAuth2 scheme defining the login endpoint for Swagger
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login", auto_error=False)

def get_current_user(
    request: Request,
    response: Response,
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    # Try getting token from cookie first, fallback to header
    actual_token = request.cookies.get(session_service.AUTH_COOKIE_NAME) or token
    if not actual_token:
        raise credentials_exception

    try:
        payload = security.decode_token(actual_token)
        # Emailed tokens (verification, reset, deletion) share the signing key; only explicit session tokens may authenticate.
        if payload.get("type") != security.SESSION_TOKEN_TYPE:
            raise credentials_exception
        user_id = UUID(payload["sub"])
        session_id = UUID(payload["sid"])
    except (InvalidTokenError, KeyError, ValueError, TypeError):
        raise credentials_exception

    session = session_service.get_active_session(db, session_id, user_id)
    if session is None:
        raise credentials_exception

    user = db.query(User).filter(User.id == user_id).first()
    if user is None or not user.is_active:
        raise credentials_exception

    session_service.renew_if_due(db, response, session)
    request.state.session_id = session.id
    return user

def get_current_superadmin(current_user: User = Depends(get_current_user)):
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have enough privileges"
        )
    return current_user
