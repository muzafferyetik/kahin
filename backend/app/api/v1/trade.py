from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import get_current_user
from app.db.session import get_db
from app.models import User
from app.schemas import BuyIn, BuyOut, SellIn, SellOut
from app.services import trading
from app.services.pubsub import publish_price_tick

router = APIRouter(prefix="/trade", tags=["trade"])


def _now_iso() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


@router.post("/buy", response_model=BuyOut)
async def buy(body: BuyIn, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    try:
        res = await trading.buy(db, user.id, body.market_id, body.side, body.amount_kp)
    except trading.TradeError as e:
        await db.rollback()
        raise HTTPException(e.status_code, e.message)
    ms = res["market_state"]
    await publish_price_tick(
        res["_market_id"], res["_slug"], ms["yes_prob"], ms["no_prob"], ms["volume_kp"], body.side, _now_iso()
    )
    return res


@router.post("/sell", response_model=SellOut)
async def sell(body: SellIn, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    try:
        res = await trading.sell(db, user.id, body.market_id, body.side, body.shares_to_sell)
    except trading.TradeError as e:
        await db.rollback()
        raise HTTPException(e.status_code, e.message)
    ms = res["market_state"]
    await publish_price_tick(
        res["_market_id"], res["_slug"], ms["yes_prob"], ms["no_prob"], res["_volume"], body.side, _now_iso()
    )
    return res
