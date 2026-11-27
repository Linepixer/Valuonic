from pydantic import BaseModel, ConfigDict, field_validator
from uuid import UUID
from datetime import datetime
from decimal import Decimal

from app.core.dates import APP_TZ

class TransactionBase(BaseModel):
    timestamp: datetime | None = None

    @field_validator("timestamp")
    @classmethod
    def _naive_is_app_timezone(cls, value: datetime | None) -> datetime | None:
        # The CSV import sends the time as written in the broker's statement, which is local to APP_TIMEZONE.
        if value is not None and value.tzinfo is None:
            return value.replace(tzinfo=APP_TZ)
        return value
    type: str
    quantity: Decimal
    price_per_unit: Decimal
    total_value: Decimal
    operated_currency: str | None = None
    exchange_rate: Decimal | None = None
    platform: str | None = None
    notes: str | None = None

class TransactionCreate(TransactionBase):
    ticker: str
    asset_type: str = "Stock" # "Stock", "Crypto", etc.

class TransactionResponse(TransactionCreate):
    id: UUID
    timestamp: datetime

    model_config = ConfigDict(from_attributes=True)
