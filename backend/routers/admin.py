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

    # Mask API keys (show only first 10 and last 4 characters)
    def mask_api_key(key):
        if not key or len(key) < 20:
            return key
        return f"{key[:10]}...{key[-4:]}"

    return {
        "allow_registration": configs.get("allow_registration", "true").lower() == "true",
        "max_upload_size_mb": int(configs.get("max_upload_size_mb", "10")),
        "max_daily_uploads": int(configs.get("max_daily_uploads", "20")),
        "ai_provider": configs.get("ai_provider", "openai"),
        # API Configuration
        "openai_api_key": mask_api_key(configs.get("openai_api_key")),
        "openai_base_url": configs.get("openai_base_url", "https://api.openai.com/v1"),
        "openai_model": configs.get("openai_model", "gpt-4o-mini"),
        "anthropic_api_key": mask_api_key(configs.get("anthropic_api_key")),
        "anthropic_model": configs.get("anthropic_model", "claude-3-haiku-20240307"),
        "qwen_api_key": mask_api_key(configs.get("qwen_api_key")),
        "qwen_base_url": configs.get("qwen_base_url", "https://dashscope.aliyuncs.com/compatible-mode/v1"),
        "qwen_model": configs.get("qwen_model", "qwen-plus")
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
