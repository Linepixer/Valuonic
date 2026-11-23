import threading
import time
from datetime import datetime, timedelta, timezone
from typing import Dict, List, Tuple

from app.utils.email import send_price_failure_alert

FAILURE_ALERT_AFTER_SECONDS = 12 * 60 * 60
ARGENTINA_TZ = timezone(timedelta(hours=-3))


class QuoteFailureTracker:
    """
    In memory on purpose: a restart restarts the 12 hour count, which only delays an alert, and avoids a table
    written every minute. One alert per outage; a success closes the outage.
    """

    _lock = threading.Lock()
    _failing_since: Dict[str, float] = {}
    _alerted: set = set()

    @classmethod
    def record_success(cls, key: str) -> None:
        with cls._lock:
            cls._failing_since.pop(key, None)
            cls._alerted.discard(key)

    @classmethod
    def record_failure(cls, key: str) -> None:
        with cls._lock:
            cls._failing_since.setdefault(key, time.time())

    @classmethod
    def pending_alerts(cls, now: float) -> List[Tuple[str, float]]:
        with cls._lock:
            return sorted(
                (key, since)
                for key, since in cls._failing_since.items()
                if key not in cls._alerted and now - since >= FAILURE_ALERT_AFTER_SECONDS
            )

    @classmethod
    def mark_alerted(cls, keys: List[str]) -> None:
        with cls._lock:
            # A source that recovered while the email was being sent must not be marked.
            cls._alerted.update(key for key in keys if key in cls._failing_since)


def notify_long_failures() -> None:
    now = time.time()
    pending = QuoteFailureTracker.pending_alerts(now)
    if not pending:
        return

    failures = [
        (
            key,
            datetime.fromtimestamp(since, ARGENTINA_TZ).strftime("%d/%m/%Y %H:%M"),
            (now - since) / 3600,
        )
        for key, since in pending
    ]
    # Unmarked on a failed send, so the next warm-up cycle retries it.
    if send_price_failure_alert(failures):
        QuoteFailureTracker.mark_alerted([key for key, _ in pending])
