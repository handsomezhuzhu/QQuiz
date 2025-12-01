"""
Database configuration and session management
"""
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.pool import NullPool
from contextlib import asynccontextmanager
from typing import AsyncGenerator
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Get database URL from environment
DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    raise ValueError("DATABASE_URL environment variable is not set")

# Create async engine
engine = create_async_engine(
    DATABASE_URL,
    echo=False,  # Set to True for SQL query logging during development
    future=True,
    poolclass=NullPool if "sqlite" in DATABASE_URL else None,
)

# Create async session factory
AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """
    Dependency for getting async database session.

    Usage in FastAPI:
        @app.get("/items")
        async def get_items(db: AsyncSession = Depends(get_db)):
            ...
    """
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def init_db():
    """
    Initialize database tables.
    Should be called during application startup.
    """
    from models import Base

    async with engine.begin() as conn:
        # Create all tables
        await conn.run_sync(Base.metadata.create_all)
        print("✅ Database tables created successfully")


async def init_default_config(db: AsyncSession):
    """
    Initialize default system configurations if not exists.
    """
    from models import SystemConfig, User
    from sqlalchemy import select
    from passlib.context import CryptContext

    pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

    # Default configurations
    default_configs = {
        "allow_registration": os.getenv("ALLOW_REGISTRATION", "true"),
        "max_upload_size_mb": os.getenv("MAX_UPLOAD_SIZE_MB", "10"),
        "max_daily_uploads": os.getenv("MAX_DAILY_UPLOADS", "20"),
        "ai_provider": os.getenv("AI_PROVIDER", "openai"),
    }

    for key, value in default_configs.items():
        result = await db.execute(select(SystemConfig).where(SystemConfig.key == key))
        existing = result.scalar_one_or_none()

        if not existing:
            config = SystemConfig(key=key, value=str(value))
            db.add(config)
            print(f"✅ Created default config: {key} = {value}")

    # Create default admin user if not exists
    result = await db.execute(select(User).where(User.username == "admin"))
    admin = result.scalar_one_or_none()

    if not admin:
        admin_user = User(
            username="admin",
            hashed_password=pwd_context.hash("admin123"),  # Change this password!
            is_admin=True
        )
        db.add(admin_user)
        print("✅ Created default admin user (username: admin, password: admin123)")
        print("⚠️  IMPORTANT: Please change the admin password immediately!")

    await db.commit()


@asynccontextmanager
async def get_db_context():
    """
    Context manager for getting database session outside of FastAPI dependency injection.

    Usage:
        async with get_db_context() as db:
            result = await db.execute(...)
    """
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
