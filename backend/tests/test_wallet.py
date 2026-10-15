from datetime import datetime, timedelta
from decimal import Decimal
from zoneinfo import ZoneInfo

from sqlalchemy import select, text

from app.models import User
from tests.conftest import register

TR = ZoneInfo("Europe/Istanbul")


async def _user(db) -> User:
    db.expire_all()
    return (await db.execute(select(User))).scalar_one()


async def test_daily_bonus_once_per_day(client, db):
    h = await register(client)
    r = await client.post("/api/v1/wallet/daily-bonus", headers=h)
    assert r.status_code == 200
    assert r.json()["granted_kp"] == 100.0 and r.json()["new_kp_balance"] == 1100.0
    assert r.json()["streak_count"] == 1
    assert (await client.post("/api/v1/wallet/daily-bonus", headers=h)).status_code == 409


async def test_seventh_day_streak_gives_250(client, db):
    h = await register(client)
    yesterday = datetime.now(TR) - timedelta(days=1)
    await db.execute(
        text("UPDATE users SET streak_count = 6, last_daily_claim_at = :t"), {"t": yesterday}
    )
    await db.commit()
    r = await client.post("/api/v1/wallet/daily-bonus", headers=h)
    assert r.json()["granted_kp"] == 250.0 and r.json()["streak_count"] == 7


async def test_broken_streak_resets(client, db):
    h = await register(client)
    three_days_ago = datetime.now(TR) - timedelta(days=3)
    await db.execute(text("UPDATE users SET streak_count = 5, last_daily_claim_at = :t"), {"t": three_days_ago})
    await db.commit()
    r = await client.post("/api/v1/wallet/daily-bonus", headers=h)
    assert r.json()["streak_count"] == 1 and r.json()["granted_kp"] == 100.0


async def test_bankruptcy_support_requires_low_portfolio(client, db):
    h = await register(client)
    assert (await client.post("/api/v1/wallet/bankruptcy-support", headers=h)).status_code == 409


async def test_bankruptcy_support_daily_limit(client, db):
    h = await register(client)
    for i in range(3):
        await db.execute(text("UPDATE users SET kp_balance = 10"))
        await db.commit()
        r = await client.post("/api/v1/wallet/bankruptcy-support", headers=h)
        assert r.status_code == 200, (i, r.text)
        assert r.json()["granted_kp"] == 200.0 and r.json()["new_kp_balance"] == 210.0

    await db.execute(text("UPDATE users SET kp_balance = 10"))
    await db.commit()
    assert (await client.post("/api/v1/wallet/bankruptcy-support", headers=h)).status_code == 409

    # Ertesi gün limit sıfırlanır
    yesterday = datetime.now(TR) - timedelta(days=1)
    await db.execute(text("UPDATE users SET last_bankruptcy_claim_at = :t"), {"t": yesterday})
    await db.commit()
    assert (await client.post("/api/v1/wallet/bankruptcy-support", headers=h)).status_code == 200
