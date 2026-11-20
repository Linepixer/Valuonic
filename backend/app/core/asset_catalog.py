# Assets are shared by every user and their `type` drives the pricing source (Bitso vs IOL)
# and the portfolio categories, so they come from this catalog and never from user input.
SUPPORTED_ASSETS: dict[str, dict[str, str]] = {
    "USD": {"name": "Dólar Estadounidense", "type": "Fiat"},
    "SPY": {"name": "S&P 500 ETF", "type": "ETF"},
    "QQQ": {"name": "Invesco QQQ Trust", "type": "ETF"},
    "GLD": {"name": "SPDR Gold Shares", "type": "ETF"},
    "DIA": {"name": "SPDR Dow Jones Industrial Average ETF Trust", "type": "ETF"},
    "NVDA": {"name": "NVIDIA Corporation", "type": "Acción"},
    "KO": {"name": "The Coca-Cola Company", "type": "Acción"},
    "MELI": {"name": "MercadoLibre Inc.", "type": "Acción"},
    "AAPL": {"name": "Apple Inc.", "type": "Acción"},
    "AMD": {"name": "Advanced Micro Devices Inc.", "type": "Acción"},
    "MSFT": {"name": "Microsoft Corporation", "type": "Acción"},
    "META": {"name": "Meta Platforms Inc.", "type": "Acción"},
    "TSLA": {"name": "Tesla Inc.", "type": "Acción"},
    "GOOGL": {"name": "Alphabet Inc.", "type": "Acción"},
    "AMZN": {"name": "Amazon.com Inc.", "type": "Acción"},
    "BTC": {"name": "Bitcoin", "type": "Criptomoneda"},
    "XRP": {"name": "Ripple", "type": "Criptomoneda"},
    "USDT": {"name": "Tether", "type": "Criptomoneda"},
}


# BYMA tickers are capped at 5 characters, so a CEDEAR whose peso ticker already uses all 5 gets an abbreviated
# dollar (MEP) line instead of ticker + "D".
DOLLAR_LINE_TICKERS = {"GOOGL": "GOGLD"}


def normalize_ticker(ticker: str) -> str:
    return ticker.strip().upper()


def dollar_line_ticker(ticker: str) -> str:
    """BYMA ticker of a CEDEAR's dollar (MEP) line."""
    return DOLLAR_LINE_TICKERS.get(ticker, f"{ticker}D")
