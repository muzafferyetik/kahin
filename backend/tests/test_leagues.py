from datetime import datetime, timedelta, timezone
from decimal import Decimal

from sqlalchemy import select

from app.models import League, LeagueMember, Market, Position, User
from tests.conftest import register


async def test_create_and_list_leagues(client, db):
    h = await register(client, "league_owner")

    # 1. Lig oluştur
    r = await client.post(
        "/api/v1/leagues",
        headers=h,
        json={"name": "Derbi Tayfası"},
    )
    assert r.status_code == 201, r.text
    league = r.json()
    assert league["name"] == "Derbi Tayfası"
    assert len(league["invite_code"]) == 6
    assert league["member_count"] == 1
    assert league["is_owner"] is True
    assert league["owner_username"] == "league_owner"

    # 2. Liglerimi listele
    r_list = await client.get("/api/v1/leagues/my", headers=h)
    assert r_list.status_code == 200
    my_leagues = r_list.json()
    assert len(my_leagues) == 1
    assert my_leagues[0]["invite_code"] == league["invite_code"]


async def test_join_league_and_view_members(client, db):
    h_owner = await register(client, "l_owner")
    h_member = await register(client, "l_member")

    # Lig kur
    r = await client.post("/api/v1/leagues", headers=h_owner, json={"name": "Yazılımcılar"})
    assert r.status_code == 201
    code = r.json()["invite_code"]

    # Üye lige katılsın
    r_join = await client.post(
        "/api/v1/leagues/join",
        headers=h_member,
        json={"invite_code": code},
    )
    assert r_join.status_code == 200, r_join.text
    joined = r_join.json()
    assert joined["member_count"] == 2

    # Tekrar katılmaya çalışırsa idempotent olmalı (hata vermez, aynı ligi döner)
    r_rejoin = await client.post(
        "/api/v1/leagues/join",
        headers=h_member,
        json={"invite_code": code},
    )
    assert r_rejoin.status_code == 200
    assert r_rejoin.json()["member_count"] == 2

    # Lig detaylarını ve üyeleri getir
    r_detail = await client.get(f"/api/v1/leagues/{code}", headers=h_member)
    assert r_detail.status_code == 200, r_detail.text
    detail = r_detail.json()
    assert detail["league"]["invite_code"] == code
    assert len(detail["members"]) == 2
    usernames = [m["username"] for m in detail["members"]]
    assert "l_owner" in usernames
    assert "l_member" in usernames


async def test_league_private_market_flow(client, db):
    h_owner = await register(client, "captain")
    h_member = await register(client, "striker")
    h_outsider = await register(client, "outsider")

    # 1. Lig kur ve üye katıl
    r_league = await client.post("/api/v1/leagues", headers=h_owner, json={"name": "Halı Saha Grubu"})
    code = r_league.json()["invite_code"]

    await client.post("/api/v1/leagues/join", headers=h_member, json={"invite_code": code})

    # 2. Üye lig içi soru açsın
    close_time = (datetime.now(timezone.utc) + timedelta(days=2)).isoformat()
    r_market = await client.post(
        f"/api/v1/leagues/{code}/markets",
        headers=h_member,
        json={
            "title": "Ahmet bu akşam 3 golden fazla atar mı?",
            "resolution_criteria": "Maç sonu skorbord ve video kaydı esastır.",
            "closes_at": close_time,
            "initial_pool": 1000.0,
        },
    )
    assert r_market.status_code == 201, r_market.text
    m = r_market.json()
    market_id = m["id"]
    assert m["category"] == "KANKA"
    assert m["yes_prob"] == 50.0

    # 3. Yabancı (ligde olmayan) soruya bahis yapmayı dener -> 403 Forbidden!
    r_buy_out = await client.post(
        "/api/v1/trade/buy",
        headers=h_outsider,
        json={"market_id": market_id, "side": "YES", "amount_kp": 100},
    )
    assert r_buy_out.status_code == 403

    # 4. Lig üyesi alım yapar -> Başarılı!
    r_buy_in = await client.post(
        "/api/v1/trade/buy",
        headers=h_member,
        json={"market_id": market_id, "side": "YES", "amount_kp": 100},
    )
    assert r_buy_in.status_code == 200, r_buy_in.text
    assert r_buy_in.json()["status"] == "success"

    # 5. Lig sahibi soruyu sonuçlandırır (Evet kazandı)
    r_resolve = await client.post(
        f"/api/v1/leagues/{code}/markets/{market_id}/resolve",
        headers=h_owner,
        json={"outcome": "YES"},
    )
    assert r_resolve.status_code == 200, r_resolve.text
    assert r_resolve.json()["status"] == "success"
    assert r_resolve.json()["winner_count"] == 1


async def test_league_multi_choice_market_and_batch_resolve(client, db):
    h_owner = await register(client, "league_boss")
    h_player = await register(client, "league_player")

    # 1. Lig kur ve katıl
    r_league = await client.post("/api/v1/leagues", headers=h_owner, json={"name": "Derbi Odası"})
    code = r_league.json()["invite_code"]
    await client.post("/api/v1/leagues/join", headers=h_player, json={"invite_code": code})

    # 2. 3 seçenekli çoktan seçmeli soru aç
    close_time = (datetime.now(timezone.utc) + timedelta(days=1)).isoformat()
    r_create = await client.post(
        f"/api/v1/leagues/{code}/markets",
        headers=h_player,
        json={
            "title": "Maçı kim kazanır?",
            "resolution_criteria": "Resmi TFF maç sonucu geçerlidir.",
            "closes_at": close_time,
            "options": ["Galatasaray", "Fenerbahçe", "Beraberlik"],
        },
    )
    assert r_create.status_code == 201, r_create.text

    # 3. Lig detayından 3 seçeneğin de oluşturulduğunu doğrula
    r_detail = await client.get(f"/api/v1/leagues/{code}", headers=h_player)
    markets = r_detail.json()["markets"]
    assert len(markets) == 3
    titles = [m["title"] for m in markets]
    assert any("Galatasaray" in t for t in titles)
    assert any("Fenerbahçe" in t for t in titles)
    assert any("Beraberlik" in t for t in titles)

    # 4. Oyuncu Galatasaray seçeneğine alım yapsın
    gs_market = next(m for m in markets if "Galatasaray" in m["title"])
    await client.post(
        "/api/v1/trade/buy",
        headers=h_player,
        json={"market_id": gs_market["id"], "side": "YES", "amount_kp": 100},
    )

    # 5. Lig sahibi Galatasaray'ı kazanan olarak belirlesin (Toplu sonuçlandırma)
    r_batch = await client.post(
        f"/api/v1/leagues/{code}/markets/resolve-group",
        headers=h_owner,
        json={
            "winning_market_id": gs_market["id"],
            "other_market_ids": [m["id"] for m in markets],
        },
    )
    assert r_batch.status_code == 200, r_batch.text
    res = r_batch.json()
    assert res["status"] == "success"
    assert res["winning_market"]["winner_count"] == 1
    assert res["other_resolved_count"] == 2
