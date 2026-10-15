from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.security import create_access_token, get_current_user, hash_password, verify_password
from app.db.session import get_db
from app.models import User
from app.schemas import LoginIn, MeOut, RegisterIn, TokenOut
from app.services.ledger import apply_kp_change
from app.services.portfolio import get_portfolio_value

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=TokenOut, status_code=status.HTTP_201_CREATED)
async def register(body: RegisterIn, db: AsyncSession = Depends(get_db)):
    exists = (
        await db.execute(
            select(User.id).where(
                or_(User.username == body.username, User.email == body.email.lower())
            )
        )
    ).first()
    if exists:
        raise HTTPException(status.HTTP_409_CONFLICT, "Kullanıcı adı veya e-posta zaten kayıtlı.")

    # Bakiye 0 ile açılır; 1.000 KP başlangıç bakiyesi ledger üzerinden verilir (INITIAL_GRANT)
    user = User(
        username=body.username,
        email=body.email.lower(),
        password_hash=hash_password(body.password),
        kp_balance=Decimal("0.00"),
    )
    db.add(user)
    try:
        await db.flush()
        await apply_kp_change(db, user, settings.initial_grant_kp, "INITIAL_GRANT")
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(status.HTTP_409_CONFLICT, "Kullanıcı adı veya e-posta zaten kayıtlı.")
    return TokenOut(access_token=create_access_token(user.id))


@router.post("/login", response_model=TokenOut)
async def login(body: LoginIn, db: AsyncSession = Depends(get_db)):
    ident = body.username.strip()
    user = (
        await db.execute(select(User).where(or_(User.username == ident, User.email == ident.lower())))
    ).scalar_one_or_none()
    if user is None or not verify_password(body.password, user.password_hash):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Kullanıcı adı veya şifre hatalı.")
    return TokenOut(access_token=create_access_token(user.id))


@router.get("/me", response_model=MeOut)
async def me(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    portfolio_value, positions = await get_portfolio_value(db, user)
    return MeOut(
        id=user.id,
        username=user.username,
        email=user.email,
        kp_balance=user.kp_balance,
        diamond_balance=user.diamond_balance,
        accuracy_score=user.accuracy_score,
        tier=user.tier,
        streak_count=user.streak_count,
        is_admin=user.is_admin,
        portfolio_value_kp=portfolio_value,
        positions=positions,
    )
