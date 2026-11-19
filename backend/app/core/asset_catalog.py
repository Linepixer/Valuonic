# Assets are shared by every user and their `type` drives the pricing source (Bitso vs IOL)
# and the portfolio categories, so they come from this catalog and never from user input.
SUPPORTED_ASSETS: dict[str, dict[str, str]] = {
    "USD": {"name": "Dólar Estadounidense", "type": "Fiat"},
    "SPY": {"name": "S&P 500 ETF", "type": "ETF"},
    "QQQ": {"name": "Invesco QQQ Trust", "type": "ETF"},
    "GLD": {"name": "SPDR Gold Shares", "type": "ETF"},
    "NVDA": {"name": "NVIDIA Corporation", "type": "Acción"},
    "BTC": {"name": "Bitcoin", "type": "Criptomoneda"},
    "XRP": {"name": "Ripple", "type": "Criptomoneda"},
    "USDT": {"name": "Tether", "type": "Criptomoneda"},
}


def normalize_ticker(ticker: str) -> str:
    return ticker.strip().upper()
