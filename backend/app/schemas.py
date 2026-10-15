import re
import uuid
from datetime import datetime
from decimal import Decimal
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field, PlainSerializer, field_validator

# API_SPEC.md JSON örneklerinde sayılar number olarak gösteriliyor (Decimal varsayılanı string)
Num = Annotated[Decimal, PlainSerializer(lambda v: float(v), return_type=float, when_used="json")]

Side = Literal["YES", "NO"]
Category = Literal["FUTBOL", "MAGAZIN", "GUNDEM", "EKONOMI", "KANKA"]

USERNAME_RE = re.compile(r"^[A-Za-z0-9_]{3,32}$")


# ---------- Auth ----------
class RegisterIn(BaseModel):
    username: str
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)

    @field_validator("username")
    @classmethod
    def _username(cls, v: str) -> str:
        if not USERNAME_RE.match(v):
            raise ValueError("Kullanıcı adı 3-32 karakter olmalı (harf, rakam, alt çizgi).")
        return v


class LoginIn(BaseModel):
    username: str  # kullanıcı adı veya e-posta
    password: str


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"


class PositionOut(BaseModel):
    market_id: uuid.UUID
    slug: str
    title: str
    side: Side
    shares: Num
    total_invested_kp: Num
    avg_entry_probability: Num
    current_value_kp: Num


class MeOut(BaseModel):
    id: uuid.UUID
    username: str
    email: str
    kp_balance: Num
    diamond_balance: int
    accuracy_score: Num
    tier: str
    streak_count: int
    is_admin: bool
    portfolio_value_kp: Num
    positions: list[PositionOut]


# ---------- Wallet ----------
class WalletOut(BaseModel):
    status: str = "success"
    granted_kp: Num
    new_kp_balance: Num
    streak_count: int | None = None


# ---------- Markets ----------
class MarketOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    slug: str
    title: str
    category: str
    resolution_criteria: str
    status: str
    yes_pool: Num
    no_pool: Num
    yes_prob: Num
    no_prob: Num
    volume_kp: Num
    closes_at: datetime
    created_at: datetime


class PricePoint(BaseModel):
    yes_prob: Num
    no_prob: Num
    volume_kp: Num
    recorded_at: datetime


class CommentOut(BaseModel):
    id: uuid.UUID
    username: str
    user_side: Side
    user_shares_snapshot: Num
    content: str
    created_at: datetime


class MarketDetailOut(MarketOut):
    price_history: list[PricePoint]
    comments: list[CommentOut]


# ---------- Trade ----------
class BuyIn(BaseModel):
    market_id: uuid.UUID
    side: Side
    amount_kp: Decimal = Field(gt=0, max_digits=12, decimal_places=2)


class SellIn(BaseModel):
    market_id: uuid.UUID
    side: Side
    shares_to_sell: Decimal = Field(gt=0, max_digits=14, decimal_places=4)


class BuyTx(BaseModel):
    shares_bought: Num
    entry_probability: Num
    remaining_kp_balance: Num


class SellTx(BaseModel):
    shares_sold: Num
    payout_kp: Num
    new_kp_balance: Num


class BuyMarketState(BaseModel):
    yes_pool: Num
    no_pool: Num
    yes_prob: Num
    no_prob: Num
    volume_kp: Num


class SellMarketState(BaseModel):
    yes_pool: Num
    no_pool: Num
    yes_prob: Num
    no_prob: Num


class BuyOut(BaseModel):
    status: str
    transaction: BuyTx
    market_state: BuyMarketState


class SellOut(BaseModel):
    status: str
    transaction: SellTx
    market_state: SellMarketState


# ---------- Admin ----------
class AdminMarketIn(BaseModel):
    title: str = Field(min_length=5, max_length=255)
    slug: str | None = Field(default=None, max_length=255)
    category: Literal["FUTBOL", "MAGAZIN", "GUNDEM", "EKONOMI"]
    resolution_criteria: str = Field(min_length=5)
    closes_at: datetime
    status: Literal["OPEN", "DRAFT"] = "OPEN"
    initial_pool: Decimal = Field(default=Decimal("1000"), gt=0)


class AdminStatusUpdateIn(BaseModel):
    status: Literal["LOCKED", "CANCELLED"]


class AdminResolveIn(BaseModel):
    outcome: Literal["YES", "NO"]


class CommentCreateIn(BaseModel):
    content: str = Field(min_length=1, max_length=500)


# ---------- League (Kanka Ligi) ----------
class LeagueCreateIn(BaseModel):
    name: str = Field(min_length=3, max_length=80)


class LeagueJoinIn(BaseModel):
    invite_code: str = Field(min_length=3, max_length=16)


class LeagueMarketCreateIn(BaseModel):
    title: str = Field(min_length=5, max_length=255)
    resolution_criteria: str = Field(min_length=5)
    closes_at: datetime
    initial_pool: Decimal = Field(default=Decimal("1000"), gt=0)
    options: list[str] | None = None


class LeagueResolveIn(BaseModel):
    outcome: Literal["YES", "NO"]


class LeagueBatchResolveIn(BaseModel):
    winning_market_id: uuid.UUID
    other_market_ids: list[uuid.UUID]


class LeagueMemberOut(BaseModel):
    user_id: uuid.UUID
    username: str
    tier: str
    kp_balance: Num
    accuracy_score: Num
    streak_count: int
    is_owner: bool
    joined_at: datetime


class LeagueOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    invite_code: str
    owner_id: uuid.UUID
    owner_username: str
    max_members: int
    member_count: int
    is_owner: bool
    created_at: datetime


class LeagueDetailOut(BaseModel):
    league: LeagueOut
    members: list[LeagueMemberOut]
    markets: list[MarketOut]

