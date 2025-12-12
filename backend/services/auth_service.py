"""
Authentication Service
"""
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional

from models import User
from database import get_db
from utils import decode_access_token

security = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
) -> User:
    """
    Get current authenticated user from JWT token.
    """
    token = credentials.credentials
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    # Decode token
    payload = decode_access_token(token)
    if payload is None:
        raise credentials_exception

    user_id = payload.get("sub")
    if user_id is None:
        raise credentials_exception

    # Convert user_id to int if it's a string
    try:
        user_id = int(user_id)
    except (ValueError, TypeError):
        raise credentials_exception

    # Get user from database
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if user is None:
        raise credentials_exception

    return user


async def get_current_admin_user(
    current_user: User = Depends(get_current_user)
) -> User:
    """
    Get current user and verify admin permissions.
    """
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    return current_user


async def get_optional_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: AsyncSession = Depends(get_db)
) -> Optional[User]:
    """
    Get current user if token is provided, otherwise return None.
    Useful for endpoints that work for both authenticated and anonymous users.
    """
    if credentials is None:
        return None

    try:
        return await get_current_user(credentials, db)
    except HTTPException:
        return None


async def get_current_user_from_token(token: str, db: AsyncSession) -> User:
    """
    Get current user from JWT token string (for SSE with query params).

    Args:
        token: JWT token string
        db: Database session

    Returns:
        User object

    Raises:
        Exception: If token is invalid or user not found
    """
    # Decode token
    payload = decode_access_token(token)
    if payload is None:
        raise Exception("Invalid token")

    user_id = payload.get("sub")
    if user_id is None:
        raise Exception("Invalid token payload")

    # Convert user_id to int if it's a string
    try:
        user_id = int(user_id)
    except (ValueError, TypeError):
        raise Exception("Invalid user ID")

    # Get user from database
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if user is None:
        raise Exception("User not found")

    return user
