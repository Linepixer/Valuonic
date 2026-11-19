"""
Brings this database's price and dollar-rate history, corporate events and CEDEAR ratios up to date from a
Valuonic instance's public market data.

    docker compose exec api python -m app.sync_prices

Only what is missing is added and the ratios are copied, so it is safe to run as often as you like.
"""
import os
import sys

import requests
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.services.market_data import import_market_data

DEFAULT_SOURCE_URL = "https://valuonic.linepixer.com/api/public/market-data"
TIMEOUT_SECONDS = 60


class SyncError(Exception):
    pass


def source_url() -> str:
    return os.getenv("MARKET_DATA_SOURCE_URL") or DEFAULT_SOURCE_URL


def sync(db: Session) -> dict:
    url = source_url()
    try:
        response = requests.get(url, timeout=TIMEOUT_SECONDS)
    except requests.RequestException as exc:
        raise SyncError(f"No se pudo conectar con {url}: {exc}") from exc
    if response.status_code == 404:
        raise SyncError(f"{url} no tiene el endpoint de datos de mercado (¿está deployada esa versión?).")
    if response.status_code == 429:
        raise SyncError("El origen limitó los pedidos. Probá de nuevo en una hora.")
    if not response.ok:
        raise SyncError(f"{url} respondió {response.status_code}.")
    try:
        data = response.json()
    except ValueError as exc:
        raise SyncError(f"{url} no devolvió JSON válido.") from exc
    try:
        return import_market_data(db, data)
    except ValueError as exc:
        raise SyncError(str(exc)) from exc


def describe(summary: dict) -> str:
    lines = [
        f"Precios nuevos: {summary['prices_added']} ({', '.join(summary['tickers']) or 'ningún activo'})",
        f"Cotizaciones del dólar nuevas: {summary['rates_added']}",
        f"Eventos corporativos nuevos: {summary['events_added']}",
        f"Ratios de CEDEAR actualizados: {summary['ratios_updated']}",
    ]
    for conflict in summary["event_conflicts"]:
        lines.append(f"Evento distinto al del origen, se dejó el local: {conflict}")
    if summary["skipped_tickers"]:
        lines.append(f"Omitidos (este código no los soporta todavía): {', '.join(summary['skipped_tickers'])}")
    return "\n".join(lines)


def main() -> int:
    print(f"Sincronizando datos de mercado desde {source_url()} ...")
    db = SessionLocal()
    try:
        summary = sync(db)
    except SyncError as exc:
        print(f"Error: {exc}")
        return 1
    finally:
        db.close()
    print(describe(summary))
    return 0


if __name__ == "__main__":
    sys.exit(main())
