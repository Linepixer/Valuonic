from pydantic import BaseModel
from typing import List, Dict, Optional

class PeriodGain(BaseModel):
    gain_usd: float = 0.0
    gain_ars: float = 0.0
    # None when nothing was at stake during the period, so there is no base for a percentage.
    gain_pct_usd: Optional[float] = None
    gain_pct_ars: Optional[float] = None

class PortfolioPeriodGain(PeriodGain):
    # Day whose closing value is the period's baseline; the chart for the period starts here.
    start_date: str

class PortfolioAsset(BaseModel):
    ticker: str
    name: str
    quantity: float
    
    current_price_ars: float
    current_price_usd: float
    average_purchase_price_ars: float
    average_purchase_price_usd: float
    
    total_value_ars: float
    total_value_usd: float
    
    potential_profit_ars: float
    potential_profit_usd: float
    profit_percentage_ars: float
    profit_percentage_usd: float
    
    portfolio_percentage: float
    target_percentage: float = 0.0
    
    xirr_usd: float = 0.0
    xirr_ars: float = 0.0

    # Keyed by the frontend period buttons: 1S, 1M, 3M, 6M, 1A, MAX.
    periods: Dict[str, PeriodGain] = {}

class PortfolioSummary(BaseModel):
    assets: List[PortfolioAsset]
    total_value_ars: float
    total_value_usd: float
    exchange_rates: Dict[str, Optional[float]]
    xirr_usd: float = 0.0
    xirr_ars: float = 0.0
    periods: Dict[str, PortfolioPeriodGain] = {}

class PortfolioHistoryPoint(BaseModel):
    date: str
    total_value_usd: float
    total_value_ars: float

class PortfolioHistoryResponse(BaseModel):
    history: List[PortfolioHistoryPoint]
