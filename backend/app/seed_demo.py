"""
Loads a ready-to-use demo account into a local development database.

    docker compose exec api python -m app.seed_demo

Safe to run again: an existing demo account is kept as is and only the market data is refreshed.
"""
import csv
import sys
import unicodedata
from datetime import datetime
from decimal import Decimal
from pathlib import Path

from app.config import settings
from app.core.asset_catalog import SUPPORTED_ASSETS, normalize_ticker
from app.database import SessionLocal
from app.models.transaction import Transaction
from app.models.user import User
from app.schemas.transaction import TransactionCreate
from app.services import user_service
from app.services.catalog_service import ensure_catalog_assets
from app.services.transaction_service import bulk_create_transactions
from app.sync_prices import SyncError, describe, sync

DEMO_EMAIL = "demo@example.com"
DEMO_PASSWORD = "valuonic-demo"
DEMO_NAME = "Demo"
# Mounted read-only by docker-compose.yml; the same file can be imported from the app's CSV import screen.
DEMO_CSV = Path("/app/samples/demo_transactions.csv")

TYPE_NAMES = {"compra": "Compra", "venta": "Venta", "intereses": "Intereses", "interes": "Intereses", "fee de red": "Fee de Red"}


def _normalize_type(raw: str) -> str:
    plain = unicodedata.normalize("NFD", raw.strip().lower())
    plain = " ".join("".join(c for c in plain if unicodedata.category(c) != "Mn").split())
    if plain not in TYPE_NAMES:
        raise ValueError(f"Tipo de operación desconocido: {raw!r}")
    return TYPE_NAMES[plain]


def read_demo_transactions(path: Path) -> list[TransactionCreate]:
    """Parses the CSV the same way the app's import screen does (dates are DD/MM/YYYY HH:MM in APP_TIMEZONE)."""
    transactions = []
    with path.open(encoding="utf-8-sig", newline="") as f:
        for row in csv.DictReader(f):
            ticker = normalize_ticker(row["Activo"])
            if ticker not in SUPPORTED_ASSETS:
                raise ValueError(f"Activo no soportado en {path.name}: {ticker}")
            tx_type = _normalize_type(row["Tipo"])
            quantity = Decimal(row["Cantidad"])
            price = Decimal(row["Precio unitario"])
            is_cash_interest = tx_type == "Intereses" and quantity == 0
            transactions.append(TransactionCreate(
                timestamp=datetime.strptime(row["Fecha"].strip(), "%d/%m/%Y %H:%M"),
                ticker=ticker,
                type=tx_type,
                quantity=quantity,
                price_per_unit=Decimal(0) if is_cash_interest else price,
                total_value=price if is_cash_interest else quantity * price,
                operated_currency=row["Divisa operada"].strip(),
                platform=row.get("Plataforma") or None,
            ))
    return transactions


def main() -> int:
    # The demo password is published in the README, so this account must never exist on a real deployment.
    if settings.COOKIE_SECURE:
        print("seed_demo es solo para desarrollo local: FRONTEND_URL tiene que ser http://localhost:...")
        return 1
    # Second, independent lock: only the development compose file mounts samples/, so on a server this
    # stops before anything is written even if FRONTEND_URL were misconfigured.
    if not DEMO_CSV.exists():
        print(f"No encuentro {DEMO_CSV}: seed_demo solo corre con el docker-compose.yml de desarrollo, que monta samples/.")
        return 1

    db = SessionLocal()
    try:
        ensure_catalog_assets(db)

        # Market data goes first: importing the demo's ARS operations needs the dollar rate of each date.
        print("Bajando precios e historia del dólar ...")
        try:
            print(describe(sync(db)))
        except SyncError as exc:
            print(f"Aviso: {exc}")
            print("Sigo sin historia: los gráficos quedan vacíos y las operaciones en pesos se valúan mal en USD.")
            print("Cuando el origen responda, corré: docker compose exec api python -m app.sync_prices")

        user = db.query(User).filter(User.email == DEMO_EMAIL).first()
        if user is None:
            user = User(
                email=DEMO_EMAIL,
                name=DEMO_NAME,
                hashed_password=user_service.get_password_hash(DEMO_PASSWORD),
                is_verified=True,
                is_active=True,
            )
            db.add(user)
            db.commit()
            db.refresh(user)
            print(f"Usuario demo creado: {DEMO_EMAIL}")

        existing = db.query(Transaction).filter(Transaction.user_id == user.id).count()
        if existing:
            print(f"El usuario demo ya tiene {existing} transacciones; no se cargan de nuevo.")
        else:
            created = bulk_create_transactions(db, user.id, read_demo_transactions(DEMO_CSV))
            print(f"Transacciones de demo cargadas: {created}")
    finally:
        db.close()

    print("\nListo. Entrá a http://localhost:3000 con:")
    print(f"  Email:      {DEMO_EMAIL}")
    print(f"  Contraseña: {DEMO_PASSWORD}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
