from fastapi import APIRouter, Depends, HTTPException, status, Response, Request
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.database import get_db
from app.services import user_service, session_service
from app.core import security
from app.core.rate_limit import limiter
from app.config import settings
from app.utils.email import send_verification_email, send_password_reset_email
from app.models.user import User
from pydantic import BaseModel
from uuid import UUID
import jwt
import requests
from datetime import timedelta

router = APIRouter(
    tags=["authentication"]
)

@router.post("/login")
@limiter.limit("20/minute")
def login(
    request: Request,
    response: Response,
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    user = user_service.get_user_by_email(db, email=form_data.username)
    
    # Generic error message to prevent email enumeration
    if not user or not user_service.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is disabled. Please contact support."
        )
        
    # Soft block unverified users so they can still request a new verification email
    if not user.is_verified:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="not_verified"
        )
    
    access_token = session_service.start_session(db, response, user.id)

    return {"access_token": access_token, "token_type": "bearer"}

@router.post("/logout")
def logout(request: Request, response: Response, db: Session = Depends(get_db)):
    token = request.cookies.get(session_service.AUTH_COOKIE_NAME)
    if token:
        try:
            payload = security.decode_token(token)
            if payload.get("type") == security.SESSION_TOKEN_TYPE:
                session_service.revoke_session(db, UUID(payload["sid"]))
        except (jwt.PyJWTError, KeyError, ValueError, TypeError):
            pass
    session_service.clear_auth_cookie(response)
    return {"message": "Logged out successfully"}

class ResendVerificationRequest(BaseModel):
    email: str

@router.post("/resend-verification")
@limiter.limit("3/minute")
def resend_verification(request: Request, body: ResendVerificationRequest, db: Session = Depends(get_db)):
    user = user_service.get_user_by_email(db, email=body.email)
    if not user:
        # Don't leak whether the email exists in our DB
        return {"message": "Si la cuenta existe, se ha enviado un correo."}
        
    if user.is_verified:
        return {"message": "Esta cuenta ya está verificada."}
        
    token = security.create_email_verification_token(user.id)
    send_verification_email(user.email, token)
    return {"message": "Correo enviado con éxito."}

@router.post("/verify")
@limiter.limit("3/minute")
def verify_email(request: Request, token: str, response: Response, db: Session = Depends(get_db)):
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id: str = payload.get("sub")
        token_type: str = payload.get("type")
        
        if user_id is None or token_type != security.EMAIL_VERIFICATION_TOKEN_TYPE:
            raise HTTPException(status_code=400, detail="Token inválido")
            
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="Usuario no encontrado")
            
        if user.is_verified:
            return {"message": "Cuenta ya verificada"}
            
        user.is_verified = True
        db.commit()
        
        # Automatically log the user in so they don't have to type their credentials again
        access_token = session_service.start_session(db, response, user.id)
        return {"message": "Cuenta verificada con éxito", "access_token": access_token, "token_type": "bearer"}
        
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=400, detail="El link ha expirado")
    except jwt.PyJWTError:
        raise HTTPException(status_code=400, detail="Token inválido")

class ForgotPasswordRequest(BaseModel):
    email: str

@router.post("/forgot-password")
@limiter.limit("3/minute")
def forgot_password(request: Request, body: ForgotPasswordRequest, db: Session = Depends(get_db)):
    user = user_service.get_user_by_email(db, email=body.email)
    if not user:
        # Always return success to prevent email enumeration attacks
        return {"message": "Si la cuenta existe, se ha enviado un correo con instrucciones."}
    
    # Tie the reset token to the current password hash so it invalidates immediately after a successful reset
    token = security.create_token(
        data={
            "sub": str(user.id), 
            "type": "password_reset",
            "salt": user.hashed_password[-10:] if user.hashed_password else ""
        },
        expires_delta=timedelta(hours=24)
    )
    
    send_password_reset_email(user.email, token)
    return {"message": "Si la cuenta existe, se ha enviado un correo con instrucciones."}

@router.get("/reset-password/validate")
@limiter.limit("20/minute")
def validate_reset_token(request: Request, token: str, db: Session = Depends(get_db)):
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id: str = payload.get("sub")
        token_type: str = payload.get("type")
        salt: str = payload.get("salt")
        
        if user_id is None or token_type != "password_reset":
            raise HTTPException(status_code=400, detail="Token inválido")
            
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="Usuario no encontrado")
            
        current_salt = user.hashed_password[-10:] if user.hashed_password else ""
        if salt is not None and salt != current_salt:
            raise HTTPException(status_code=400, detail="Este enlace ya ha sido utilizado")
            
        return {"valid": True}
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=400, detail="El enlace ha expirado")
    except jwt.PyJWTError:
        raise HTTPException(status_code=400, detail="Token inválido")

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str

@router.post("/reset-password")
@limiter.limit("20/minute")
def reset_password(request: Request, body: ResetPasswordRequest, response: Response, db: Session = Depends(get_db)):
    try:
        payload = jwt.decode(body.token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id: str = payload.get("sub")
        token_type: str = payload.get("type")
        salt: str = payload.get("salt")
        
        if user_id is None or token_type != "password_reset":
            raise HTTPException(status_code=400, detail="Token inválido")
            
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="Usuario no encontrado")
            
        # Ensure the token hasn't been used by comparing the salt against the current password
        current_salt = user.hashed_password[-10:] if user.hashed_password else ""
        if salt is not None and salt != current_salt:
            raise HTTPException(status_code=400, detail="Este enlace ya ha sido utilizado")
            
        user.hashed_password = user_service.get_password_hash(body.new_password)
        db.commit()

        # A reset usually means the old password may be compromised: sign out every device.
        session_service.revoke_all_sessions(db, user.id)

        # Drop them straight into their dashboard
        access_token = session_service.start_session(db, response, user.id)
        return {"message": "Contraseña actualizada con éxito", "access_token": access_token, "token_type": "bearer"}
        
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=400, detail="El link ha expirado")
    except jwt.PyJWTError:
        raise HTTPException(status_code=400, detail="Token inválido")

GOOGLE_TOKENINFO_URL = "https://oauth2.googleapis.com/tokeninfo"
GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo"
GOOGLE_TIMEOUT_SECONDS = 5

class GoogleToken(BaseModel):
    token: str

def _invalid_google_token() -> HTTPException:
    return HTTPException(status_code=401, detail="Token de Google inválido")

def _fetch_google_profile(access_token: str) -> dict:
    # Name and picture are cosmetic, so a userinfo failure must not block the login.
    try:
        resp = requests.get(
            GOOGLE_USERINFO_URL,
            headers={"Authorization": f"Bearer {access_token}"},
            timeout=GOOGLE_TIMEOUT_SECONDS,
        )
        return resp.json() if resp.status_code == 200 else {}
    except (requests.RequestException, ValueError):
        return {}

@router.post("/google")
@limiter.limit("20/minute")
def google_auth(
    request: Request,
    token_data: GoogleToken,
    response: Response,
    db: Session = Depends(get_db)
):
    if not settings.GOOGLE_CLIENT_ID:
        raise HTTPException(status_code=503, detail="El inicio de sesión con Google no está disponible")

    try:
        info_resp = requests.get(
            GOOGLE_TOKENINFO_URL,
            params={"access_token": token_data.token},
            timeout=GOOGLE_TIMEOUT_SECONDS,
        )
        token_info = info_resp.json() if info_resp.status_code == 200 else None
    except (requests.RequestException, ValueError):
        raise HTTPException(status_code=503, detail="No se pudo validar el token con Google")

    if not token_info:
        raise _invalid_google_token()

    # Any Google app can mint access tokens for its users; accepting one issued to another
    # client would let that app sign in to Valuonic as those users.
    if token_info.get("aud") != settings.GOOGLE_CLIENT_ID:
        raise _invalid_google_token()

    email = token_info.get("email")
    google_id = token_info.get("sub")
    if not email or not google_id or str(token_info.get("email_verified")).lower() != "true":
        raise _invalid_google_token()

    user = db.query(User).filter(User.email == email).first()

    if user:
        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Account is disabled. Please contact support."
            )

        if user.google_id and user.google_id != google_id:
            raise _invalid_google_token()

        if not user.google_id:
            if not user.is_verified:
                # Nobody proved ownership of this email at signup, so a password set back then may
                # belong to someone else (pre-account hijacking). Google now proves ownership: drop it.
                user.hashed_password = None
            user.google_id = google_id
            user.auth_provider = "google"
            user.is_verified = True
            if not user.picture:
                user.picture = _fetch_google_profile(token_data.token).get("picture")
            db.commit()
            db.refresh(user)
    else:
        profile = _fetch_google_profile(token_data.token)
        user = User(
            email=email,
            name=profile.get("name"),
            hashed_password=None,
            is_verified=True,
            auth_provider="google",
            google_id=google_id,
            picture=profile.get("picture")
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    access_token = session_service.start_session(db, response, user.id)

    return {"access_token": access_token, "token_type": "bearer", "user_id": str(user.id)}
