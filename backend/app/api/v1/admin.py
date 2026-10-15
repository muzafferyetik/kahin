import re
import unicodedata
from decimal import Decimal
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import desc, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.markets import market_to_out
from app.core.amm import PredictionAMM
from app.core.security import require_admin
from app.db.session import get_db
from app.models import Market, MarketPriceHistory, User
from app.schemas import AdminMarketIn, AdminResolveIn, AdminStatusUpdateIn, MarketOut
from app.services import resolution

router = APIRouter(prefix="/admin", tags=["admin"])

_TR_MAP = str.maketrans("çğıöşüÇĞİÖŞÜ", "cgiosuCGIOSU")


def slugify(title: str) -> str:
    s = title.translate(_TR_MAP)
    s = unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode("ascii").lower()
    s = re.sub(r"[^a-z0-9]+", "-", s).strip("-")
    return s[:255] or "soru"


@router.get("/markets", response_model=list[MarketOut])
async def list_admin_markets(
    admin: User = Depends(require_admin), db: AsyncSession = Depends(get_db)
):
    """Yönetici panelinde tüm soruları (DRAFT, OPEN, LOCKED, RESOLVED) listeler."""
    q = select(Market).order_by(desc(Market.created_at))
    rows = (await db.execute(q)).scalars().all()
    return [market_to_out(m) for m in rows]


@router.post("/markets", response_model=MarketOut, status_code=status.HTTP_201_CREATED)
async def create_market(
    body: AdminMarketIn, admin: User = Depends(require_admin), db: AsyncSession = Depends(get_db)
):
    slug = slugify(body.slug or body.title)
    pool = body.initial_pool
    market = Market(
        slug=slug,
        title=body.title,
        category=body.category,
        resolution_criteria=body.resolution_criteria,
        yes_pool=pool,
        no_pool=pool,
        k_constant=pool * pool,
        status=body.status,
        closes_at=body.closes_at,
        created_by=admin.id,
    )
    db.add(market)
    try:
        await db.flush()
        probs = PredictionAMM(pool, pool).get_probabilities()
        db.add(
            MarketPriceHistory(
                market_id=market.id, yes_prob=probs["yes_prob"], no_prob=probs["no_prob"], volume_kp=Decimal("0")
            )
        )
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(status.HTTP_409_CONFLICT, "Bu slug zaten kullanılıyor.")
    await db.refresh(market)
    return market_to_out(market)


@router.patch("/markets/{id}/status")
async def update_market_status(
    id: UUID,
    body: AdminStatusUpdateIn,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Soruyu LOCKED (kilitli) veya CANCELLED (iptal ve iade) durumuna getirir."""
    try:
        if body.status == "LOCKED":
            res = await resolution.lock_market(db, id)
            return {"status": "success", "market_id": str(res.id), "new_status": "LOCKED"}
        elif body.status == "CANCELLED":
            return await resolution.cancel_market(db, id)
    except resolution.ResolutionError as e:
        await db.rollback()
        raise HTTPException(e.status_code, e.message)


@router.post("/markets/{id}/resolve")
async def resolve_market(
    id: UUID,
    body: AdminResolveIn,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Soruyu sonuçlandırır, 1 Hisse = 1 KP öder ve Keskinlik Skorunu dağıtır."""
    try:
        return await resolution.resolve_market(db, id, body.outcome)
    except resolution.ResolutionError as e:
        await db.rollback()
        raise HTTPException(e.status_code, e.message)
