import math

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID

from app.database import get_db
from app.models.user import User
from app.models.asset import Asset
from app.models.corporate_event import CorporateEvent, HOLDINGS_MULTIPLIER_TYPES, RATIO_CHANGE
from app.schemas.corporate_event import CorporateEventCreate, CorporateEventResponse
from app.api.dependencies import get_current_superadmin

router = APIRouter(
    prefix="/corporate-events",
    tags=["corporate-events"]
)

@router.get("/", response_model=List[CorporateEventResponse])
def get_corporate_events(
    asset_id: UUID = None,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_superadmin)
):
    query = db.query(CorporateEvent)
    if asset_id:
        query = query.filter(CorporateEvent.asset_id == asset_id)
        
    events = query.order_by(CorporateEvent.timestamp.desc()).all()
    
    # Add asset ticker for UI convenience
    for event in events:
        if event.asset:
            event.asset_ticker = event.asset.ticker
            
    return events

@router.post("/", response_model=CorporateEventResponse)
def create_corporate_event(
    event: CorporateEventCreate,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_superadmin)
):
    # Verify asset exists
    asset = db.query(Asset).filter(Asset.id == event.asset_id).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Activo no encontrado")
    if event.type not in HOLDINGS_MULTIPLIER_TYPES:
        raise HTTPException(status_code=400, detail="Tipo de evento desconocido")
    if not math.isfinite(event.ratio) or event.ratio <= 0:
        raise HTTPException(status_code=400, detail="El ratio tiene que ser un número mayor a cero")

    db_event = CorporateEvent(
        asset_id=event.asset_id,
        type=event.type,
        ratio=event.ratio,
        timestamp=event.timestamp
    )
    
    if event.type == RATIO_CHANGE:
        asset.current_ratio = (asset.current_ratio or 1.0) * event.ratio

    db.add(db_event)
    db.commit()
    db.refresh(db_event)
    
    db_event.asset_ticker = asset.ticker
    return db_event

@router.delete("/{event_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_corporate_event(
    event_id: UUID,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_superadmin)
):
    db_event = db.query(CorporateEvent).filter(CorporateEvent.id == event_id).first()
    if not db_event:
        raise HTTPException(status_code=404, detail="Evento corporativo no encontrado")

    # current_ratio is the product of every ratio change applied so far, so deleting one divides its factor back out.
    if db_event.type == RATIO_CHANGE and db_event.ratio and db_event.asset:
        db_event.asset.current_ratio = (db_event.asset.current_ratio or 1.0) / db_event.ratio

    db.delete(db_event)
    db.commit()
    return None
