from pydantic import BaseModel, EmailStr
from typing import Optional
from uuid import UUID
from app.models.models import UserRole


class UserRegister(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    phone: Optional[str] = None
    is_nri: bool = False


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class GoogleAuthRequest(BaseModel):
    id_token: str   # Google ID token from frontend


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class RefreshRequest(BaseModel):
    refresh_token: str


class UserOut(BaseModel):
    id: UUID
    email: str
    full_name: str
    phone: Optional[str]
    role: UserRole
    is_nri: bool

    class Config:
        from_attributes = True
