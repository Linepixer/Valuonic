"""
Public market-data snapshot: daily asset prices plus the historical dollar rate used to value ARS imports.

Production serves it at GET /public/market-data and fresh development databases import it with
`python -m app.sync_prices`, so both sides of the format live here. Old clones keep calling the endpoint,
so the format only grows: bump MARKET_DATA_VERSION before changing anything that already exists.
"""
from collections import defaultdict
from datetime import date, datetime, time, timezone
from decimal import Decimal

from sqlalchemy.orm import Session

from app.core.asset_catalog import SUPPORTED_ASSETS
from app.models.asset import Asset
from app.models.asset_price import AssetPrice
from app.models.exchange_rate import ExchangeRateHistory
from app.services.catalog_service import ensure_catalog_assets
from app.services.transaction_service import HISTORICAL_RATE_TYPE

MARKET_DATA_VERSION = 1


def build_market_data(db: Session) -> dict:
    assets = db.query(Asset).filter(Asset.ticker.in_(SUPPORTED_ASSETS.keys())).all()
    tickers_by_id = {asset.id: asset.ticker for asset in assets}

    # One price per asset and day, the last one recorded: the same point the charts use.
    daily = defaultdict(dict)
    rows = (
        db.query(AssetPrice)
        .filter(AssetPrice.asset_id.in_(tickers_by_id.keys()))
        .order_by(AssetPrice.timestamp)
        .all()
    )
    for row in rows:
        daily[tickers_by_id[row.asset_id]][row.timestamp.date()] = (float(row.price_usd), float(row.price_ars))

    rates = (
        db.query(ExchangeRateHistory)
        .filter(ExchangeRateHistory.rate_type == HISTORICAL_RATE_TYPE)
        .order_by(ExchangeRateHistory.timestamp)
        .all()
    )

    return {
        "version": MARKET_DATA_VERSION,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "asset_prices": {
            ticker: [[day.isoformat(), usd, ars] for day, (usd, ars) in sorted(days.items())]
            for ticker, days in sorted(daily.items())
        },
        # Exact timestamps, not days: imports pick the latest rate at or before each operation.
        "dollar_rates": [[rate.timestamp.isoformat(), float(rate.rate_value)] for rate in rates],
    }


def import_market_data(db: Session, data: dict) -> dict:
    """Adds the days and rates this database lacks; existing rows are never touched."""
    if data.get("version") != MARKET_DATA_VERSION:
        raise ValueError(f"Formato de datos desconocido (version {data.get('version')}).")

    ensure_catalog_assets(db)
    assets = {asset.ticker: asset for asset in db.query(Asset).all()}

    known_tickers = {t: rows for t, rows in data.get("asset_prices", {}).items() if t in SUPPORTED_ASSETS}
    skipped_tickers = sorted(set(data.get("asset_prices", {})) - known_tickers.keys())

    asset_ids = [assets[t].id for t in known_tickers]
    existing_days = {
        (asset_id, ts.date())
        for asset_id, ts in db.query(AssetPrice.asset_id, AssetPrice.timestamp).filter(AssetPrice.asset_id.in_(asset_ids))
    }

    prices_added = 0
    for ticker, rows in known_tickers.items():
        asset_id = assets[ticker].id
        for day_iso, usd, ars in rows:
            day = date.fromisoformat(day_iso)
            if (asset_id, day) in existing_days:
                continue
            db.add(AssetPrice(
                asset_id=asset_id,
                timestamp=datetime.combine(day, time.min, tzinfo=timezone.utc),
                price_usd=Decimal(str(usd)),
                price_ars=Decimal(str(ars)),
                source="valuonic-sync",
            ))
            prices_added += 1

    existing_rates = {
        (ts, Decimal(str(value)).normalize())
        for ts, value in db.query(ExchangeRateHistory.timestamp, ExchangeRateHistory.rate_value)
        .filter(ExchangeRateHistory.rate_type == HISTORICAL_RATE_TYPE)
    }
    rates_added = 0
    for ts_iso, value in data.get("dollar_rates", []):
        ts = datetime.fromisoformat(ts_iso)
        rate = Decimal(str(value))
        if (ts, rate.normalize()) in existing_rates:
            continue
        db.add(ExchangeRateHistory(timestamp=ts, rate_type=HISTORICAL_RATE_TYPE, rate_value=rate))
        existing_rates.add((ts, rate.normalize()))
        rates_added += 1

    db.commit()
    return {
        "prices_added": prices_added,
        "rates_added": rates_added,
        "tickers": sorted(known_tickers),
        "skipped_tickers": skipped_tickers,
    }
