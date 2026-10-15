from datetime import datetime, timezone
from decimal import ROUND_HALF_UP, Decimal
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.amm import PredictionAMM
from app.models import LeagueMember, Market, MarketPriceHistory, Position, User
from app.services.ledger import InsufficientBalance, apply_kp_change


class TradeError(Exception):
    def __init__(self, message: str, status_code: int = 400):
        super().__init__(message)
        self.message = message
        self.status_code = status_code


def _q2(v: Decimal) -> Decimal:
    return v.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


async def _lock_market_and_user(db: AsyncSession, market_id: UUID, user_id: UUID) -> tuple[Market, User]:
    """
    Deadlock'u önlemek için kilit sırası HER ZAMAN sabit: önce market, sonra user.
    """
    market = (
        await db.execute(
            select(Market)
            .where(Market.id == market_id)
            .with_for_update()
            .execution_options(populate_existing=True)
        )
    ).scalar_one_or_none()
    if market is None:
        raise TradeError("Soru bulunamadı.", 404)
    user = (
        await db.execute(
            select(User)
            .where(User.id == user_id)
            .with_for_update()
            .execution_options(populate_existing=True)
        )
    ).scalar_one()
    if market.status != "OPEN":
        raise TradeError("Bu soru alım-satıma kapalı.", 409)
    if market.closes_at <= datetime.now(timezone.utc):
        raise TradeError("Bu sorunun kapanış zamanı geçti.", 409)
    if market.league_id is not None:
        member = (
            await db.execute(
                select(LeagueMember).where(
                    LeagueMember.league_id == market.league_id,
                    LeagueMember.user_id == user_id,
                )
            )
        ).scalar_one_or_none()
        if member is None:
            raise TradeError("Bu soru özel bir Kanka Ligine aittir. Yalnızca lig üyeleri işlem yapabilir.", 403)
    return market, user


def _record_state(db: AsyncSession, market: Market, amm: PredictionAMM) -> dict:
    market.yes_pool = amm.yes_pool.quantize(Decimal("0.0001"), rounding=ROUND_HALF_UP)
    market.no_pool = amm.no_pool.quantize(Decimal("0.0001"), rounding=ROUND_HALF_UP)
    probs = amm.get_probabilities()
    db.add(
        MarketPriceHistory(
            market_id=market.id,
            yes_prob=probs["yes_prob"],
            no_prob=probs["no_prob"],
            volume_kp=market.volume_kp,
        )
    )
    return probs


async def buy(db: AsyncSession, user_id: UUID, market_id: UUID, side: str, amount_kp: Decimal) -> dict:
    market, user = await _lock_market_and_user(db, market_id, user_id)

    amm = PredictionAMM(market.yes_pool, market.no_pool)
    result = amm.buy_shares(side, amount_kp)
    shares = result["shares_received"]
    entry_prob = result["entry_probability"]

    try:
        await apply_kp_change(db, user, -amount_kp, "BUY_SHARES", market.id)
    except InsufficientBalance:
        raise TradeError("Yetersiz KP bakiyesi.", 400)

    pos = (
        await db.execute(
            select(Position)
            .where(Position.user_id == user.id, Position.market_id == market.id, Position.side == side)
            .with_for_update()
            .execution_options(populate_existing=True)
        )
    ).scalar_one_or_none()
    if pos is None:
        db.add(
            Position(
                user_id=user.id,
                market_id=market.id,
                side=side,
                shares=shares,
                total_invested_kp=amount_kp,
                avg_entry_probability=entry_prob,
            )
        )
    else:
        total_shares = pos.shares + shares
        # Hisse ağırlıklı giriş ihtimali (Kanıt Kartı ve Keskinlik Skoru için)
        pos.avg_entry_probability = (
            (pos.shares * pos.avg_entry_probability + shares * entry_prob) / total_shares
        ).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
        pos.shares = total_shares
        pos.total_invested_kp = pos.total_invested_kp + amount_kp

    market.volume_kp = market.volume_kp + amount_kp
    probs = _record_state(db, market, amm)
    await db.commit()

    return {
        "status": "success",
        "transaction": {
            "shares_bought": shares,
            "entry_probability": entry_prob,
            "remaining_kp_balance": user.kp_balance,
        },
        "market_state": {
            "yes_pool": market.yes_pool,
            "no_pool": market.no_pool,
            "yes_prob": probs["yes_prob"],
            "no_prob": probs["no_prob"],
            "volume_kp": market.volume_kp,
        },
        "_slug": market.slug,
        "_market_id": market.id,
    }


async def sell(db: AsyncSession, user_id: UUID, market_id: UUID, side: str, shares_to_sell: Decimal) -> dict:
    market, user = await _lock_market_and_user(db, market_id, user_id)

    pos = (
        await db.execute(
            select(Position)
            .where(Position.user_id == user.id, Position.market_id == market.id, Position.side == side)
            .with_for_update()
            .execution_options(populate_existing=True)
        )
    ).scalar_one_or_none()
    if pos is None or pos.shares < shares_to_sell:
        raise TradeError("Satılacak kadar hissen yok.", 400)

    amm = PredictionAMM(market.yes_pool, market.no_pool)
    result = amm.sell_shares(side, shares_to_sell)
    payout = result["payout_kp"]

    old_shares = pos.shares
    pos.shares = old_shares - shares_to_sell
    # Yatırılan KP, satılan oranda azaltılır
    pos.total_invested_kp = (
        _q2(pos.total_invested_kp * pos.shares / old_shares) if pos.shares > 0 else Decimal("0.00")
    )

    await apply_kp_change(db, user, payout, "SELL_SHARES", market.id)
    probs = _record_state(db, market, amm)
    await db.commit()

    return {
        "status": "success",
        "transaction": {
            "shares_sold": shares_to_sell,
            "payout_kp": payout,
            "new_kp_balance": user.kp_balance,
        },
        "market_state": {
            "yes_pool": market.yes_pool,
            "no_pool": market.no_pool,
            "yes_prob": probs["yes_prob"],
            "no_prob": probs["no_prob"],
        },
        "_slug": market.slug,
        "_market_id": market.id,
        "_volume": market.volume_kp,
    }
