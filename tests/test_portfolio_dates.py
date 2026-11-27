import os
import unittest
from datetime import date, datetime, timezone
from types import SimpleNamespace
from unittest import mock
from uuid import uuid4

os.environ["APP_TIMEZONE"] = "America/Argentina/Buenos_Aires"
os.environ.setdefault("SECRET_KEY", "test-only-secret-key")
os.environ.setdefault("FRONTEND_URL", "http://localhost:3000")

from app.core.dates import local_date, stored_date, today  # noqa: E402
from app.services.portfolio_service import _iter_daily_positions, _split_ratio_after  # noqa: E402

ASSET = uuid4()
# 22:30 on 23/11 in Buenos Aires, already 24/11 in UTC.
EVENING_OF_23RD = datetime(2026, 11, 24, 1, 30, tzinfo=timezone.utc)
MIDNIGHT_UTC_24TH = datetime(2026, 11, 24, tzinfo=timezone.utc)


def buy(ts, quantity=10):
    return SimpleNamespace(timestamp=ts, asset_id=ASSET, quantity=quantity, type="Compra")


def price(ts, usd):
    return SimpleNamespace(timestamp=ts, asset_id=ASSET, price_usd=usd, price_ars=usd * 1000)


def split(ts, ratio):
    return SimpleNamespace(timestamp=ts, asset_id=ASSET, ratio=ratio)


class DayOfTimestampTest(unittest.TestCase):
    def test_transaction_belongs_to_the_day_in_buenos_aires(self):
        self.assertEqual(local_date(EVENING_OF_23RD), date(2026, 11, 23))

    def test_price_and_event_keep_the_date_they_were_stored_for(self):
        self.assertEqual(stored_date(MIDNIGHT_UTC_24TH), date(2026, 11, 24))

    def test_naive_timestamps_are_read_as_utc(self):
        self.assertEqual(local_date(EVENING_OF_23RD.replace(tzinfo=None)), date(2026, 11, 23))
        self.assertEqual(stored_date(MIDNIGHT_UTC_24TH.replace(tzinfo=None)), date(2026, 11, 24))

    def test_today_at_night_is_still_today_in_buenos_aires(self):
        class EveningOf23rd(datetime):
            @classmethod
            def now(cls, tz=None):
                return EVENING_OF_23RD.astimezone(tz)

        with mock.patch("app.core.dates.datetime", EveningOf23rd):
            self.assertEqual(today(), date(2026, 11, 23))


class DailyPositionsTest(unittest.TestCase):
    def test_evening_operation_and_midnight_price_land_on_their_own_days(self):
        days = {
            day: (balances.get(ASSET, 0.0), dict(known_prices))
            for day, balances, known_prices in _iter_daily_positions(
                [buy(EVENING_OF_23RD)],
                [price(MIDNIGHT_UTC_24TH, 100.0)],
                [],
                date(2026, 11, 23),
                date(2026, 11, 24),
            )
        }
        held_23, prices_23 = days[date(2026, 11, 23)]
        held_24, prices_24 = days[date(2026, 11, 24)]
        self.assertEqual(held_23, 10)
        self.assertNotIn(ASSET, prices_23)
        self.assertEqual(held_24, 10)
        self.assertEqual(prices_24[ASSET]["usd"], 100.0)

    def test_split_applies_before_that_days_operations_only(self):
        evening_buy = buy(EVENING_OF_23RD)
        next_day_buy = buy(datetime(2026, 11, 24, 15, tzinfo=timezone.utc), quantity=5)
        days = {
            day: balances.get(ASSET, 0.0)
            for day, balances, _ in _iter_daily_positions(
                [evening_buy, next_day_buy], [], [split(MIDNIGHT_UTC_24TH, 2)], date(2026, 11, 23), date(2026, 11, 24)
            )
        }
        self.assertEqual(days[date(2026, 11, 23)], 10)
        self.assertEqual(days[date(2026, 11, 24)], 25)


class SplitRatioTest(unittest.TestCase):
    splits = [split(MIDNIGHT_UTC_24TH, 2)]

    def test_operation_the_evening_before_is_adjusted(self):
        self.assertEqual(_split_ratio_after(buy(EVENING_OF_23RD), self.splits), 2.0)

    def test_operation_on_the_split_day_is_already_post_split(self):
        same_day = buy(datetime(2026, 11, 24, 13, tzinfo=timezone.utc))
        self.assertEqual(_split_ratio_after(same_day, self.splits), 1.0)

    def test_operation_days_before_is_adjusted(self):
        earlier = buy(datetime(2026, 11, 20, 15, tzinfo=timezone.utc))
        self.assertEqual(_split_ratio_after(earlier, self.splits), 2.0)


if __name__ == "__main__":
    unittest.main()
