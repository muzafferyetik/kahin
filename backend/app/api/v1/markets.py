from decimal import Decimal
from typing import Literal
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.amm import PredictionAMM
from app.core.config import settings
from app.core.security import get_current_user
from app.db.session import get_db
from app.models import Comment, Market, MarketPriceHistory, Position, User
from app.schemas import CommentCreateIn, CommentOut, MarketDetailOut, MarketOut, PricePoint

router = APIRouter(prefix="/markets", tags=["markets"])


def market_to_out(m: Market) -> dict:
    probs = PredictionAMM(m.yes_pool, m.no_pool).get_probabilities()
    return {
        "id": m.id,
        "slug": m.slug,
        "title": m.title,
        "category": m.category,
        "resolution_criteria": m.resolution_criteria,
        "status": m.status,
        "yes_pool": m.yes_pool,
        "no_pool": m.no_pool,
        "yes_prob": probs["yes_prob"],
        "no_prob": probs["no_prob"],
        "volume_kp": m.volume_kp,
        "closes_at": m.closes_at,
        "created_at": m.created_at,
    }


@router.get("", response_model=list[MarketOut])
async def list_markets(
    category: Literal["FUTBOL", "MAGAZIN", "GUNDEM", "EKONOMI"] | None = None,
    sort: Literal["popular", "new"] = "popular",
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
):
    # Kanka Ligi (özel) soruları herkese açık listede görünmez
    q = select(Market).where(Market.status == "OPEN", Market.league_id.is_(None))
    if category:
        q = q.where(Market.category == category)
    q = q.order_by(desc(Market.volume_kp) if sort == "popular" else desc(Market.created_at))
    rows = (await db.execute(q.limit(limit).offset(offset))).scalars().all()
    return [market_to_out(m) for m in rows]


@router.get("/{slug}", response_model=MarketDetailOut)
async def market_detail(slug: str, db: AsyncSession = Depends(get_db)):
    m = (await db.execute(select(Market).where(Market.slug == slug))).scalar_one_or_none()
    if m is None or m.status == "DRAFT":
        raise HTTPException(404, "Soru bulunamadı.")

    history = (
        await db.execute(
            select(MarketPriceHistory)
            .where(MarketPriceHistory.market_id == m.id)
            .order_by(MarketPriceHistory.recorded_at.asc(), MarketPriceHistory.id.asc())
        )
    ).scalars().all()
    comments = (
        await db.execute(
            select(Comment, User.username)
            .join(User, User.id == Comment.user_id)
            .where(Comment.market_id == m.id)
            .order_by(desc(Comment.created_at))
            .limit(50)
        )
    ).all()

    return {
        **market_to_out(m),
        "price_history": [PricePoint.model_validate(h, from_attributes=True) for h in history],
        "comments": [
            CommentOut(
                id=c.id,
                username=username,
                user_side=c.user_side,
                user_shares_snapshot=c.user_shares_snapshot,
                content=c.content,
                created_at=c.created_at,
            )
            for c, username in comments
        ],
    }


@router.post("/{id}/comments", response_model=CommentOut, status_code=status.HTTP_201_CREATED)
async def post_comment(
    id: UUID,
    body: CommentCreateIn,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    m = await db.get(Market, id)
    if m is None:
        raise HTTPException(404, "Soru bulunamadı.")

    # Sadece o soruda en az 50 KP değerinde hissesi olan kullanıcının yorum yazmasını sağlar
    pos = (
        await db.execute(
            select(Position).where(
                Position.user_id == user.id,
                Position.market_id == id,
                Position.shares > 0,
            )
        )
    ).scalar_one_or_none()

    if pos is None or pos.total_invested_kp < settings.comment_min_position_kp:
        raise HTTPException(
            status.HTTP_403_FORBIDDEN,
            f"Yorum yazabilmek için bu soruda en az {settings.comment_min_position_kp} KP değerinde hisseniz bulunmalıdır.",
        )

    comment = Comment(
        market_id=id,
        user_id=user.id,
        user_side=pos.side,
        user_shares_snapshot=pos.shares.quantize(Decimal("0.01")),
        content=body.content.strip(),
    )
    db.add(comment)
    await db.commit()
    await db.refresh(comment)

    return CommentOut(
        id=comment.id,
        username=user.username,
        user_side=comment.user_side,
        user_shares_snapshot=comment.user_shares_snapshot,
        content=comment.content,
        created_at=comment.created_at,
    )
