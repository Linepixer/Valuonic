from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from contextlib import asynccontextmanager
from app.api import users, auth, portfolio, transactions, assets, admin, corporate_events
from app.scheduler import start_scheduler, stop_scheduler

@asynccontextmanager
async def lifespan(app: FastAPI):
    start_scheduler()
    yield
    stop_scheduler()

from app.core.rate_limit import limiter

app = FastAPI(title="Valuonic API", lifespan=lifespan)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
import os

# Configurar CORS (fallback a localhost en dev)
cors_origins = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://localhost:3000").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(users.router)
app.include_router(portfolio.router)
app.include_router(transactions.router)
app.include_router(assets.router)
app.include_router(admin.router)
app.include_router(corporate_events.router)
@app.get("/")
def root():
    return {"message": "Valuonic API running"}