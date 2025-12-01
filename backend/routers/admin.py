"""
Admin Router
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from database import get_db
from models import User, SystemConfig
from schemas import SystemConfigUpdate, SystemConfigResponse
from services.auth_service import get_current_admin_user

router = APIRouter()


@router.get("/config", response_model=SystemConfigResponse)
async def get_system_config(
    current_admin: User = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db)
):
    """Get system configuration (admin only)"""

    # Fetch all config values
    result = await db.execute(select(SystemConfig))
    configs = {config.key: config.value for config in result.scalars().all()}

    return {
        "allow_registration": configs.get("allow_registration", "true").lower() == "true",
        "max_upload_size_mb": int(configs.get("max_upload_size_mb", "10")),
        "max_daily_uploads": int(configs.get("max_daily_uploads", "20")),
        "ai_provider": configs.get("ai_provider", "openai")
    }


@router.put("/config", response_model=SystemConfigResponse)
async def update_system_config(
    config_update: SystemConfigUpdate,
    current_admin: User = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db)
):
    """Update system configuration (admin only)"""

    update_data = config_update.dict(exclude_unset=True)

    for key, value in update_data.items():
        result = await db.execute(
            select(SystemConfig).where(SystemConfig.key == key)
        )
        config = result.scalar_one_or_none()

        if config:
            config.value = str(value).lower() if isinstance(value, bool) else str(value)
        else:
            new_config = SystemConfig(
                key=key,
                value=str(value).lower() if isinstance(value, bool) else str(value)
            )
            db.add(new_config)

    await db.commit()

    # Return updated config
    return await get_system_config(current_admin, db)
