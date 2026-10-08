import uuid
from sqlalchemy import Column, String, Boolean, DateTime, Integer
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from app.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    name = Column(String(100), nullable=True)
    birth_date = Column(DateTime, nullable=True)
    country = Column(String(100), nullable=True)
    hashed_password = Column(String(255), nullable=True)
    auth_provider = Column(String(50), default="local", nullable=False)
    google_id = Column(String(255), unique=True, index=True, nullable=True)
    picture = Column(String(512), nullable=True)
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    @property
    def is_admin(self) -> bool:
        from app.config import settings
        return self.email in settings.ADMIN_EMAILS
