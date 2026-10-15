from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.amm import PredictionAMM
from app.models import Market, Position, User

LIVE_STATUSES = ("OPEN", "LOCKED")


async def get_positions_with_value(db: AsyncSession, user: User) -> list[dict]:
    """Açık pozisyonlar ve anlık bozdurma değerleri (AMM'ye satış simülasyonu)."""
    rows = (
        await db.execute(
            select(Position, Market)
            .join(Market, Market.id == Position.market_id)
            .where(
                Position.user_id == user.id,
                Position.shares > 0,
                Market.status.in_(LIVE_STATUSES),
            )
        )
    ).all()
    out = []
    for pos, market in rows:
        value = PredictionAMM(market.yes_pool, market.no_pool).sell_shares(pos.side, pos.shares)["payout_kp"]
        out.append(
            {
                "market_id": market.id,
                "slug": market.slug,
                "title": market.title,
                "side": pos.side,
                "shares": pos.shares,
                "total_invested_kp": pos.total_invested_kp,
                "avg_entry_probability": pos.avg_entry_probability,
                "current_value_kp": value,
            }
        )
    return out


async def get_portfolio_value(db: AsyncSession, user: User) -> tuple[Decimal, list[dict]]:
    """Net Worth = Nakit KP + Açık Hisselerin Anlık Bozdurma Değeri (PRD 3.A)."""
    positions = await get_positions_with_value(db, user)
    return user.kp_balance + sum((p["current_value_kp"] for p in positions), Decimal("0")), positions
