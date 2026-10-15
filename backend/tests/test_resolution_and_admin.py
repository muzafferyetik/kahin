from decimal import Decimal
from uuid import UUID

from sqlalchemy import select

from app.models import Comment, LedgerEntry, Market, Position, User
from tests.conftest import make_market, register


async def test_post_comment_requires_50kp_position(client, db):
    h = await register(client, "yorumcu")
    m = await make_market(db)

    # 1. Pozisyonu yokken yorum yapmayı dener -> 403
    r = await client.post(
        f"/api/v1/markets/{m.id}/comments",
        headers=h,
        json={"content": "Bence bu kesin olur!"},
    )
    assert r.status_code == 403

    # 2. 20 KP'lik alım yapar (< 50 KP) -> 403
    await client.post(
        "/api/v1/trade/buy",
        headers=h,
        json={"market_id": str(m.id), "side": "YES", "amount_kp": 20},
    )
    r = await client.post(
        f"/api/v1/markets/{m.id}/comments",
        headers=h,
        json={"content": "Hala yetersiz hissem var."},
    )
    assert r.status_code == 403

    # 3. 50 KP daha alır (Toplam 70 KP >= 50 KP) -> 201 Created
    await client.post(
        "/api/v1/trade/buy",
        headers=h,
        json={"market_id": str(m.id), "side": "YES", "amount_kp": 50},
    )
    r = await client.post(
        f"/api/v1/markets/{m.id}/comments",
        headers=h,
        json={"content": "Kulis bilgisi: Maç çok sert geçecek!"},
    )
    assert r.status_code == 201, r.text
    c = r.json()
    assert c["username"] == "yorumcu"
    assert c["user_side"] == "YES"
    assert c["user_shares_snapshot"] > 0
    assert c["content"] == "Kulis bilgisi: Maç çok sert geçecek!"


async def test_resolve_market_pays_winners_and_updates_accuracy(client, db, make_admin):
    # Admin oluştur
    admin_h = await register(client, "admin_user")
    await make_admin("admin_user")

    # Kullanıcılar
    u1_h = await register(client, "user_yes")
    u2_h = await register(client, "user_no")

    m = await make_market(db)

    # user_yes 250 KP ile YES alır (450 hisse, %50 giriş ihtimali)
    buy_res = await client.post(
        "/api/v1/trade/buy",
        headers=u1_h,
        json={"market_id": str(m.id), "side": "YES", "amount_kp": 250},
    )
    assert buy_res.status_code == 200
    shares_bought = buy_res.json()["transaction"]["shares_bought"]
    assert shares_bought == 450.0

    # user_no 100 KP ile NO alır
    await client.post(
        "/api/v1/trade/buy",
        headers=u2_h,
        json={"market_id": str(m.id), "side": "NO", "amount_kp": 100},
    )

    # Admin soruyu sonuçlandırır: EVET KAZANDI
    res = await client.post(
        f"/api/v1/admin/markets/{m.id}/resolve",
        headers=admin_h,
        json={"outcome": "YES"},
    )
    assert res.status_code == 200, res.text
    assert res.json()["winner_count"] == 1
    assert res.json()["total_payout_kp"] == 450.0

    # user_yes kontrolü:
    # Başlangıç: 1000, Alım: -250 (kalan 750), Kazanç Payout: +450 -> Bakiye: 1200.00 KP
    u1 = (await db.execute(select(User).where(User.username == "user_yes"))).scalar_one()
    assert u1.kp_balance == Decimal("1200.00")

    # Keskinlik Skoru: (100 - 50.0) * 0.5 = 25.0
    assert u1.accuracy_score == Decimal("25.00")

    # Ledger kaydı: MARKET_PAYOUT
    payout_entry = (
        await db.execute(
            select(LedgerEntry).where(
                LedgerEntry.user_id == u1.id, LedgerEntry.tx_type == "MARKET_PAYOUT"
            )
        )
    ).scalar_one()
    assert payout_entry.amount == Decimal("450.00")

    # Soru durumu: RESOLVED_YES
    m_id = m.id
    db.expire_all()
    mk = (await db.execute(select(Market).where(Market.id == m_id))).scalar_one()
    assert mk.status == "RESOLVED_YES"


async def test_cancel_market_refunds_all_invested_kp(client, db, make_admin):
    admin_h = await register(client, "admin_cancel")
    await make_admin("admin_cancel")

    u1_h = await register(client, "user_refund")
    m = await make_market(db)

    # Kullanıcı 250 KP ile alım yapar (kalan 750)
    await client.post(
        "/api/v1/trade/buy",
        headers=u1_h,
        json={"market_id": str(m.id), "side": "YES", "amount_kp": 250},
    )

    # Admin soruyu iptal eder: CANCELLED
    r = await client.patch(
        f"/api/v1/admin/markets/{m.id}/status",
        headers=admin_h,
        json={"status": "CANCELLED"},
    )
    assert r.status_code == 200
    assert r.json()["total_kp_refunded"] == 250.0

    # Kullanıcı 250 KP'sini eksiksiz geri almıştır (bakiye 1000 KP)
    u1 = (await db.execute(select(User).where(User.username == "user_refund"))).scalar_one()
    assert u1.kp_balance == Decimal("1000.00")

    refund_entry = (
        await db.execute(
            select(LedgerEntry).where(
                LedgerEntry.user_id == u1.id, LedgerEntry.tx_type == "MARKET_REFUND"
            )
        )
    ).scalar_one()
    assert refund_entry.amount == Decimal("250.00")


async def test_leaderboard_endpoint(client, db):
    await register(client, "u_leader1")
    await register(client, "u_leader2")

    r = await client.get("/api/v1/leaderboard")
    assert r.status_code == 200
    data = r.json()
    assert "weekly_net_worth" in data
    assert "global_accuracy" in data
    assert len(data["weekly_net_worth"]) >= 2
    assert data["weekly_net_worth"][0]["rank"] == 1
