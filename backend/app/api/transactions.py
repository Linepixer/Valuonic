from fastapi import APIRouter, Body, Depends, HTTPException, Request, status
from typing import Annotated, List
from sqlalchemy.orm import Session
from uuid import UUID

from app.database import get_db
from app.api.dependencies import get_current_user
from app.models.user import User
from app.models.transaction import Transaction
from app.schemas.transaction import TransactionCreate, TransactionResponse
from app.core.asset_catalog import SUPPORTED_ASSETS, normalize_ticker
from app.core.rate_limit import limiter
from app.services.catalog_service import get_or_create_catalog_asset
from app.services.transaction_service import bulk_create_transactions

router = APIRouter(
    prefix="/transactions",
    tags=["transactions"]
)

MAX_BULK_TRANSACTIONS = 5000

def _reject_unsupported(tickers: set[str]) -> None:
    unsupported = sorted(tickers - SUPPORTED_ASSETS.keys())
    if unsupported:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Activo no soportado: {', '.join(unsupported)}"
        )

@router.post("/", response_model=TransactionResponse, status_code=status.HTTP_201_CREATED)
def create_transaction(
    tx_in: TransactionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    ticker = normalize_ticker(tx_in.ticker)
    _reject_unsupported({ticker})
    asset = get_or_create_catalog_asset(db, ticker)

    db_tx = Transaction(
        user_id=current_user.id,
        asset_id=asset.id,
        type=tx_in.type,
        quantity=tx_in.quantity,
        price_per_unit=tx_in.price_per_unit,
        total_value=tx_in.total_value,
        operated_currency=tx_in.operated_currency,
        exchange_rate=tx_in.exchange_rate,
        platform=tx_in.platform,
        notes=tx_in.notes
    )
    if tx_in.timestamp:
        db_tx.timestamp = tx_in.timestamp

    db.add(db_tx)
    db.commit()
    db.refresh(db_tx)
    
    # Attach fields required by the TransactionResponse schema
    setattr(db_tx, "ticker", asset.ticker)
    setattr(db_tx, "asset_type", asset.type)
    
    return db_tx

@router.post("/bulk", status_code=status.HTTP_201_CREATED)
@limiter.limit("10/minute")
def create_bulk_transactions(
    request: Request,
    txs_in: Annotated[List[TransactionCreate], Body(max_length=MAX_BULK_TRANSACTIONS)],
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Validate the whole file first so a bad row can't leave a half-imported history behind.
    _reject_unsupported({normalize_ticker(tx.ticker) for tx in txs_in})
    created_count = bulk_create_transactions(db, current_user.id, txs_in)
    return {"message": "Transacciones importadas exitosamente", "count": created_count}

@router.get("/", response_model=list[TransactionResponse])
def get_transactions(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    transactions = db.query(Transaction).filter(
        Transaction.user_id == current_user.id
    ).order_by(Transaction.timestamp.desc()).all()
    
    # Attach ticker and asset_type for the response schema
    for tx in transactions:
        setattr(tx, "ticker", tx.asset.ticker if tx.asset else "N/A")
        setattr(tx, "asset_type", tx.asset.type if tx.asset else "Unknown")
        
    return transactions

@router.delete("/all", status_code=status.HTTP_204_NO_CONTENT)
def delete_all_transactions(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    db.query(Transaction).filter(Transaction.user_id == current_user.id).delete()
    db.commit()

@router.delete("/{transaction_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_transaction(
    transaction_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    tx = db.query(Transaction).filter(
        Transaction.id == transaction_id,
        Transaction.user_id == current_user.id
    ).first()
    
    if not tx:
        raise HTTPException(status_code=404, detail="Transacción no encontrada")
        
    db.delete(tx)
    db.commit()
