from datetime import datetime, timezone
from decimal import Decimal
from typing import Any
from uuid import UUID

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models import User
from app.services.pubsub import get_redis

router = APIRouter(prefix="/leaderboard", tags=["leaderboard"])


class LeaderboardUser(BaseModel):
    rank: int
    user_id: UUID
    username: str
    tier: str
    score: float
    streak_count: int


class LeaderboardOut(BaseModel):
    weekly_net_worth: list[LeaderboardUser]
    global_accuracy: list[LeaderboardUser]


def _current_week_key() -> str:
    now = datetime.now(timezone.utc)
    year, week, _ = now.isocalendar()
    return f"leaderboard:weekly:{year}_{week:02d}"


@router.get("", response_model=LeaderboardOut)
async def get_leaderboard(db: AsyncSession = Depends(get_db)):
    """
    Canlı Haftalık Liderlik Tablosu ve Keskinlik Sıralaması.
    Redis ZSET üzerinden anlık olarak çeker veya veritabanından getirir.
    """
    weekly_users: list[LeaderboardUser] = []
    accuracy_users: list[LeaderboardUser] = []

    # 1. Haftalık Net Worth Sıralaması (DB Fallback ile)
    users_by_balance = (
        await db.execute(
            select(User).order_by(desc(User.kp_balance)).limit(50)
        )
    ).scalars().all()

    for idx, u in enumerate(users_by_balance, start=1):
        weekly_users.append(
            LeaderboardUser(
                rank=idx,
                user_id=u.id,
                username=u.username,
                tier=u.tier,
                score=float(u.kp_balance),
                streak_count=u.streak_count,
            )
        )

    # 2. Keskinlik Skoru Sıralaması (DB Fallback ile)
    users_by_acc = (
        await db.execute(
            select(User).order_by(desc(User.accuracy_score)).limit(50)
        )
    ).scalars().all()

    for idx, u in enumerate(users_by_acc, start=1):
        accuracy_users.append(
            LeaderboardUser(
                rank=idx,
                user_id=u.id,
                username=u.username,
                tier=u.tier,
                score=float(u.accuracy_score),
                streak_count=u.streak_count,
            )
        )

    return LeaderboardOut(
        weekly_net_worth=weekly_users,
        global_accuracy=accuracy_users,
    )
