from datetime import datetime, time, timedelta, timezone
from decimal import Decimal
from typing import Iterable
from uuid import UUID

from sqlalchemy import desc
from sqlalchemy.orm import Session

from app.core.asset_catalog import normalize_ticker
from app.core.dates import local_date
from app.models.exchange_rate import ExchangeRateHistory
from app.models.transaction import Transaction
from app.schemas.transaction import TransactionCreate
from app.services.catalog_service import get_or_create_catalog_asset

HISTORICAL_RATE_TYPE = "historico"


def rates_cutoff(timestamp: datetime) -> datetime:
    """
    Rates stored before this instant belong to the operation's day or earlier. They mark their day at 00:00 UTC,
    still the evening before in APP_TIMEZONE, so comparing instants would give an operation made after 21:00 in
    Buenos Aires the next day's rate.
    """
    return datetime.combine(local_date(timestamp) + timedelta(days=1), time.min, tzinfo=timezone.utc)


def resolve_historical_rate(db: Session, timestamp: datetime) -> Decimal:
    """Dollar rate of the operation's day, used to value imported ARS operations in USD."""
    closest = (
        db.query(ExchangeRateHistory)
        .filter(
            ExchangeRateHistory.rate_type == HISTORICAL_RATE_TYPE,
            ExchangeRateHistory.timestamp < rates_cutoff(timestamp),
        )
        .order_by(desc(ExchangeRateHistory.timestamp))
        .first()
    )
    if closest:
        return closest.rate_value
    earliest = (
        db.query(ExchangeRateHistory)
        .filter(ExchangeRateHistory.rate_type == HISTORICAL_RATE_TYPE)
        .order_by(ExchangeRateHistory.timestamp)
        .first()
    )
    return earliest.rate_value if earliest else Decimal(1)


def bulk_create_transactions(db: Session, user_id: UUID, txs_in: Iterable[TransactionCreate]) -> int:
    """Creates the transactions in one commit; callers must have checked the tickers against the catalog."""
    asset_ids = {}
    created = 0
    for tx_in in txs_in:
        ticker = normalize_ticker(tx_in.ticker)
        if ticker not in asset_ids:
            asset_ids[ticker] = get_or_create_catalog_asset(db, ticker).id

        exchange_rate = tx_in.exchange_rate
        if not exchange_rate and tx_in.timestamp:
            exchange_rate = resolve_historical_rate(db, tx_in.timestamp)

        db_tx = Transaction(
            user_id=user_id,
            asset_id=asset_ids[ticker],
            type=tx_in.type,
            quantity=tx_in.quantity,
            price_per_unit=tx_in.price_per_unit,
            total_value=tx_in.total_value,
            operated_currency=tx_in.operated_currency,
            exchange_rate=exchange_rate,
            platform=tx_in.platform,
            notes=tx_in.notes,
        )
        if tx_in.timestamp:
            db_tx.timestamp = tx_in.timestamp
        db.add(db_tx)
        created += 1

    db.commit()
    return created
