from fastapi import APIRouter, Depends, HTTPException, status, Response, Request
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.database import get_db
from app.services import user_service
from app.core import security
from app.core.rate_limit import limiter
from app.config import settings
from app.utils.email import send_verification_email, send_password_reset_email
from app.models.user import User
import jwt
from datetime import timedelta

router = APIRouter(
    tags=["authentication"]
)

def set_auth_cookie(response: Response, token: str):
    # samesite='lax' allows cross-site top level navigations but prevents CSRF
    # secure=True should be used in production, but for local dev we can omit it if not on HTTPS
    is_prod = getattr(settings, 'ENVIRONMENT', 'dev') == 'production'
    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,
        secure=is_prod,
        samesite="lax",
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
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
    
    access_token = security.create_access_token(
        data={"sub": str(user.id)}
    )
    
    set_auth_cookie(response, access_token)
    
    return {"access_token": access_token, "token_type": "bearer"}

@router.post("/logout")
def logout(response: Response):
    response.delete_cookie(
        key="access_token",
        httponly=True,
        samesite="lax",
        secure=getattr(settings, 'ENVIRONMENT', 'dev') == 'production'
    )
    return {"message": "Logged out successfully"}

from pydantic import BaseModel
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
        
    token = security.create_access_token(data={"sub": str(user.id), "type": "email_verification"})
    send_verification_email(user.email, token)
    return {"message": "Correo enviado con éxito."}

@router.post("/verify")
@limiter.limit("3/minute")
def verify_email(request: Request, token: str, response: Response, db: Session = Depends(get_db)):
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id: str = payload.get("sub")
        token_type: str = payload.get("type")
        
        if user_id is None or token_type != "email_verification":
            raise HTTPException(status_code=400, detail="Token inválido")
            
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="Usuario no encontrado")
            
        if user.is_verified:
            access_token = security.create_access_token(data={"sub": str(user.id)})
            set_auth_cookie(response, access_token)
            return {"message": "Cuenta ya verificada", "access_token": access_token, "token_type": "bearer"}
            
        user.is_verified = True
        db.commit()
        
        # Automatically log the user in so they don't have to type their credentials again
        access_token = security.create_access_token(data={"sub": str(user.id)})
        set_auth_cookie(response, access_token)
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
    token = security.create_access_token(
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
        
        # Drop them straight into their dashboard
        access_token = security.create_access_token(data={"sub": str(user.id)})
        set_auth_cookie(response, access_token)
        return {"message": "Contraseña actualizada con éxito", "access_token": access_token, "token_type": "bearer"}
        
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=400, detail="El link ha expirado")
    except jwt.PyJWTError:
        raise HTTPException(status_code=400, detail="Token inválido")
