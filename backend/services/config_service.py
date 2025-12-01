"""
Configuration Service - Load system configuration from database
"""
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Dict
from models import SystemConfig


async def load_llm_config(db: AsyncSession) -> Dict[str, str]:
    """
    Load LLM configuration from database.

    Returns a dictionary with all LLM-related configuration:
    {
        'ai_provider': 'openai',
        'openai_api_key': 'sk-...',
        'openai_base_url': 'https://api.openai.com/v1',
        'openai_model': 'gpt-4o-mini',
        ...
    }
    """
    # Fetch all config from database
    result = await db.execute(select(SystemConfig))
    db_configs = {config.key: config.value for config in result.scalars().all()}

    # Build configuration dictionary
    config = {
        'ai_provider': db_configs.get('ai_provider', 'openai'),
        # OpenAI
        'openai_api_key': db_configs.get('openai_api_key'),
        'openai_base_url': db_configs.get('openai_base_url', 'https://api.openai.com/v1'),
        'openai_model': db_configs.get('openai_model', 'gpt-4o-mini'),
        # Anthropic
        'anthropic_api_key': db_configs.get('anthropic_api_key'),
        'anthropic_model': db_configs.get('anthropic_model', 'claude-3-haiku-20240307'),
        # Qwen
        'qwen_api_key': db_configs.get('qwen_api_key'),
        'qwen_base_url': db_configs.get('qwen_base_url', 'https://dashscope.aliyuncs.com/compatible-mode/v1'),
        'qwen_model': db_configs.get('qwen_model', 'qwen-plus')
    }

    return config
