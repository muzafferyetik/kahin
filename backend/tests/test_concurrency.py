import asyncio
from decimal import Decimal

from sqlalchemy import func, select

from app.models import LedgerEntry, Market, User
from tests.conftest import make_market, register


async def test_parallel_buys_never_overdraw(client, db):
    """Tek kullanıcı, 20 paralel 100 KP alım (bakiye 1000): tam 10'u başarılı olmalı."""
    h = await register(client)
    m = await make_market(db)

    async def one():
        return await client.post(
            "/api/v1/trade/buy", headers=h, json={"market_id": str(m.id), "side": "YES", "amount_kp": 100}
        )

    results = await asyncio.gather(*[one() for _ in range(20)])
    codes = sorted(r.status_code for r in results)
    assert codes.count(200) == 10 and codes.count(400) == 10, codes

    db.expire_all()
    user = (await db.execute(select(User))).scalar_one()
    assert user.kp_balance == Decimal("0.00")
    total = (await db.execute(select(func.sum(LedgerEntry.amount)).where(LedgerEntry.user_id == user.id))).scalar()
    assert total == user.kp_balance

    mk = (await db.execute(select(Market))).scalar_one()
    assert mk.volume_kp == Decimal("1000.00")


async def test_many_users_parallel_trades_keep_invariants(client, db):
    """5 kullanıcı aynı soruda paralel al/sat: k sabit kalmalı, ledger toplamı = bakiye."""
    m = await make_market(db)
    headers = [await register(client, f"user{i}") for i in range(5)]

    async def flow(h):
        for _ in range(3):
            await client.post(
                "/api/v1/trade/buy", headers=h, json={"market_id": str(m.id), "side": "YES", "amount_kp": 50}
            )
            await client.post(
                "/api/v1/trade/buy", headers=h, json={"market_id": str(m.id), "side": "NO", "amount_kp": 30}
            )
        await client.post(
            "/api/v1/trade/sell", headers=h, json={"market_id": str(m.id), "side": "YES", "shares_to_sell": 20}
        )

    await asyncio.gather(*[flow(h) for h in headers])

    db.expire_all()
    mk = (await db.execute(select(Market))).scalar_one()
    # k = yes * no, alım/satım boyunca korunur (4 ondalık yuvarlama toleransı)
    assert abs(mk.yes_pool * mk.no_pool - Decimal("1000000")) < Decimal("5")

    for u in (await db.execute(select(User))).scalars():
        total = (await db.execute(select(func.sum(LedgerEntry.amount)).where(LedgerEntry.user_id == u.id))).scalar()
        assert total == u.kp_balance
        assert u.kp_balance >= 0
