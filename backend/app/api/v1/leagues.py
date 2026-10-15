import re
import secrets
import string
import unicodedata
from decimal import Decimal
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.markets import market_to_out
from app.core.security import get_current_user
from app.db.session import get_db
from app.models import League, LeagueMember, Market, MarketPriceHistory, User
from app.schemas import (
    LeagueCreateIn,
    LeagueDetailOut,
    LeagueJoinIn,
    LeagueBatchResolveIn,
    LeagueMarketCreateIn,
    LeagueMemberOut,
    LeagueOut,
    LeagueResolveIn,
    MarketOut,
)
from app.services import resolution

router = APIRouter(prefix="/leagues", tags=["leagues"])

_TR_MAP = str.maketrans("çğıöşüÇĞİÖŞÜ", "cgiosuCGIOSU")
_CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"


def slugify(title: str) -> str:
    s = title.translate(_TR_MAP)
    s = unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode("ascii").lower()
    s = re.sub(r"[^a-z0-9]+", "-", s).strip("-")
    return s[:200] or "kanka-soru"


def _generate_code(length: int = 6) -> str:
    return "".join(secrets.choice(_CODE_CHARS) for _ in range(length))


@router.post("", response_model=LeagueOut, status_code=status.HTTP_201_CREATED)
async def create_league(
    body: LeagueCreateIn,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Yeni bir Kanka Ligi oluşturur ve kurucuyu ilk üye yapar."""
    # Benzersiz 6 haneli davet kodu üret
    code = ""
    for _ in range(10):
        c = _generate_code(6)
        existing = (
            await db.execute(select(League.id).where(League.invite_code == c))
        ).scalar_one_or_none()
        if existing is None:
            code = c
            break
    if not code:
        code = f"KL{secrets.token_hex(2).upper()}"

    league = League(
        name=body.name.strip(),
        invite_code=code,
        owner_id=user.id,
        max_members=25,
    )
    db.add(league)
    await db.flush()

    member = LeagueMember(
        league_id=league.id,
        user_id=user.id,
    )
    db.add(member)
    await db.commit()
    await db.refresh(league)

    return LeagueOut(
        id=league.id,
        name=league.name,
        invite_code=league.invite_code,
        owner_id=league.owner_id,
        owner_username=user.username,
        max_members=league.max_members,
        member_count=1,
        is_owner=True,
        created_at=league.created_at,
    )


@router.get("/my", response_model=list[LeagueOut])
async def list_my_leagues(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Kullanıcının üye olduğu tüm Kanka Liglerini listeler."""
    stmt = (
        select(
            League,
            User.username.label("owner_username"),
            func.count(LeagueMember.user_id).label("member_count"),
        )
        .join(User, User.id == League.owner_id)
        .join(LeagueMember, LeagueMember.league_id == League.id)
        .where(
            League.id.in_(
                select(LeagueMember.league_id).where(LeagueMember.user_id == user.id)
            )
        )
        .group_by(League.id, User.username)
        .order_by(desc(League.created_at))
    )
    rows = (await db.execute(stmt)).all()

    results = []
    for league, owner_username, member_count in rows:
        results.append(
            LeagueOut(
                id=league.id,
                name=league.name,
                invite_code=league.invite_code,
                owner_id=league.owner_id,
                owner_username=owner_username,
                max_members=league.max_members,
                member_count=member_count,
                is_owner=(league.owner_id == user.id),
                created_at=league.created_at,
            )
        )
    return results


@router.post("/join", response_model=LeagueOut)
async def join_league(
    body: LeagueJoinIn,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Davet koduyla bir Kanka Ligine katılır."""
    code = body.invite_code.strip().upper()
    league = (
        await db.execute(select(League).where(League.invite_code == code))
    ).scalar_one_or_none()
    if league is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Kanka Ligi bulunamadı.")

    # Zaten üye mi?
    existing_member = (
        await db.execute(
            select(LeagueMember).where(
                LeagueMember.league_id == league.id,
                LeagueMember.user_id == user.id,
            )
        )
    ).scalar_one_or_none()

    # Üye sayısını hesapla
    count_stmt = select(func.count()).select_from(LeagueMember).where(LeagueMember.league_id == league.id)
    current_count = (await db.execute(count_stmt)).scalar() or 0

    if existing_member is None:
        if current_count >= league.max_members:
            raise HTTPException(
                status.HTTP_400_BAD_REQUEST,
                f"Bu lig maksimum kontenjanına ({league.max_members} kişi) ulaşmıştır.",
            )
        new_member = LeagueMember(league_id=league.id, user_id=user.id)
        db.add(new_member)
        await db.commit()
        current_count += 1

    owner = (await db.execute(select(User).where(User.id == league.owner_id))).scalar_one()

    return LeagueOut(
        id=league.id,
        name=league.name,
        invite_code=league.invite_code,
        owner_id=league.owner_id,
        owner_username=owner.username,
        max_members=league.max_members,
        member_count=current_count,
        is_owner=(league.owner_id == user.id),
        created_at=league.created_at,
    )


@router.get("/{invite_code}", response_model=LeagueDetailOut)
async def get_league_detail(
    invite_code: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Lig detaylarını, üyeler arasındaki liderlik tablosunu ve ligin özel sorularını döner."""
    code = invite_code.strip().upper()
    league = (
        await db.execute(select(League).where(League.invite_code == code))
    ).scalar_one_or_none()
    if league is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Kanka Ligi bulunamadı.")

    # Kullanıcı üye mi?
    membership = (
        await db.execute(
            select(LeagueMember).where(
                LeagueMember.league_id == league.id,
                LeagueMember.user_id == user.id,
            )
        )
    ).scalar_one_or_none()
    if membership is None:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Bu ligin detaylarını yalnızca lig üyeleri görebilir.")

    owner = (await db.execute(select(User).where(User.id == league.owner_id))).scalar_one()

    # Üye sıralaması (KP bakiyesi + Keskinlik Skoruna göre)
    members_stmt = (
        select(LeagueMember, User)
        .join(User, User.id == LeagueMember.user_id)
        .where(LeagueMember.league_id == league.id)
        .order_by(desc(User.kp_balance), desc(User.accuracy_score))
    )
    members_rows = (await db.execute(members_stmt)).all()

    member_outs = [
        LeagueMemberOut(
            user_id=u.id,
            username=u.username,
            tier=u.tier,
            kp_balance=u.kp_balance,
            accuracy_score=u.accuracy_score,
            streak_count=u.streak_count,
            is_owner=(u.id == league.owner_id),
            joined_at=lm.joined_at,
        )
        for lm, u in members_rows
    ]

    # Lig soruları
    markets_stmt = (
        select(Market)
        .where(Market.league_id == league.id)
        .order_by(desc(Market.created_at))
    )
    market_rows = (await db.execute(markets_stmt)).scalars().all()
    market_outs = [market_to_out(m) for m in market_rows]

    league_out = LeagueOut(
        id=league.id,
        name=league.name,
        invite_code=league.invite_code,
        owner_id=league.owner_id,
        owner_username=owner.username,
        max_members=league.max_members,
        member_count=len(member_outs),
        is_owner=(league.owner_id == user.id),
        created_at=league.created_at,
    )

    return LeagueDetailOut(
        league=league_out,
        members=member_outs,
        markets=market_outs,
    )


@router.post("/{invite_code}/markets", response_model=MarketOut, status_code=status.HTTP_201_CREATED)
async def create_league_market(
    invite_code: str,
    body: LeagueMarketCreateIn,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Lig içi özel tahmin sorusu açar (sadece lig üyeleri katılabilir)."""
    code = invite_code.strip().upper()
    league = (
        await db.execute(select(League).where(League.invite_code == code))
    ).scalar_one_or_none()
    if league is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Kanka Ligi bulunamadı.")

    membership = (
        await db.execute(
            select(LeagueMember).where(
                LeagueMember.league_id == league.id,
                LeagueMember.user_id == user.id,
            )
        )
    ).scalar_one_or_none()
    if membership is None:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Yalnızca lig üyeleri soru açabilir.")

    pool = body.initial_pool

    # Eğer 3 veya daha fazla seçenek verilmişse, her seçenek için bir alt piyasa açılır
    if body.options and len(body.options) >= 3:
        clean_opts = [o.strip() for o in body.options if o.strip()]
        group_id = secrets.token_hex(3)
        created_markets = []
        for opt in clean_opts:
            opt_title = f"{body.title.strip()} — {opt}"
            slug = f"kanka-{group_id}-{slugify(opt)}-{secrets.token_hex(2)}"
            m = Market(
                slug=slug,
                title=opt_title,
                category="KANKA",
                resolution_criteria=f"[Çoktan Seçmeli: {', '.join(clean_opts)}]\n{body.resolution_criteria.strip()}",
                yes_pool=pool,
                no_pool=pool,
                k_constant=pool * pool,
                status="OPEN",
                league_id=league.id,
                created_by=user.id,
                closes_at=body.closes_at,
            )
            db.add(m)
            await db.flush()
            db.add(
                MarketPriceHistory(
                    market_id=m.id,
                    yes_prob=Decimal("50.00"),
                    no_prob=Decimal("50.00"),
                    volume_kp=Decimal("0.00"),
                )
            )
            created_markets.append(m)
        await db.commit()
        for m in created_markets:
            await db.refresh(m)
        return market_to_out(created_markets[0])

    # Standart tekli soru (Evet / Hayır)
    slug = f"kanka-{slugify(body.title)}-{secrets.token_hex(3)}"
    market = Market(
        slug=slug,
        title=body.title.strip(),
        category="KANKA",
        resolution_criteria=body.resolution_criteria.strip(),
        yes_pool=pool,
        no_pool=pool,
        k_constant=pool * pool,
        status="OPEN",
        league_id=league.id,
        created_by=user.id,
        closes_at=body.closes_at,
    )
    db.add(market)
    await db.flush()

    # İlk fiyat geçmişi (50% - 50%)
    db.add(
        MarketPriceHistory(
            market_id=market.id,
            yes_prob=Decimal("50.00"),
            no_prob=Decimal("50.00"),
            volume_kp=Decimal("0.00"),
        )
    )
    await db.commit()
    await db.refresh(market)

    return market_to_out(market)


@router.post("/{invite_code}/markets/resolve-group")
async def resolve_league_group_markets(
    invite_code: str,
    body: LeagueBatchResolveIn,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Çoktan seçmeli grup sorusunda kazanan seçeneği EVET, diğer seçenekleri HAYIR olarak sonuçlandırır."""
    code = invite_code.strip().upper()
    league = (
        await db.execute(select(League).where(League.invite_code == code))
    ).scalar_one_or_none()
    if league is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Kanka Ligi bulunamadı.")

    if league.owner_id != user.id and not user.is_admin:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Yalnızca lig kurucusu sonuçlandırabilir.")

    # Kazanan seçeneği EVET olarak sonuçlandır
    win_res = await resolution.resolve_market(db, body.winning_market_id, "YES")

    # Diğer tüm seçenekleri HAYIR olarak sonuçlandır
    other_resolved = 0
    for other_id in body.other_market_ids:
        if other_id != body.winning_market_id:
            try:
                await resolution.resolve_market(db, other_id, "NO")
                other_resolved += 1
            except Exception:
                pass

    return {
        "status": "success",
        "winning_market": win_res,
        "other_resolved_count": other_resolved,
    }


@router.post("/{invite_code}/markets/{market_id}/resolve")
async def resolve_league_market(
    invite_code: str,
    market_id: UUID,
    body: LeagueResolveIn,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Özel grup sorusunu sonuçlandırır (Yalnızca lig kurucusu veya soruyu açan üye yetkilidir)."""
    code = invite_code.strip().upper()
    league = (
        await db.execute(select(League).where(League.invite_code == code))
    ).scalar_one_or_none()
    if league is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Kanka Ligi bulunamadı.")

    market = (
        await db.execute(select(Market).where(Market.id == market_id, Market.league_id == league.id))
    ).scalar_one_or_none()
    if market is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Lig sorusu bulunamadı.")

    # Yalnızca lig sahibi veya soruyu açan yetkilidir
    if league.owner_id != user.id and market.created_by != user.id and not user.is_admin:
        raise HTTPException(
            status.HTTP_403_FORBIDDEN,
            "Bu soruyu yalnızca lig kurucusu veya soruyu açan üye sonuçlandırabilir.",
        )

    try:
        res = await resolution.resolve_market(db, market.id, body.outcome)
        return res
    except resolution.ResolutionError as e:
        await db.rollback()
        raise HTTPException(e.status_code, e.message)
