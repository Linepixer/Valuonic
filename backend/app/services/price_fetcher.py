import json
import math
import urllib.request
import time
import re
from typing import Dict, Optional

from app.core.asset_catalog import dollar_line_ticker

NO_PRICE = {"usd": 0.0, "ars": 0.0}

class PriceFetcher:
    _cached_rates = None
    _cache_timestamp = 0
    _CACHE_TTL = 300
    _cached_asset_prices = {}
    _asset_cache_timestamps = {}

    @staticmethod
    def _scrape_dolarhoy(url: str) -> Optional[float]:
        try:
            req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
            with urllib.request.urlopen(req, timeout=5) as response:
                html = response.read().decode()
                match = re.search(r'<div class="value">\$?([\d.,]+)</div>', html)
                if match:
                    val_str = match.group(1).replace(".", "").replace(",", ".")
                    return float(val_str)
        except Exception as e:
            print(f"Warning: DolarHoy Scrape failed for {url}: {e}")
        return None

    @staticmethod
    def _fetch_bitso(book: str) -> Optional[float]:
        url = f"https://api.bitso.com/v3/ticker/?book={book}"
        try:
            req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
            with urllib.request.urlopen(req, timeout=5) as response:
                data = json.loads(response.read().decode())
                return float(data["payload"]["last"])
        except Exception as e:
            print(f"Warning: Bitso fetch failed for {book}: {e}")
        return None

    @staticmethod
    def get_dollar_rates() -> Dict[str, float]:
        """
        Fetches current ARS/USD exchange rates from DolarHoy and Bitso.
        """
        now = time.time()
        if PriceFetcher._cached_rates and (now - PriceFetcher._cache_timestamp < PriceFetcher._CACHE_TTL):
            return PriceFetcher._cached_rates

        rates = {"bolsa": 1499.0, "cripto": 1541.0, "blue": 1500.0}
        
        mep = PriceFetcher._scrape_dolarhoy("https://dolarhoy.com/cotizaciondolarbolsa")
        if mep: rates["bolsa"] = mep
            
        blue = PriceFetcher._scrape_dolarhoy("https://dolarhoy.com/cotizaciondolarblue")
        if blue: rates["blue"] = blue
            
        cripto = PriceFetcher._fetch_bitso("usdt_ars")
        if cripto: rates["cripto"] = cripto

        PriceFetcher._cached_rates = rates
        PriceFetcher._cache_timestamp = now

        return rates

    @staticmethod
    def _scrape_iol_specific(ticker: str) -> Optional[float]:
        # Exact URLs mapping for specific CEDEARs
        urls = {
            "SPY": "https://iol.invertironline.com/titulo/cotizacion/BCBA/SPY/ETF-SPDR-S-P-500/",
            "SPYD": "https://iol.invertironline.com/titulo/cotizacion/BCBA/SPYD/ETF-SPDR-S-P-500/",
            "QQQ": "https://iol.invertironline.com/titulo/cotizacion/BCBA/QQQ/ETF-INVESCO-QQQ-TRUST/",
            "QQQD": "https://iol.invertironline.com/titulo/cotizacion/BCBA/QQQD/ETF-INVESCO-QQQ-TRUST/",
            "GLD": "https://iol.invertironline.com/titulo/cotizacion/BCBA/GLD/CEDEAR-ETF-SPDR-GOLD-TRUST/",
            "GLDD": "https://iol.invertironline.com/titulo/cotizacion/BCBA/GLDD/CEDEAR-ETF-SPDR-GOLD-TRUST/",
            "NVDA": "https://iol.invertironline.com/titulo/cotizacion/BCBA/NVDA/CEDEAR-NVIDIA-CORPORATION/",
            "NVDAD": "https://iol.invertironline.com/titulo/cotizacion/BCBA/NVDAD/CEDEAR-NVIDIA-CORPORATION/",
            "KO": "https://iol.invertironline.com/titulo/cotizacion/BCBA/KO/CEDEAR-THE-COCA-COLA-COMPANY/",
            "KOD": "https://iol.invertironline.com/titulo/cotizacion/BCBA/KOD/CEDEAR-THE-COCA-COLA-COMPANY/",
            "MELI": "https://iol.invertironline.com/titulo/cotizacion/BCBA/MELI/CEDEAR-MERCADOLIBRE-INC./",
            "MELID": "https://iol.invertironline.com/titulo/cotizacion/BCBA/MELID/CEDEAR-MERCADOLIBRE-INC./",
            # The CEDEAR on BCBA, not IOL's NASDAQ page for AAPL, which quotes the US share in dollars.
            "AAPL": "https://iol.invertironline.com/titulo/cotizacion/BCBA/AAPL/CEDEAR-APPLE-INC./",
            "AAPLD": "https://iol.invertironline.com/titulo/cotizacion/BCBA/AAPLD/CEDEAR-APPLE-INC./",
            "AMD": "https://iol.invertironline.com/titulo/cotizacion/BCBA/AMD/CEDEAR-ADVANCED-MICRO-DEVICES-/",
            "AMDD": "https://iol.invertironline.com/titulo/cotizacion/BCBA/AMDD/CEDEAR-ADVANCED-MICRO-DEVICES-/",
            "MSFT": "https://iol.invertironline.com/titulo/cotizacion/BCBA/MSFT/CEDEAR-MICROSOFT-CORP./",
            "MSFTD": "https://iol.invertironline.com/titulo/cotizacion/BCBA/MSFTD/CEDEAR-MICROSOFT-CORP./",
            # IOL still lists Meta under its old name.
            "META": "https://iol.invertironline.com/titulo/cotizacion/BCBA/META/CEDEAR-FACEBOOK--INC./",
            "METAD": "https://iol.invertironline.com/titulo/cotizacion/BCBA/METAD/CEDEAR-FACEBOOK--INC./",
            "TSLA": "https://iol.invertironline.com/titulo/cotizacion/BCBA/TSLA/CEDEAR-TESLA--INC./",
            "TSLAD": "https://iol.invertironline.com/titulo/cotizacion/BCBA/TSLAD/CEDEAR-TESLA--INC./",
            "GOOGL": "https://iol.invertironline.com/titulo/cotizacion/BCBA/GOOGL/CEDEAR-ALPHABET-INC.-CL.-A/",
            # GOOGL's dollar line (see DOLLAR_LINE_TICKERS); IOL still lists it under the old Google name.
            "GOGLD": "https://iol.invertironline.com/titulo/cotizacion/BCBA/GOGLD/CEDEAR-GOOGLE-INC./",
            "AMZN": "https://iol.invertironline.com/titulo/cotizacion/BCBA/AMZN/CEDEAR-AMAZON.COM--INC/",
            "AMZND": "https://iol.invertironline.com/titulo/cotizacion/BCBA/AMZND/CEDEAR-AMAZON.COM--INC/",
            "DIA": "https://iol.invertironline.com/titulo/cotizacion/BCBA/DIA/CEDEAR-SPDR-DOW-JONES-INDUSTRIAL/",
            "DIAD": "https://iol.invertironline.com/titulo/cotizacion/BCBA/DIAD/CEDEAR-SPDR-DOW-JONES-INDUSTRIAL/",
        }
        
        t = ticker.upper()
        # Fallback to dynamic URL
        url = urls.get(t, f"https://iol.invertironline.com/titulo/cotizacion/BCBA/{t}/")
        
        try:
            req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
            with urllib.request.urlopen(req, timeout=5) as response:
                html = response.read().decode()
                match = re.search(r'data-field="UltimoPrecio">([\d.,]+)<', html)
                if match:
                    val_str = match.group(1).replace(".", "").replace(",", ".")
                    return float(val_str)
        except Exception as e:
            print(f"Warning: IOL Scrape failed for {ticker}: {e}")
        return None

    @staticmethod
    def _is_valid_price(value: Optional[float]) -> bool:
        return value is not None and math.isfinite(value) and value > 0

    @staticmethod
    def fetch_asset_prices(ticker: str, asset_type: str) -> Optional[Dict[str, float]]:
        """Bypasses the cache. None on any failure, so a failed fetch is never mistaken for a price of 0."""
        t = ticker.upper()

        if t in ["USD", "USDT", "USDC"]:
            usd = 1.0
            if t == "USD":
                rates = PriceFetcher.get_dollar_rates()
                ars = rates.get("blue") or 1500.0
            else:
                ars = PriceFetcher._fetch_bitso("usdt_ars") or 1500.0
        else:
            rates = PriceFetcher.get_dollar_rates()
            usd_to_ars = rates.get("cripto") or 1500.0

            if asset_type.lower() == "criptomoneda":
                usd = PriceFetcher._fetch_bitso(f"{t.lower()}_usd")
                if not PriceFetcher._is_valid_price(usd):
                    print(f"Warning: no valid USD quote for {t} from Bitso")
                    return None

                # Fetch exact ARS price for supported Bitso markets
                ars = PriceFetcher._fetch_bitso(f"{t.lower()}_ars") if t in ["BTC", "ETH", "DAI", "USDT"] else None
                if not PriceFetcher._is_valid_price(ars):
                    ars = usd * usd_to_ars
            else:
                # Assume asset is a CEDEAR or ETF traded on IOL
                ars = PriceFetcher._scrape_iol_specific(t)
                if not PriceFetcher._is_valid_price(ars):
                    print(f"Warning: no valid ARS quote for {t} from IOL")
                    return None

                usd = PriceFetcher._scrape_iol_specific(dollar_line_ticker(t))
                if not PriceFetcher._is_valid_price(usd):
                    usd = ars / usd_to_ars

        if not (PriceFetcher._is_valid_price(usd) and PriceFetcher._is_valid_price(ars)):
            print(f"Warning: discarded invalid quote for {t}: usd={usd} ars={ars}")
            return None

        result = {"usd": usd, "ars": ars}
        PriceFetcher._cached_asset_prices[t] = result
        PriceFetcher._asset_cache_timestamps[t] = time.time()
        return result

    @staticmethod
    def get_asset_prices(ticker: str, asset_type: str) -> Dict[str, float]:
        t = ticker.upper()
        now = time.time()

        if now - PriceFetcher._asset_cache_timestamps.get(t, 0) < PriceFetcher._CACHE_TTL:
            return PriceFetcher._cached_asset_prices.get(t) or dict(NO_PRICE)

        result = PriceFetcher.fetch_asset_prices(ticker, asset_type)
        if result is not None:
            return result

        # Back off for a full TTL but keep serving the last valid quote.
        PriceFetcher._asset_cache_timestamps[t] = now
        return PriceFetcher._cached_asset_prices.get(t) or dict(NO_PRICE)
