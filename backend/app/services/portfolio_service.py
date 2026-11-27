import calendar
import logging
from datetime import date, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Dict, Iterable, List, Optional, Tuple
from collections import defaultdict
from uuid import UUID

from fastapi import HTTPException

from app.core.dates import local_date, stored_date, today as local_today
from app.models.transaction import Transaction
from app.models.asset import Asset
from app.models.asset_price import AssetPrice
from app.models.corporate_event import CorporateEvent, HOLDINGS_MULTIPLIER_TYPES
from app.schemas.portfolio import (
    PeriodGain,
    PortfolioAsset,
    PortfolioHistoryPoint,
    PortfolioHistoryResponse,
    PortfolioPeriodGain,
    PortfolioSummary,
)
from app.services.price_fetcher import PriceFetcher

logger = logging.getLogger(__name__)

# Same keys and order as the period buttons in the frontend.
PERIODS = ("1S", "1M", "3M", "6M", "1A", "MAX")
_PERIOD_MONTHS = {"1M": 1, "3M": 3, "6M": 6, "1A": 12}
STABLECOINS = {"USD", "USDT", "USDC", "DAI"}

def _calculate_xirr(cash_flows: List[tuple]) -> float:
    """
    Calculates the Internal Rate of Return (XIRR) for a series of cash flows.
    cash_flows: List of tuples (date, amount)
    Returns the annualized rate as a percentage (e.g. 12.4 for 12.4%).
    """
    if not cash_flows:
        return 0.0
        
    flows = sorted(cash_flows, key=lambda x: x[0])
    
    has_pos = any(f[1] > 0 for f in flows)
    has_neg = any(f[1] < 0 for f in flows)
    if not (has_pos and has_neg):
        return 0.0
        
    t0 = flows[0][0]
    if (flows[-1][0] - t0).days < 1:
        return 0.0

    def f(r):
        val = 0.0
        for date, amount in flows:
            days = (date - t0).days
            if 1.0 + r <= 0:
                return float('inf') if amount < 0 else float('-inf')
            val += amount / ((1.0 + r) ** (days / 365.0))
        return val

    low = -0.999
    high = 100.0
    
    f_low = f(low)
    f_high = f(high)
    
    if f_low * f_high > 0:
        for _ in range(10):
            high *= 2.0
            f_high = f(high)
            if f_low * f_high <= 0:
                break
        else:
            return 0.0
            
    for _ in range(100):
        mid = (low + high) / 2.0
        f_mid = f(mid)
        if abs(f_mid) < 1e-6:
            return mid * 100.0
        if f_low * f_mid < 0:
            high = mid
            f_high = f_mid
        else:
            low = mid
            f_low = f_mid
            
    return ((low + high) / 2.0) * 100.0


def _normalize_currency(raw: Optional[str]) -> str:
    op_cur = raw.upper().strip() if raw else "USD"
    if "AR" in op_cur:
        return "ARS"
    if "US" in op_cur:
        return "USD"
    return op_cur


def _transaction_values(t: Transaction, is_stablecoin: bool, fallback_rate: float) -> Tuple[float, float]:
    """USD and ARS value of a transaction at the exchange rate of the day it happened."""
    qty = float(t.quantity)
    price = float(t.price_per_unit)
    ex_rate = float(t.exchange_rate) if t.exchange_rate else fallback_rate
    op_cur = _normalize_currency(t.operated_currency)

    # Cash dividend/interest payouts carry quantity=0, so derive value from total_value (with legacy price_per_unit fallback)
    if t.type.strip().lower() == "intereses" and qty == 0:
        raw_val = float(t.total_value or 0) or float(t.price_per_unit or 0)
        if op_cur == "ARS":
            return (raw_val / ex_rate if ex_rate else 0.0), raw_val
        return raw_val, raw_val * ex_rate

    if op_cur == "ARS":
        val_ars = qty * price
        return (qty if is_stablecoin else (val_ars / ex_rate if ex_rate else 0.0)), val_ars
    val_usd = qty * price
    return val_usd, val_usd * ex_rate


def _split_ratio_after(t: Transaction, splits: Iterable[CorporateEvent]) -> float:
    """
    Combined ratio of the splits after the transaction's day, which its quantity and price must be adjusted by.
    Compared by day, not instant: a split is stored at 00:00 UTC, still the evening before in APP_TIMEZONE, so an
    operation that evening would otherwise count as after it. Same-day transactions are already post-split, as in
    _iter_daily_positions.
    """
    tx_day = local_date(t.timestamp)
    ratio = 1.0
    for split in splits:
        if stored_date(split.timestamp) > tx_day:
            ratio *= float(split.ratio)
    return ratio


def _iter_daily_positions(transactions: Iterable[Transaction], prices: Iterable[AssetPrice],
                          splits: Iterable[CorporateEvent], start_date: date, end_date: date):
    """
    Yields (day, balances, last_known_prices) for every day in [start_date, end_date]: that day's splits
    apply first, then its transactions. The chart and the period gains both read holdings from here, so a
    period always starts from the same value the chart shows. The dicts are updated in place on the next
    step, so copy what you need before advancing.
    """
    daily_prices = defaultdict(dict)
    for p in prices:
        daily_prices[stored_date(p.timestamp)][p.asset_id] = {"usd": float(p.price_usd), "ars": float(p.price_ars)}
    daily_splits = defaultdict(list)
    for split in splits:
        daily_splits[stored_date(split.timestamp)].append(split)
    daily_txs = defaultdict(list)
    for t in transactions:
        daily_txs[local_date(t.timestamp)].append(t)

    balances = defaultdict(float)
    last_known_prices = {}
    day = start_date
    while day <= end_date:
        for split in daily_splits.get(day, []):
            if balances[split.asset_id] != 0:
                balances[split.asset_id] *= float(split.ratio)
        for t in daily_txs.get(day, []):
            qty = float(t.quantity)
            t_type = t.type.strip().lower()
            if t_type in ("compra", "intereses"):
                balances[t.asset_id] += qty
            elif t_type in ("venta", "fee de red"):
                balances[t.asset_id] -= qty
        last_known_prices.update(daily_prices.get(day, {}))
        yield day, balances, last_known_prices
        day += timedelta(days=1)


def _value_positions(balances: Dict[UUID, float], known_prices: Dict[UUID, Dict[str, float]]) -> Tuple[float, float]:
    val_usd = 0.0
    val_ars = 0.0
    for asset_id, qty in balances.items():
        if qty > 0:
            p_data = known_prices.get(asset_id)
            if p_data:
                val_usd += qty * p_data["usd"]
                val_ars += qty * p_data["ars"]
    return val_usd, val_ars


def _months_before(day: date, months: int) -> date:
    year, month_index = divmod(day.year * 12 + day.month - 1 - months, 12)
    month = month_index + 1
    return date(year, month, min(day.day, calendar.monthrange(year, month)[1]))


def _period_start_dates(today: date, first_day: date) -> Dict[str, date]:
    """Each period's baseline is the value at the end of this day; transactions after it are the period's."""
    starts = {"1S": today - timedelta(days=7), "MAX": first_day - timedelta(days=1)}
    for key, months in _PERIOD_MONTHS.items():
        starts[key] = _months_before(today, months)
    return {key: starts[key] for key in PERIODS}


def _first_price_after(prices: List[AssetPrice], asset_id: UUID, day: date) -> Optional[Dict[str, float]]:
    for p in prices:
        if p.asset_id == asset_id and stored_date(p.timestamp) > day:
            return {"usd": float(p.price_usd), "ars": float(p.price_ars)}
    return None


def _cents(value: float) -> float:
    # + 0.0 turns -0.0 into 0.0, otherwise the UI renders "-USD 0,00".
    return round(value, 2) + 0.0


def _percentage(gain: float, base: float) -> Optional[float]:
    # With nothing at stake (e.g. units that only came from interest) a percentage has no meaning.
    if base <= 1e-9:
        return None
    return round(gain / base * 100.0, 4) + 0.0


def _compute_period_gains(
    transactions: List[Transaction],
    prices: List[AssetPrice],
    splits: List[CorporateEvent],
    tx_values: Dict[UUID, Tuple[float, float]],
    end_values: Dict[UUID, Tuple[float, float]],
    live_prices: Dict[UUID, Dict[str, float]],
    today: date,
) -> Tuple[Dict[str, PortfolioPeriodGain], Dict[UUID, Dict[str, PeriodGain]]]:
    """
    Gain over a period = value today - value at the start - money put in (buys) + money taken out
    (sales and interest paid in cash), so buying never reads as gain and selling never as a loss.
    Interest paid in units and network fees need no flow: they already change the holdings.
    The percentage is measured against what was at stake: the starting value plus what was bought.
    `transactions` must be in chronological order.
    """
    first_day = min((local_date(t.timestamp) for t in transactions), default=today)
    starts = _period_start_dates(today, first_day)

    start_values: Dict[str, Dict[UUID, Tuple[float, float]]] = {key: {} for key in PERIODS}
    keys_by_day = defaultdict(list)
    for key, start in starts.items():
        if first_day <= start <= today:
            keys_by_day[start].append(key)
    if keys_by_day:
        for day, balances, known_prices in _iter_daily_positions(transactions, prices, splits, first_day, max(keys_by_day)):
            if day not in keys_by_day:
                continue
            snapshot = {}
            for asset_id, qty in balances.items():
                if qty <= 0:
                    continue
                # The chart leaves out holdings that have no price yet; valuing them at 0 here would turn
                # the whole position into fake gain, so fall back to the nearest price we do have.
                p_data = known_prices.get(asset_id) or _first_price_after(prices, asset_id, day) or live_prices.get(asset_id)
                if p_data:
                    snapshot[asset_id] = (qty * p_data["usd"], qty * p_data["ars"])
            for key in keys_by_day[day]:
                start_values[key] = snapshot

    portfolio: Dict[str, PortfolioPeriodGain] = {}
    per_asset: Dict[UUID, Dict[str, PeriodGain]] = defaultdict(dict)
    for key in PERIODS:
        start = starts[key]
        bought = defaultdict(lambda: [0.0, 0.0])
        taken_out = defaultdict(lambda: [0.0, 0.0])
        for t in transactions:
            if local_date(t.timestamp) <= start:
                continue
            t_type = t.type.strip().lower()
            val_usd, val_ars = tx_values[t.id]
            if t_type == "compra":
                flows = bought
            elif t_type == "venta" or (t_type == "intereses" and float(t.quantity) == 0):
                flows = taken_out
            else:
                continue
            flows[t.asset_id][0] += val_usd
            flows[t.asset_id][1] += val_ars

        totals = {"gain_usd": 0.0, "gain_ars": 0.0, "base_usd": 0.0, "base_ars": 0.0}
        for asset_id in set(start_values[key]) | set(bought) | set(taken_out) | set(end_values):
            start_usd, start_ars = start_values[key].get(asset_id, (0.0, 0.0))
            end_usd, end_ars = end_values.get(asset_id, (0.0, 0.0))
            in_usd, in_ars = bought.get(asset_id, (0.0, 0.0))
            out_usd, out_ars = taken_out.get(asset_id, (0.0, 0.0))

            gain_usd = end_usd - start_usd - in_usd + out_usd
            gain_ars = end_ars - start_ars - in_ars + out_ars
            base_usd = start_usd + in_usd
            base_ars = start_ars + in_ars

            per_asset[asset_id][key] = PeriodGain(
                gain_usd=_cents(gain_usd),
                gain_ars=_cents(gain_ars),
                gain_pct_usd=_percentage(gain_usd, base_usd),
                gain_pct_ars=_percentage(gain_ars, base_ars),
            )
            totals["gain_usd"] += gain_usd
            totals["gain_ars"] += gain_ars
            totals["base_usd"] += base_usd
            totals["base_ars"] += base_ars

        portfolio[key] = PortfolioPeriodGain(
            start_date=start.isoformat(),
            gain_usd=_cents(totals["gain_usd"]),
            gain_ars=_cents(totals["gain_ars"]),
            gain_pct_usd=_percentage(totals["gain_usd"], totals["base_usd"]),
            gain_pct_ars=_percentage(totals["gain_ars"], totals["base_ars"]),
        )

    return portfolio, per_asset


def get_portfolio_summary(db: Session, user_id: UUID) -> PortfolioSummary:
    rates = PriceFetcher.get_dollar_rates()
    current_usd_to_ars = rates.get("cripto") or rates.get("blue") or rates.get("bolsa") or 1500.0
    
    transactions = db.query(Transaction).filter(Transaction.user_id == user_id).all()
    
    assets = db.query(Asset).all()
    asset_map = {a.id: a for a in assets}
    
    # Track total spent in ARS/USD and quantity bought to calculate average purchase price
    asset_data = defaultdict(lambda: {
        "quantity": 0.0,
        "total_spent_ars": 0.0,
        "total_spent_usd": 0.0,
        "quantity_bought": 0.0
    })
    
    # Load all corporate events (splits)
    corporate_events = db.query(CorporateEvent).all()
    splits_by_asset = defaultdict(list)
    for event in corporate_events:
        if event.type in HOLDINGS_MULTIPLIER_TYPES:
            splits_by_asset[event.asset_id].append(event)
    
    for t in transactions:
        qty = float(t.quantity)
        price = float(t.price_per_unit)
        
        effective_ratio = _split_ratio_after(t, splits_by_asset.get(t.asset_id, []))
        qty *= effective_ratio
        if effective_ratio > 0:
            price /= effective_ratio
            
        ex_rate = float(t.exchange_rate) if t.exchange_rate else current_usd_to_ars
        op_cur = t.operated_currency.upper().strip() if t.operated_currency else "USD"
        if "AR" in op_cur:
            op_cur = "ARS"
        elif "US" in op_cur:
            op_cur = "USD"
        
        asset_obj = asset_map.get(t.asset_id)
        is_stablecoin = asset_obj and asset_obj.ticker.strip().upper() in STABLECOINS

        # Calculate value of this transaction in both currencies
        if op_cur == "ARS":
            val_ars = qty * price
            val_usd = qty if is_stablecoin else (val_ars / ex_rate if ex_rate else 0)
        else:
            val_usd = qty * price
            val_ars = val_usd * ex_rate
            
        t_type = t.type.strip().lower()
        if t_type in ["compra", "intereses"]:
            asset_data[t.asset_id]["quantity"] += qty
            if t_type == "compra":
                asset_data[t.asset_id]["quantity_bought"] += qty
                asset_data[t.asset_id]["total_spent_ars"] += val_ars
                asset_data[t.asset_id]["total_spent_usd"] += val_usd
        elif t_type in ["venta", "fee de red"]:
            asset_data[t.asset_id]["quantity"] -= qty
            # but we might want to handle realized gains later.
            
    portfolio_assets = []
    held_assets: List[Tuple[UUID, PortfolioAsset]] = []
    end_values: Dict[UUID, Tuple[float, float]] = {}
    total_portfolio_usd = 0.0
    total_portfolio_ars = 0.0

    # Cache fetched prices to minimize redundant API calls
    current_prices: Dict[UUID, Dict[str, float]] = {}

    for asset_id, data in asset_data.items():
        if data["quantity"] <= 0:
            continue
            
        asset = asset_map.get(asset_id)
        if not asset:
            continue
            
        # Fetch current price (get both exact ARS and USD if possible)
        prices = current_prices.get(asset_id)
        if prices is None:
            prices = PriceFetcher.get_asset_prices(asset.ticker, asset.type)
            current_prices[asset_id] = prices
            
        price_usd = prices["usd"]
        price_ars = prices["ars"]
        
        # Calculate averages
        avg_ars = data["total_spent_ars"] / data["quantity_bought"] if data["quantity_bought"] > 0 else 0
        avg_usd = data["total_spent_usd"] / data["quantity_bought"] if data["quantity_bought"] > 0 else 0
        
        # Totals
        val_ars = data["quantity"] * price_ars
        val_usd = data["quantity"] * price_usd
        
        # Profits
        profit_ars = val_ars - (avg_ars * data["quantity"])
        profit_usd = val_usd - (avg_usd * data["quantity"])
        
        profit_pct_ars = (profit_ars / (avg_ars * data["quantity"]) * 100) if avg_ars > 0 else 0
        profit_pct_usd = (profit_usd / (avg_usd * data["quantity"]) * 100) if avg_usd > 0 else 0
        
        total_portfolio_ars += val_ars
        total_portfolio_usd += val_usd
        
        p_asset = PortfolioAsset(
            ticker=asset.ticker,
            name=asset.name,
            quantity=data["quantity"],
            current_price_ars=price_ars,
            current_price_usd=price_usd,
            average_purchase_price_ars=avg_ars,
            average_purchase_price_usd=avg_usd,
            total_value_ars=val_ars,
            total_value_usd=val_usd,
            potential_profit_ars=profit_ars,
            potential_profit_usd=profit_usd,
            profit_percentage_ars=profit_pct_ars,
            profit_percentage_usd=profit_pct_usd,
            portfolio_percentage=0.0
        )
        portfolio_assets.append(p_asset)
        held_assets.append((asset_id, p_asset))
        end_values[asset_id] = (val_usd, val_ars)

    for pa in portfolio_assets:
        if total_portfolio_usd > 0:
            pa.portfolio_percentage = (pa.total_value_usd / total_portfolio_usd) * 100
            
    usd_flows = []
    ars_flows = []
    usd_flows_by_asset = defaultdict(list)
    ars_flows_by_asset = defaultdict(list)
    tx_values: Dict[UUID, Tuple[float, float]] = {}

    for t in transactions:
        asset_obj = asset_map.get(t.asset_id)
        is_stablecoin = bool(asset_obj and asset_obj.ticker.strip().upper() in STABLECOINS)
        val_usd, val_ars = _transaction_values(t, is_stablecoin, current_usd_to_ars)
        tx_values[t.id] = (val_usd, val_ars)

        t_type = t.type.strip().lower()
        if t_type in ["compra", "fee de red"]:
            flow_usd = -val_usd
            flow_ars = -val_ars
        elif t_type in ["venta", "intereses"]:
            flow_usd = val_usd
            flow_ars = val_ars
        else:
            continue
            
        t_date = local_date(t.timestamp)
        usd_flows.append((t_date, flow_usd))
        ars_flows.append((t_date, flow_ars))
        usd_flows_by_asset[t.asset_id].append((t_date, flow_usd))
        ars_flows_by_asset[t.asset_id].append((t_date, flow_ars))
        
    today = local_today()
    usd_flows.append((today, total_portfolio_usd))
    ars_flows.append((today, total_portfolio_ars))
    
    xirr_usd = _calculate_xirr(usd_flows)
    xirr_ars = _calculate_xirr(ars_flows)
    
    # Calculate per-asset XIRR
    for p_asset in portfolio_assets:
        asset_id = next((a.id for a in assets if a.ticker == p_asset.ticker), None)
        if asset_id:
            a_usd_flows = usd_flows_by_asset.get(asset_id, [])
            a_ars_flows = ars_flows_by_asset.get(asset_id, [])
            
            if a_usd_flows:
                a_usd_flows.append((today, p_asset.total_value_usd))
                p_asset.xirr_usd = _calculate_xirr(a_usd_flows)
            
            if a_ars_flows:
                a_ars_flows.append((today, p_asset.total_value_ars))
                p_asset.xirr_ars = _calculate_xirr(a_ars_flows)

    user_asset_ids = {t.asset_id for t in transactions}
    price_rows = (
        db.query(AssetPrice)
        .filter(AssetPrice.asset_id.in_(user_asset_ids))
        .order_by(AssetPrice.timestamp)
        .all()
        if user_asset_ids else []
    )
    # Same split filter as the history chart, so both walk identical holdings.
    chart_splits = [e for e in corporate_events if e.type in HOLDINGS_MULTIPLIER_TYPES]
    periods, periods_by_asset = _compute_period_gains(
        sorted(transactions, key=lambda t: t.timestamp),
        price_rows,
        chart_splits,
        tx_values,
        end_values,
        current_prices,
        today,
    )
    for asset_id, p_asset in held_assets:
        p_asset.periods = periods_by_asset.get(asset_id, {})

    return PortfolioSummary(
        assets=portfolio_assets,
        total_value_ars=total_portfolio_ars,
        total_value_usd=total_portfolio_usd,
        exchange_rates=rates,
        xirr_usd=xirr_usd,
        xirr_ars=xirr_ars,
        periods=periods,
    )

def get_portfolio_history(db: Session, user_id: UUID) -> PortfolioHistoryResponse:
    transactions = db.query(Transaction).filter(Transaction.user_id == user_id).order_by(Transaction.timestamp).all()
    if not transactions:
        return PortfolioHistoryResponse(history=[])
        
    prices = db.query(AssetPrice).order_by(AssetPrice.timestamp).all()
    corporate_events = db.query(CorporateEvent).filter(CorporateEvent.type.in_(HOLDINGS_MULTIPLIER_TYPES)).all()
    
    # We will compute daily values from the first transaction to today
    start_date = local_date(transactions[0].timestamp)
    end_date = local_today()

    history = []
    for day, balances, known_prices in _iter_daily_positions(transactions, prices, corporate_events, start_date, end_date):
        val_usd, val_ars = _value_positions(balances, known_prices)
        history.append(PortfolioHistoryPoint(
            date=day.strftime("%Y-%m-%d"),
            total_value_usd=val_usd,
            total_value_ars=val_ars
        ))
        
    # Overwrite the last data point with the live summary to ensure chart consistency with dashboard totals.
    if history and history[-1].date == end_date.strftime("%Y-%m-%d"):
        summary = get_portfolio_summary(db, user_id)
        history[-1].total_value_usd = summary.total_value_usd
        history[-1].total_value_ars = summary.total_value_ars
        
    return PortfolioHistoryResponse(history=history)


def get_portfolio_asset_history(db: Session, user_id: UUID, ticker: str) -> PortfolioHistoryResponse:
    asset = db.query(Asset).filter(func.upper(Asset.ticker) == ticker.upper()).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
        
    transactions = db.query(Transaction).filter(
        Transaction.user_id == user_id, 
        Transaction.asset_id == asset.id
    ).order_by(Transaction.timestamp).all()
    
    if not transactions:
        return PortfolioHistoryResponse(history=[])
        
    prices = db.query(AssetPrice).filter(AssetPrice.asset_id == asset.id).order_by(AssetPrice.timestamp).all()
    corporate_events = db.query(CorporateEvent).filter(
        CorporateEvent.asset_id == asset.id,
        CorporateEvent.type.in_(HOLDINGS_MULTIPLIER_TYPES)
    ).all()
    
    # We will compute daily values from the first transaction to today
    start_date = local_date(transactions[0].timestamp)
    end_date = local_today()

    history = []
    for day, balances, known_prices in _iter_daily_positions(transactions, prices, corporate_events, start_date, end_date):
        val_usd, val_ars = _value_positions(balances, known_prices)
        history.append(PortfolioHistoryPoint(
            date=day.strftime("%Y-%m-%d"),
            total_value_usd=val_usd,
            total_value_ars=val_ars
        ))
        
    # Overwrite the last data point with the live summary to ensure chart consistency.
    if history and history[-1].date == end_date.strftime("%Y-%m-%d"):
        summary = get_portfolio_summary(db, user_id)
        # Find the specific asset in the summary
        target_asset = next((a for a in summary.assets if a.ticker.upper() == ticker.upper()), None)
        if target_asset:
            history[-1].total_value_usd = target_asset.total_value_usd
            history[-1].total_value_ars = target_asset.total_value_ars
        else:
            history[-1].total_value_usd = 0.0
            history[-1].total_value_ars = 0.0
        
    return PortfolioHistoryResponse(history=history)
