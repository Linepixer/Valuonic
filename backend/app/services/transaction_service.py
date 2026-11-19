from datetime import datetime
from decimal import Decimal
from typing import Iterable
from uuid import UUID

from sqlalchemy import desc
from sqlalchemy.orm import Session

from app.core.asset_catalog import normalize_ticker
from app.models.exchange_rate import ExchangeRateHistory
from app.models.transaction import Transaction
from app.schemas.transaction import TransactionCreate
from app.services.catalog_service import get_or_create_catalog_asset

HISTORICAL_RATE_TYPE = "historico"


def resolve_historical_rate(db: Session, timestamp: datetime) -> Decimal:
    """Dollar rate in effect at `timestamp`, used to value imported ARS operations in USD."""
    closest = (
        db.query(ExchangeRateHistory)
        .filter(ExchangeRateHistory.rate_type == HISTORICAL_RATE_TYPE, ExchangeRateHistory.timestamp <= timestamp)
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
