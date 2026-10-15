from decimal import Decimal

from sqlalchemy import func, select, text

from app.models import LedgerEntry, Market, MarketPriceHistory, Position, User
from tests.conftest import make_market, register


async def test_register_login_me(client, db):
    h = await register(client, "ahmet")
    r = await client.get("/api/v1/auth/me", headers=h)
    assert r.status_code == 200
    body = r.json()
    assert body["username"] == "ahmet"
    assert body["kp_balance"] == 1000.0
    assert body["tier"] == "CAYLAK"

    # Başlangıç bakiyesi ledger üzerinden (INITIAL_GRANT)
    entries = (await db.execute(select(LedgerEntry))).scalars().all()
    assert [(e.tx_type, e.amount) for e in entries] == [("INITIAL_GRANT", Decimal("1000.00"))]

    r = await client.post("/api/v1/auth/login", json={"username": "ahmet", "password": "sifre12345"})
    assert r.status_code == 200 and r.json()["access_token"]
    r = await client.post("/api/v1/auth/login", json={"username": "ahmet@example.com", "password": "sifre12345"})
    assert r.status_code == 200
    r = await client.post("/api/v1/auth/login", json={"username": "ahmet", "password": "yanlis"})
    assert r.status_code == 401


async def test_duplicate_register_conflict(client):
    await register(client, "ahmet")
    r = await client.post(
        "/api/v1/auth/register",
        json={"username": "ahmet", "email": "baska@example.com", "password": "sifre12345"},
    )
    assert r.status_code == 409


async def test_protected_endpoints_require_auth(client, db):
    m = await make_market(db)
    r = await client.post("/api/v1/trade/buy", json={"market_id": str(m.id), "side": "YES", "amount_kp": 10})
    assert r.status_code == 401
    r = await client.get("/api/v1/auth/me")
    assert r.status_code == 401


async def test_buy_matches_api_spec(client, db):
    h = await register(client)
    m = await make_market(db)
    r = await client.post(
        "/api/v1/trade/buy", headers=h, json={"market_id": str(m.id), "side": "YES", "amount_kp": 250.00}
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["status"] == "success"
    assert body["transaction"] == {"shares_bought": 450.0, "entry_probability": 50.0, "remaining_kp_balance": 750.0}
    assert body["market_state"] == {
        "yes_pool": 800.0,
        "no_pool": 1250.0,
        "yes_prob": 61.0,
        "no_prob": 39.0,
        "volume_kp": 250.0,
    }


async def test_sell_after_buy_and_ledger_consistency(client, db):
    h = await register(client)
    m = await make_market(db)
    await client.post("/api/v1/trade/buy", headers=h, json={"market_id": str(m.id), "side": "YES", "amount_kp": 250})

    r = await client.post(
        "/api/v1/trade/sell", headers=h, json={"market_id": str(m.id), "side": "YES", "shares_to_sell": 200}
    )
    assert r.status_code == 200, r.text
    tx = r.json()["transaction"]
    assert tx["shares_sold"] == 200.0
    assert tx["payout_kp"] == 117.22
    assert tx["new_kp_balance"] == 867.22

    user = (await db.execute(select(User))).scalar_one()
    total = (await db.execute(select(func.sum(LedgerEntry.amount)).where(LedgerEntry.user_id == user.id))).scalar()
    assert total == user.kp_balance == Decimal("867.22")

    pos = (await db.execute(select(Position))).scalar_one()
    assert pos.shares == Decimal("250.0000")
    # 250 KP yatırılmıştı, hissenin 200/450'si satıldı -> 250 * 250/450 = 138.89
    assert pos.total_invested_kp == Decimal("138.89")

    # Fiyat geçmişi: açılış yok (seed dışı), alım + satış = 2 kayıt
    n = (await db.execute(select(func.count()).select_from(MarketPriceHistory))).scalar()
    assert n == 2


async def test_avg_entry_probability_is_weighted(client, db):
    h = await register(client)
    m = await make_market(db)
    await client.post("/api/v1/trade/buy", headers=h, json={"market_id": str(m.id), "side": "YES", "amount_kp": 250})
    await client.post("/api/v1/trade/buy", headers=h, json={"market_id": str(m.id), "side": "YES", "amount_kp": 250})
    pos = (await db.execute(select(Position))).scalar_one()
    assert Decimal("50.0") < pos.avg_entry_probability < Decimal("61.0")


async def test_insufficient_balance(client, db):
    h = await register(client)
    m = await make_market(db)
    r = await client.post(
        "/api/v1/trade/buy", headers=h, json={"market_id": str(m.id), "side": "YES", "amount_kp": 1000.01}
    )
    assert r.status_code == 400
    mk = (await db.execute(select(Market))).scalar_one()
    assert mk.yes_pool == Decimal("1000.0000")  # işlem geri alındı


async def test_cannot_sell_more_than_owned(client, db):
    h = await register(client)
    m = await make_market(db)
    await client.post("/api/v1/trade/buy", headers=h, json={"market_id": str(m.id), "side": "YES", "amount_kp": 100})
    r = await client.post(
        "/api/v1/trade/sell", headers=h, json={"market_id": str(m.id), "side": "YES", "shares_to_sell": 9999}
    )
    assert r.status_code == 400
    r = await client.post(
        "/api/v1/trade/sell", headers=h, json={"market_id": str(m.id), "side": "NO", "shares_to_sell": 1}
    )
    assert r.status_code == 400


async def test_locked_and_expired_markets_reject_trades(client, db):
    from datetime import timedelta

    h = await register(client)
    locked = await make_market(db, status="LOCKED")
    expired = await make_market(db, closes_in=timedelta(seconds=-5))
    for m in (locked, expired):
        r = await client.post(
            "/api/v1/trade/buy", headers=h, json={"market_id": str(m.id), "side": "YES", "amount_kp": 10}
        )
        assert r.status_code == 409


async def test_invalid_amounts_rejected(client, db):
    h = await register(client)
    m = await make_market(db)
    for amt in (0, -5, 10.123):
        r = await client.post(
            "/api/v1/trade/buy", headers=h, json={"market_id": str(m.id), "side": "YES", "amount_kp": amt}
        )
        assert r.status_code == 422, amt


async def test_me_shows_positions_and_portfolio(client, db):
    h = await register(client)
    m = await make_market(db)
    await client.post("/api/v1/trade/buy", headers=h, json={"market_id": str(m.id), "side": "YES", "amount_kp": 250})
    body = (await client.get("/api/v1/auth/me", headers=h)).json()
    assert len(body["positions"]) == 1
    # Alınan hisselerin hemen bozdurma değeri ≈ yatırılan tutar
    assert abs(body["positions"][0]["current_value_kp"] - 250.0) <= 0.01
    assert abs(body["portfolio_value_kp"] - 1000.0) <= 0.01


async def test_markets_list_and_detail(client, db):
    h = await register(client)
    m = await make_market(db, slug="gs-fb-derbisi")
    await make_market(db, status="DRAFT")
    await client.post("/api/v1/trade/buy", headers=h, json={"market_id": str(m.id), "side": "YES", "amount_kp": 100})

    r = await client.get("/api/v1/markets")
    assert r.status_code == 200
    assert [x["slug"] for x in r.json()] == ["gs-fb-derbisi"]  # DRAFT görünmez
    assert (await client.get("/api/v1/markets?category=MAGAZIN")).json() == []

    d = (await client.get("/api/v1/markets/gs-fb-derbisi")).json()
    assert d["slug"] == "gs-fb-derbisi" and len(d["price_history"]) == 1 and d["comments"] == []
    assert (await client.get("/api/v1/markets/yok")).status_code == 404


async def test_admin_create_market(client, db, make_admin):
    h = await register(client, "admin1")
    payload = {
        "title": "Galatasaray - Fenerbahçe derbisinde kırmızı kart çıkar mı?",
        "category": "FUTBOL",
        "resolution_criteria": "Maç sonunda en az bir kırmızı kart görülürse EVET.",
        "closes_at": "2030-01-01T18:00:00Z",
    }
    assert (await client.post("/api/v1/admin/markets", headers=h, json=payload)).status_code == 403

    await make_admin("admin1")
    r = await client.post("/api/v1/admin/markets", headers=h, json=payload)
    assert r.status_code == 201, r.text
    assert r.json()["slug"] == "galatasaray-fenerbahce-derbisinde-kirmizi-kart-cikar-mi"
    assert r.json()["yes_prob"] == 50.0
    n = (await db.execute(select(func.count()).select_from(MarketPriceHistory))).scalar()
    assert n == 1  # ilk %50-%50 kaydı
    assert (await client.post("/api/v1/admin/markets", headers=h, json=payload)).status_code == 409
