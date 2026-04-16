from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import create_access_token, hash_password, verify_password
from app.models.user import User
from app.schemas.user import LoginRequest, Token, UserCreate


class AuthService:
    @staticmethod
    async def register(db: AsyncSession, data: UserCreate) -> User:
        result = await db.execute(select(User).where(User.email == data.email))
        if result.scalar_one_or_none():
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")

        user = User(
            email=data.email,
            password_hash=hash_password(data.password),
            name=data.name,
        )
        db.add(user)
        await db.flush()
        return user

    @staticmethod
    async def login(db: AsyncSession, data: LoginRequest) -> Token:
        result = await db.execute(select(User).where(User.email == data.email))
        user = result.scalar_one_or_none()

        if not user or not verify_password(data.password, user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password",
            )

        return Token(access_token=create_access_token(user.id))
