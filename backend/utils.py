"""
Utility functions
"""
import hashlib
import re
from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
import os

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# JWT settings
SECRET_KEY = os.getenv("SECRET_KEY")
if not SECRET_KEY or len(SECRET_KEY) < 32:
    raise ValueError("SECRET_KEY must be set and at least 32 characters long")

ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days


def hash_password(password: str) -> str:
    """Hash a password"""
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against a hash"""
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create a JWT access token"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)

    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def decode_access_token(token: str) -> Optional[dict]:
    """Decode a JWT access token"""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        return None


def normalize_content(content: str) -> str:
    """
    Normalize content for deduplication.
    Removes whitespace, punctuation, and converts to lowercase.
    """
    # Remove all whitespace
    normalized = re.sub(r'\s+', '', content)
    # Remove punctuation
    normalized = re.sub(r'[^\w\u4e00-\u9fff]', '', normalized)
    # Convert to lowercase
    normalized = normalized.lower()
    return normalized


def calculate_content_hash(content: str) -> str:
    """
    Calculate MD5 hash of normalized content for deduplication.
    """
    normalized = normalize_content(content)
    return hashlib.md5(normalized.encode('utf-8')).hexdigest()


def get_file_extension(filename: str) -> str:
    """Get file extension from filename"""
    return filename.rsplit('.', 1)[-1].lower() if '.' in filename else ''


def is_allowed_file(filename: str) -> bool:
    """Check if file extension is allowed"""
    allowed_extensions = {'txt', 'pdf', 'doc', 'docx', 'xlsx', 'xls'}
    return get_file_extension(filename) in allowed_extensions
