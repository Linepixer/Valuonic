import os
import tempfile
import unittest
from datetime import date, datetime, timezone
from decimal import Decimal
from pathlib import Path

os.environ["APP_TIMEZONE"] = "America/Argentina/Buenos_Aires"
os.environ.setdefault("SECRET_KEY", "test-only-secret-key")
os.environ.setdefault("FRONTEND_URL", "http://localhost:3000")

from app.core.dates import local_date  # noqa: E402
from app.schemas.transaction import TransactionCreate  # noqa: E402
from app.seed_demo import read_demo_transactions  # noqa: E402
from app.services.transaction_service import rates_cutoff  # noqa: E402


def transaction(timestamp):
    return TransactionCreate(
        timestamp=timestamp,
        ticker="SPY",
        type="Compra",
        quantity=Decimal(1),
        price_per_unit=Decimal(1),
        total_value=Decimal(1),
    )


class TransactionTimestampTest(unittest.TestCase):
    def test_time_without_zone_is_buenos_aires_time(self):
        ts = transaction("2026-11-24T01:30:00").timestamp
        self.assertEqual(ts.astimezone(timezone.utc), datetime(2026, 11, 24, 4, 30, tzinfo=timezone.utc))
        self.assertEqual(local_date(ts), date(2026, 11, 24))

    def test_time_with_zone_is_kept(self):
        ts = transaction("2026-11-24T01:30:00Z").timestamp
        self.assertEqual(ts, datetime(2026, 11, 24, 1, 30, tzinfo=timezone.utc))

    def test_missing_time_stays_empty(self):
        self.assertIsNone(transaction(None).timestamp)

    def test_demo_seed_reads_times_like_the_import_screen(self):
        with tempfile.TemporaryDirectory() as tmp:
            csv_path = Path(tmp) / "demo.csv"
            csv_path.write_text(
                "Fecha,Activo,Tipo,Cantidad,Divisa operada,Precio unitario,Plataforma\n"
                "05/01/2023 10:15,SPY,Compra,1,USD,500,IOL\n",
                encoding="utf-8",
            )
            ts = read_demo_transactions(csv_path)[0].timestamp
        self.assertEqual(ts.astimezone(timezone.utc), datetime(2023, 1, 5, 13, 15, tzinfo=timezone.utc))


class HistoricalRateDayTest(unittest.TestCase):
    """Stored rates mark their day at 00:00 UTC; an operation takes the rate of its own day in Buenos Aires."""

    def test_evening_operation_takes_its_days_rate_not_the_next(self):
        evening_of_23rd = datetime(2026, 11, 24, 1, 30, tzinfo=timezone.utc)
        self.assertEqual(rates_cutoff(evening_of_23rd), datetime(2026, 11, 24, tzinfo=timezone.utc))

    def test_daytime_operation_includes_its_days_rate(self):
        morning_of_24th = datetime(2026, 11, 24, 13, 0, tzinfo=timezone.utc)
        self.assertEqual(rates_cutoff(morning_of_24th), datetime(2026, 11, 25, tzinfo=timezone.utc))


if __name__ == "__main__":
    unittest.main()
