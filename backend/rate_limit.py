"""Rate limiting utilities for the FastAPI application."""

from slowapi import Limiter
from slowapi.util import get_remote_address


limiter = Limiter(key_func=get_remote_address)


__all__ = ["limiter"]
