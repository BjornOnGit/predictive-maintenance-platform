from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from uuid import UUID

from app.core.database import get_db
from app.api.deps import get_current_user, require_engineer
from app.models.user import User
from app.models.asset import Asset
from app.schemas.asset import AssetCreate, AssetRead, AssetUpdate

router = APIRouter(prefix="/assets", tags=["assets"])


@router.post("", response_model=AssetRead, status_code=status.HTTP_201_CREATED)
def create_asset(
    asset_data: AssetCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_engineer)
):
    new_asset = Asset(**asset_data.dict())
    db.add(new_asset)
    db.commit()
    db.refresh(new_asset)
    return new_asset


@router.get("", response_model=list[AssetRead])
def list_assets(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    assets = db.query(Asset).all()
    return assets


@router.get("/{asset_id}", response_model=AssetRead)
def get_asset(
    asset_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    asset = db.query(Asset).filter(Asset.id == asset_id).first()
    if not asset:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Asset not found"
        )
    return asset
