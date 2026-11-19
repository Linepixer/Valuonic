"""
Imports a CEDEAR's daily price history from IOL's "Exportar a excel" files: one in pesos (e.g. NVDA) and one in
dollars (e.g. NVDAD), exported with the same date range.

    docker compose cp NVDA_Cotizaciones_Historicas.xls api:/tmp/
    docker compose cp NVDAD_Cotizaciones_Historicas.xls api:/tmp/
    docker compose exec api python -m app.import_iol_history NVDA /tmp/NVDA_Cotizaciones_Historicas.xls /tmp/NVDAD_Cotizaciones_Historicas.xls

It only shows what it would do until you add --apply. Days that already have a price are never touched, so it is
safe to run again.
"""
import argparse
import sys
from pathlib import Path

from app.core.asset_catalog import SUPPORTED_ASSETS, normalize_ticker
from app.database import SessionLocal
from app.models.asset import Asset
from app.services.catalog_service import ensure_catalog_assets
from app.services.iol_history import IolHistoryError, apply_import, parse_iol_export, plan_import

# These are priced by Bitso or are the dollar itself, so IOL has no CEDEAR history for them.
NOT_ON_IOL = {"Criptomoneda", "Fiat"}


def _ar(value: float) -> str:
    return f"{value:,.2f}".replace(",", "_").replace(".", ",").replace("_", ".")


def _read(path: str, expected_ticker: str, label: str):
    file = Path(path)
    if not file.is_file():
        raise IolHistoryError(f"No existe el archivo {path}. ¿Lo copiaste al contenedor con docker compose cp?")
    export = parse_iol_export(file.read_text(encoding="utf-8", errors="replace"), label)
    if export.ticker and export.ticker != expected_ticker:
        raise IolHistoryError(f"{label}: el archivo es de {export.ticker} y se esperaba {expected_ticker}. ¿Están invertidos?")
    if not export.ticker:
        print(f"Aviso: no pude leer de qué especie es {path}; verificá que sea {expected_ticker}.")
    return export


def main() -> int:
    parser = argparse.ArgumentParser(description="Importa el historial diario de un CEDEAR desde los exports de IOL.")
    parser.add_argument("ticker", help="Ticker en pesos, por ejemplo NVDA")
    parser.add_argument("pesos", help="Export de IOL de la especie en pesos (NVDA)")
    parser.add_argument("dolares", help="Export de IOL de la especie en dólares (NVDAD)")
    parser.add_argument("--apply", action="store_true", help="Guardar los precios (sin esto solo muestra qué haría)")
    args = parser.parse_args()

    ticker = normalize_ticker(args.ticker)
    spec = SUPPORTED_ASSETS.get(ticker)
    if spec is None:
        print(f"Error: {ticker} no está en el catálogo de activos soportados.")
        return 1
    if spec["type"] in NOT_ON_IOL:
        print(f"Error: {ticker} no cotiza en IOL como CEDEAR; su historial sale de otra fuente.")
        return 1

    db = SessionLocal()
    try:
        ars = _read(args.pesos, ticker, f"Archivo en pesos ({Path(args.pesos).name})")
        usd = _read(args.dolares, f"{ticker}D", f"Archivo en dólares ({Path(args.dolares).name})")
        ensure_catalog_assets(db)
        asset = db.query(Asset).filter(Asset.ticker == ticker).one()
        plan = plan_import(db, asset, ars, usd)
    except IolHistoryError as exc:
        print(f"Error: {exc}")
        db.close()
        return 1

    first, last = plan.rows[0][0], plan.rows[-1][0]
    new_rows = plan.new_rows
    print(f"{ticker}: {len(plan.rows)} días en los archivos, del {first:%d/%m/%Y} al {last:%d/%m/%Y}.")
    print(f"  Ya tenían precio: {len(plan.rows) - len(new_rows)} · Nuevos: {len(new_rows)}")
    if new_rows:
        sample = new_rows[-1]
        print(f"  Último nuevo: {sample[0]:%d/%m/%Y} · ${_ar(sample[1])} · USD {_ar(sample[2])}")
    if plan.warnings:
        print(f"Avisos ({len(plan.warnings)}):")
        for warning in plan.warnings:
            print(f"  - {warning}")

    try:
        if plan.errors:
            print(f"Errores ({len(plan.errors)}), no se puede importar así:")
            for error in plan.errors:
                print(f"  - {error}")
            return 1
        if not args.apply:
            print("Modo prueba: no se guardó nada. Para importar, agregá --apply.")
            return 0
        added = apply_import(db, asset, plan)
        print(f"Listo: {added} precios guardados.")
        return 0
    finally:
        db.close()


if __name__ == "__main__":
    sys.exit(main())
