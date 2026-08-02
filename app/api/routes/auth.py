from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import httpx
from uuid import UUID

from app.db.database import get_db
from app.core.security import (
    hash_password, verify_password,
    create_access_token, create_refresh_token, decode_token,
)
from app.core.dependencies import get_current_user, require_broker
from app.core.config import settings
from app.models.models import User, UserRole
from app.schemas.auth import (
    UserRegister, UserLogin, GoogleAuthRequest,
    TokenResponse, RefreshRequest, UserOut,
)

router = APIRouter(prefix="/auth", tags=["auth"])


def _issue_tokens(user: User) -> TokenResponse:
    access = create_access_token({"sub": str(user.id), "role": user.role})
    refresh = create_refresh_token({"sub": str(user.id)})
    return TokenResponse(access_token=access, refresh_token=refresh)


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(data: UserRegister, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == data.email))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already registered")

    user = User(
        email=data.email,
        hashed_password=hash_password(data.password),
        full_name=data.full_name,
        phone=data.phone,
        is_nri=data.is_nri,
        role=UserRole.user,
    )
    db.add(user)
    await db.flush()   # get the UUID before commit
    return _issue_tokens(user)


@router.post("/login", response_model=TokenResponse)
async def login(data: UserLogin, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == data.email))
    user = result.scalar_one_or_none()

    if not user or not user.hashed_password:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    if not verify_password(data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account disabled")

    return _issue_tokens(user)

@router.patch("/users/{user_id}/make-broker")
async def make_broker(
    user_id: UUID,
    current_user: User = Depends(require_broker),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(User).where(User.id == user_id)
    )
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.role = UserRole.broker

    await db.commit()
    await db.refresh(user)

    return {
        "message": f"{user.email} promoted to broker"
    }
@router.patch("/users/{user_id}/make-user")
async def make_user(
    user_id: UUID,
    current_user: User = Depends(require_broker),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(User).where(User.id == user_id)
    )
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.role = UserRole.user

    await db.commit()
    await db.refresh(user)

    return {
        "message": f"{user.email} changed to user"
    }

@router.post("/google", response_model=TokenResponse)
async def google_auth(data: GoogleAuthRequest, db: AsyncSession = Depends(get_db)):
    """
    Verify Google ID token, create or fetch user.
    Frontend sends the token after Google sign-in popup.
    """
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"https://oauth2.googleapis.com/tokeninfo?id_token={data.id_token}"
        )

    if resp.status_code != 200:
        raise HTTPException(status_code=401, detail="Invalid Google token")

    google_data = resp.json()

    # Verify token is for our app
    if google_data.get("aud") != settings.GOOGLE_CLIENT_ID:
        raise HTTPException(status_code=401, detail="Token audience mismatch")

    google_id = google_data["sub"]
    email = google_data["email"]
    full_name = google_data.get("name", "")

    # Check if user exists by google_id or email
    result = await db.execute(select(User).where(User.google_id == google_id))
    user = result.scalar_one_or_none()

    if not user:
        result = await db.execute(select(User).where(User.email == email))
        user = result.scalar_one_or_none()

    if not user:
        # New user — create account
        user = User(
            email=email,
            full_name=full_name,
            google_id=google_id,
            role=UserRole.user,
        )
        db.add(user)
        await db.flush()
    else:
        # Link google_id if signing in via Google for first time
        if not user.google_id:
            user.google_id = google_id

    return _issue_tokens(user)


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(data: RefreshRequest, db: AsyncSession = Depends(get_db)):
    payload = decode_token(data.refresh_token)
    if not payload or payload.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Invalid refresh token")

    from uuid import UUID
    result = await db.execute(select(User).where(User.id == UUID(payload["sub"])))
    user = result.scalar_one_or_none()

    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="User not found")

    return _issue_tokens(user)


@router.get("/me", response_model=UserOut)
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user


@router.post("/logout")
async def logout():
    # JWT is stateless — client deletes tokens
    # For server-side invalidation, store refresh token in DB (future enhancement)
    return {"message": "Logged out successfully"}
