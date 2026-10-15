from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.security import get_current_user
from app.db.session import get_db
from app.models import User
from app.schemas import WalletOut
from app.services.ledger import apply_kp_change
from app.services.portfolio import get_portfolio_value

router = APIRouter(prefix="/wallet", tags=["wallet"])

TR = ZoneInfo("Europe/Istanbul")


def _today() -> "datetime.date":
    return datetime.now(TR).date()


async def _locked_user(db: AsyncSession, user_id) -> User:
    return (
        await db.execute(
            select(User)
            .where(User.id == user_id)
            .with_for_update()
            .execution_options(populate_existing=True)
        )
    ).scalar_one()


@router.post("/daily-bonus", response_model=WalletOut)
async def daily_bonus(current: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    user = await _locked_user(db, current.id)
    today = _today()
    last_day = user.last_daily_claim_at.astimezone(TR).date() if user.last_daily_claim_at else None

    if last_day == today:
        raise HTTPException(status.HTTP_409_CONFLICT, "Günlük bonus bugün zaten alındı.")

    # Kesintisiz seri: dün alındıysa devam, aksi halde başa dön
    user.streak_count = user.streak_count + 1 if last_day == today - timedelta(days=1) else 1
    user.last_daily_claim_at = datetime.now(TR)

    is_streak_day = user.streak_count % settings.streak_cycle_days == 0
    amount = settings.streak_bonus_kp if is_streak_day else settings.daily_bonus_kp
    await apply_kp_change(db, user, amount, "DAILY_BONUS")
    await db.commit()
    return WalletOut(granted_kp=amount, new_kp_balance=user.kp_balance, streak_count=user.streak_count)


@router.post("/bankruptcy-support", response_model=WalletOut)
async def bankruptcy_support(current: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    user = await _locked_user(db, current.id)

    portfolio_value, _ = await get_portfolio_value(db, user)
    if portfolio_value >= settings.bankruptcy_threshold_kp:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            f"Toplam portföy değeri {settings.bankruptcy_threshold_kp} KP altında olmalı.",
        )

    today = _today()
    last_day = user.last_bankruptcy_claim_at.astimezone(TR).date() if user.last_bankruptcy_claim_at else None
    if last_day != today:
        user.daily_bankruptcy_claims = 0
    if user.daily_bankruptcy_claims >= settings.bankruptcy_daily_limit:
        raise HTTPException(status.HTTP_409_CONFLICT, "Günlük iflas desteği limiti doldu.")

    # NOT (MVP): ödüllü reklam / günlük görev doğrulaması henüz yok; limit ve eşik sunucuda zorlanıyor.
    user.daily_bankruptcy_claims += 1
    user.last_bankruptcy_claim_at = datetime.now(TR)
    await apply_kp_change(db, user, settings.bankruptcy_support_kp, "BANKRUPTCY_SUPPORT")
    await db.commit()
    return WalletOut(granted_kp=settings.bankruptcy_support_kp, new_kp_balance=user.kp_balance)
