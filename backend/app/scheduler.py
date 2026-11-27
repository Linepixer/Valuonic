import logging
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from apscheduler.triggers.interval import IntervalTrigger
from sqlalchemy.orm import Session
from datetime import datetime, timezone
from app.config import settings
from app.database import SessionLocal
from app.models.asset import Asset
from app.models.asset_price import AssetPrice
from app.services.price_alerts import notify_long_failures
from app.services.price_fetcher import PriceFetcher

logger = logging.getLogger(__name__)
scheduler = AsyncIOScheduler(timezone=settings.APP_TIMEZONE)

def fetch_and_save_prices():
    """
    Background job to fetch current prices for all known assets and save them
    into the historical asset_prices table.
    """
    logger.info("Starting daily price fetch job...")
    db: Session = SessionLocal()
    try:
        assets = db.query(Asset).all()
        
        rates = PriceFetcher.get_dollar_rates()
        usd_to_ars = rates.get("cripto") or rates.get("blue") or rates.get("bolsa") or 1500.0

        # Stablecoins are tracked too: worth 1 in USD, but their ARS price moves with the dollar every day.
        for asset in assets:
            prices = PriceFetcher.fetch_asset_prices(asset.ticker, asset.type)
            if prices:
                price_usd = prices["usd"]
                price_ars = prices["ars"]
                
                new_price = AssetPrice(
                    asset_id=asset.id,
                    price_usd=price_usd,
                    price_ars=price_ars,
                    source="AutoFetcher"
                )
                db.add(new_price)
                logger.info(f"Saved {asset.ticker}: ${price_usd:.2f} USD")
            else:
                logger.warning(f"Failed to fetch price for {asset.ticker}")
                
        db.commit()
        logger.info("Daily price fetch job completed successfully.")
    except Exception as e:
        logger.error(f"Error in daily price fetch job: {e}")
        db.rollback()
    finally:
        db.close()

def warm_up_cache():
    """
    Background job to keep the PriceFetcher cache hot.
    Runs every 1 minute.
    """
    logger.info("Warming up price cache...")
    db: Session = SessionLocal()
    try:
        PriceFetcher._cache_timestamp = 0
        PriceFetcher.get_dollar_rates()
        
        assets = db.query(Asset).all()
        for asset in assets:
            PriceFetcher.fetch_asset_prices(asset.ticker, asset.type)
        logger.info("Cache warm up completed.")
        notify_long_failures()
    except Exception as e:
        logger.error(f"Error warming up cache: {e}")
    finally:
        db.close()

def start_scheduler():
    # After BYMA closes at 17:00, so CEDEARs are saved at their closing price. A trigger instance ignores the
    # scheduler's timezone and falls back to the container's (UTC), hence the explicit one.
    scheduler.add_job(
        fetch_and_save_prices,
        CronTrigger(hour=18, minute=0, timezone=settings.APP_TIMEZONE),
        id="daily_price_fetcher",
        name="Fetch and save asset prices daily",
        replace_existing=True
    )
    
    # Schedule cache warmer with 75s base interval and 15s jitter
    scheduler.add_job(
        warm_up_cache,
        IntervalTrigger(seconds=75, jitter=15),
        id="price_cache_warmer",
        name="Keep price cache hot",
        replace_existing=True,
        # Aware on purpose: a naive now() would be read in APP_TIMEZONE and delay the first run by three hours.
        next_run_time=datetime.now(timezone.utc)
    )
    
    scheduler.start()
    logger.info("Scheduler started.")

def stop_scheduler():
    scheduler.shutdown()
    logger.info("Scheduler stopped.")
