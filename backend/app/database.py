from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

from app.config import settings

# Database connection URL (read from .env)
DATABASE_URL = settings.DATABASE_URL

# SQLAlchemy Engine. UTC sessions whatever the server's setting: prices, corporate events and birth dates mark their
# day at 00:00 UTC, so reading them in any other zone would move them to the day before.
engine = create_engine(DATABASE_URL, connect_args={"options": "-c timezone=UTC"})

# Session factory
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

# Base model class
Base = declarative_base()


# FastAPI Dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()