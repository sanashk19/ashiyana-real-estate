from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from uuid import UUID

from app.db.database import get_db
from app.core.security import decode_token
from app.models.models import User, UserRole

security_scheme = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if not credentials:
        raise credentials_exception

    token = credentials.credentials
    payload = decode_token(token)
    if not payload or payload.get("type") != "access":
        raise credentials_exception

    user_id: str = payload.get("sub")
    if not user_id:
        raise credentials_exception

    result = await db.execute(select(User).where(User.id == UUID(user_id)))
    user = result.scalar_one_or_none()

    if not user or not user.is_active:
        raise credentials_exception

    return user


async def get_optional_user(
    credentials: HTTPAuthorizationCredentials = Depends(security_scheme),
    db: AsyncSession = Depends(get_db),
) -> User | None:
    """For endpoints accessible by both logged-in and anonymous users."""
    if not credentials:
        return None
    try:
        return await get_current_user(credentials, db)
    except HTTPException:
        return None


def require_broker(current_user: User = Depends(get_current_user)) -> User:
    """
    Dependency that blocks non-broker users from broker-only endpoints.
    The private AI estimator, full addresses, and CRM use this.
    """
    if current_user.role != UserRole.broker:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Broker access required",
        )
    return current_user


def require_registered_user(current_user: User = Depends(get_current_user)) -> User:
    """Registered users (buyers/sellers) — for saving properties, viewing docs."""
    if current_user.role not in (UserRole.user, UserRole.seller, UserRole.broker):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account required",
        )
    return current_user


def require_seller(current_user: User = Depends(get_current_user)) -> User:
    """
    Dependency that ensures authenticated user is a registered seller or broker.
    """
    if current_user.role not in (UserRole.seller, UserRole.broker):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Seller account required",
        )
    return current_user