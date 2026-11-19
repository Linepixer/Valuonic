"""
Unauthenticated endpoints. They only read public market data from the database: nothing here may call
external price sources (that would let anyone trigger scraping) or touch user data.
"""
import json
import threading
import time

from fastapi import APIRouter, Depends, Request, Response
from sqlalchemy.orm import Session

from app.core.rate_limit import limiter
from app.database import get_db
from app.services.market_data import build_market_data

router = APIRouter(prefix="/public", tags=["public"])

# Built at most once an hour, so a burst of fresh clones costs a single query; the rate limit is only for abuse.
CACHE_SECONDS = 3600
_cache = {"body": None, "expires_at": 0.0}
_cache_lock = threading.Lock()


@router.get("/market-data")
@limiter.limit("60/hour")
def get_market_data(request: Request, db: Session = Depends(get_db)):
    with _cache_lock:
        if _cache["body"] is None or time.monotonic() >= _cache["expires_at"]:
            _cache["body"] = json.dumps(build_market_data(db), separators=(",", ":")).encode()
            _cache["expires_at"] = time.monotonic() + CACHE_SECONDS
        body = _cache["body"]
    return Response(content=body, media_type="application/json", headers={"Cache-Control": f"public, max-age={CACHE_SECONDS}"})
