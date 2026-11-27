"""
Calendar days for the portfolio. Two kinds of timestamps share the database:

- Transactions are real instants, so their day is the one in APP_TIMEZONE, where the users are. An operation at
  22:30 in Buenos Aires is already the next day in UTC.
- Prices and corporate events are stored at 00:00 UTC to write down a calendar date (imports, sync, the admin
  form), so their day is the UTC one. Converting them to APP_TIMEZONE would move them to the evening before.
"""
from datetime import date, datetime, timezone
from zoneinfo import ZoneInfo

from app.config import settings

APP_TZ = ZoneInfo(settings.APP_TIMEZONE)


def _aware(ts: datetime) -> datetime:
    return ts if ts.tzinfo else ts.replace(tzinfo=timezone.utc)


def local_date(ts: datetime) -> date:
    """Day a transaction happened, in APP_TIMEZONE."""
    return _aware(ts).astimezone(APP_TZ).date()


def stored_date(ts: datetime) -> date:
    """Day a price or corporate event was recorded for."""
    return _aware(ts).astimezone(timezone.utc).date()


def today() -> date:
    return datetime.now(APP_TZ).date()
