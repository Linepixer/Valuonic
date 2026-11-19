from sqlalchemy.orm import Session

from app.core.asset_catalog import SUPPORTED_ASSETS
from app.models.asset import Asset


def _new_asset(ticker: str) -> Asset:
    spec = SUPPORTED_ASSETS[ticker]
    return Asset(ticker=ticker, name=spec["name"], type=spec["type"], currency="USD")


def get_or_create_catalog_asset(db: Session, ticker: str) -> Asset:
    asset = db.query(Asset).filter(Asset.ticker == ticker).first()
    if asset:
        return asset
    asset = _new_asset(ticker)
    db.add(asset)
    db.commit()
    db.refresh(asset)
    return asset


def ensure_catalog_assets(db: Session) -> int:
    """Adds the catalog assets missing from the table and returns how many were added."""
    existing = {ticker for (ticker,) in db.query(Asset.ticker).all()}
    missing = [ticker for ticker in SUPPORTED_ASSETS if ticker not in existing]
    for ticker in missing:
        db.add(_new_asset(ticker))
    if missing:
        db.commit()
    return len(missing)
