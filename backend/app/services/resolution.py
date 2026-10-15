import logging
from datetime import datetime, timezone
from decimal import ROUND_HALF_UP, Decimal
from typing import Literal
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models import Market, Position, User
from app.services.ledger import apply_kp_change
from app.services.pubsub import get_redis

log = logging.getLogger("kahin.resolution")


class ResolutionError(Exception):
    def __init__(self, message: str, status_code: int = 400):
        super().__init__(message)
        self.message = message
        self.status_code = status_code


def _current_week_key() -> str:
    """Redis haftalık liderlik tablosu anahtarı (Örn: leaderboard:weekly:2026_42)"""
    now = datetime.now(timezone.utc)
    year, week, _ = now.isocalendar()
    return f"leaderboard:weekly:{year}_{week:02d}"


async def lock_market(db: AsyncSession, market_id: UUID) -> Market:
    market = (
        await db.execute(select(Market).where(Market.id == market_id).with_for_update())
    ).scalar_one_or_none()
    if market is None:
        raise ResolutionError("Soru bulunamadı.", 404)
    if market.status not in ("OPEN", "DRAFT"):
        raise ResolutionError(f"Bu soru zaten '{market.status}' durumunda.", 409)

    market.status = "LOCKED"
    await db.commit()
    await db.refresh(market)
    return market


async def cancel_market(db: AsyncSession, market_id: UUID) -> dict:
    """
    Beklenmedik bir durumda soruyu iptal eder ve herkesin yatırdığı KP'yi iade eder.
    """
    market = (
        await db.execute(select(Market).where(Market.id == market_id).with_for_update())
    ).scalar_one_or_none()
    if market is None:
        raise ResolutionError("Soru bulunamadı.", 404)
    if market.status in ("RESOLVED_YES", "RESOLVED_NO", "CANCELLED"):
        raise ResolutionError(f"Bu soru zaten sonuçlandırılmış: {market.status}", 409)

    # Açık pozisyonları olan tüm kullanıcılara yatırdıkları KP'yi iade et
    positions = (
        await db.execute(
            select(Position)
            .where(Position.market_id == market.id, Position.total_invested_kp > 0)
            .with_for_update()
        )
    ).scalars().all()

    total_refunded = Decimal("0.00")
    user_count = 0

    for pos in positions:
        if pos.total_invested_kp <= 0:
            continue
        user = (
            await db.execute(
                select(User).where(User.id == pos.user_id).with_for_update()
            )
        ).scalar_one()

        refund_amount = pos.total_invested_kp
        await apply_kp_change(db, user, refund_amount, "MARKET_REFUND", market.id)
        total_refunded += refund_amount
        user_count += 1
        pos.shares = Decimal("0.0000")
        pos.total_invested_kp = Decimal("0.00")

    market.status = "CANCELLED"
    market.resolved_at = datetime.now(timezone.utc)
    await db.commit()

    return {
        "status": "success",
        "market_id": str(market.id),
        "new_status": "CANCELLED",
        "users_refunded": user_count,
        "total_kp_refunded": float(total_refunded),
    }


async def resolve_market(db: AsyncSession, market_id: UUID, outcome: Literal["YES", "NO"]) -> dict:
    """
    Soruyu resmi sonuca göre sonuçlandırır:
    1. Kazanan taraftaki her 1 Hisse = 1.00 KP olarak ödenir (MARKET_PAYOUT).
    2. Keskinlik Skoru formülü: round((100 - avg_entry_probability) * 0.5, 2)
    3. Redis Canlı Liderlik Tabloları güncellenir.
    """
    market = (
        await db.execute(select(Market).where(Market.id == market_id).with_for_update())
    ).scalar_one_or_none()
    if market is None:
        raise ResolutionError("Soru bulunamadı.", 404)
    if market.status in ("RESOLVED_YES", "RESOLVED_NO", "CANCELLED"):
        raise ResolutionError(f"Bu soru zaten sonuçlandırılmış: {market.status}", 409)

    # Kazanan taraftaki pozisyonları getir
    winners = (
        await db.execute(
            select(Position)
            .where(
                Position.market_id == market.id,
                Position.side == outcome,
                Position.shares > 0,
            )
            .with_for_update()
        )
    ).scalars().all()

    total_payout_kp = Decimal("0.00")
    winner_count = 0

    for pos in winners:
        # 1 Kazanan Hisse = 1.00 KP
        payout = pos.shares.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
        if payout <= 0:
            continue

        user = (
            await db.execute(
                select(User)
                .where(User.id == pos.user_id)
                .with_for_update()
                .execution_options(populate_existing=True)
            )
        ).scalar_one()

        await apply_kp_change(db, user, payout, "MARKET_PAYOUT", market.id)
        total_payout_kp += payout
        winner_count += 1

        # Keskinlik Skoru: round((100 - avg_entry_prob) * 0.5, 2)
        entry_prob = pos.avg_entry_probability
        accuracy_pts = ((Decimal("100") - entry_prob) * Decimal("0.5")).quantize(
            Decimal("0.01"), rounding=ROUND_HALF_UP
        )
        if accuracy_pts > 0:
            user.accuracy_score = (user.accuracy_score + accuracy_pts).quantize(
                Decimal("0.01"), rounding=ROUND_HALF_UP
            )

        # Hisseleri sıfırla
        pos.shares = Decimal("0.0000")
        pos.total_invested_kp = Decimal("0.00")

        # Redis Liderlik Tablolarını Güncelle (Best-effort)
        try:
            r = get_redis()
            weekly_key = _current_week_key()
            # Net worth = yeni bakiye
            await r.zadd(weekly_key, {str(user.id): float(user.kp_balance)})
            # Accuracy score
            await r.zadd("leaderboard:accuracy:global", {str(user.id): float(user.accuracy_score)})
        except Exception as exc:  # noqa: BLE001
            log.warning("Redis leaderboard güncellenemedi: %s", exc)

    # Kaybeden pozisyonların hisselerini de sıfırla
    losing_side = "NO" if outcome == "YES" else "YES"
    losers = (
        await db.execute(
            select(Position)
            .where(Position.market_id == market.id, Position.side == losing_side)
            .with_for_update()
        )
    ).scalars().all()

    for lpos in losers:
        lpos.shares = Decimal("0.0000")
        lpos.total_invested_kp = Decimal("0.00")

    market.status = "RESOLVED_YES" if outcome == "YES" else "RESOLVED_NO"
    market.resolved_at = datetime.now(timezone.utc)
    await db.commit()

    return {
        "status": "success",
        "market_id": str(market.id),
        "outcome": outcome,
        "new_status": market.status,
        "winner_count": winner_count,
        "total_payout_kp": float(total_payout_kp),
    }
