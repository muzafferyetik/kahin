import uuid
from datetime import datetime
from decimal import Decimal

from sqlalchemy import (
    BigInteger,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    Numeric,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, created_at_col, uuid_pk

CATEGORIES = ("FUTBOL", "MAGAZIN", "GUNDEM", "EKONOMI", "KANKA")
MARKET_STATUSES = ("DRAFT", "OPEN", "LOCKED", "RESOLVED_YES", "RESOLVED_NO", "CANCELLED")
TX_TYPES = (
    "INITIAL_GRANT",
    "DAILY_BONUS",
    "BANKRUPTCY_SUPPORT",
    "BUY_SHARES",
    "SELL_SHARES",
    "MARKET_PAYOUT",
    "MARKET_REFUND",
)


def _in(col: str, values: tuple[str, ...]) -> str:
    return f"{col} IN ({', '.join(repr(v) for v in values)})"


class Market(Base):
    __tablename__ = "markets"
    __table_args__ = (
        CheckConstraint("yes_pool > 0", name="yes_pool_pos"),
        CheckConstraint("no_pool > 0", name="no_pool_pos"),
        CheckConstraint("k_constant > 0", name="k_pos"),
        CheckConstraint(_in("category", CATEGORIES), name="category_valid"),
        CheckConstraint(_in("status", MARKET_STATUSES), name="status_valid"),
        Index("idx_markets_status_category", "status", "category"),
    )

    id: Mapped[uuid.UUID] = uuid_pk()
    slug: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    category: Mapped[str] = mapped_column(String(32), nullable=False)
    resolution_criteria: Mapped[str] = mapped_column(Text, nullable=False)
    yes_pool: Mapped[Decimal] = mapped_column(
        Numeric(14, 4), nullable=False, default=Decimal("1000.0000"), server_default="1000.0000"
    )
    no_pool: Mapped[Decimal] = mapped_column(
        Numeric(14, 4), nullable=False, default=Decimal("1000.0000"), server_default="1000.0000"
    )
    k_constant: Mapped[Decimal] = mapped_column(
        Numeric(28, 8), nullable=False, default=Decimal("1000000.00000000"), server_default="1000000.00000000"
    )
    volume_kp: Mapped[Decimal] = mapped_column(
        Numeric(14, 2), nullable=False, default=Decimal("0.00"), server_default="0.00"
    )
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="OPEN", server_default="OPEN")
    league_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("leagues.id", ondelete="CASCADE")
    )
    created_by: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"))
    closes_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = created_at_col()


class Position(Base):
    __tablename__ = "positions"
    __table_args__ = (
        UniqueConstraint("user_id", "market_id", "side", name="uq_positions_user_market_side"),
        CheckConstraint("side IN ('YES', 'NO')", name="side_valid"),
        CheckConstraint("shares >= 0", name="shares_nonneg"),
        CheckConstraint("total_invested_kp >= 0", name="invested_nonneg"),
        Index("idx_positions_user_market", "user_id", "market_id"),
        Index("idx_positions_market", "market_id"),
    )

    id: Mapped[uuid.UUID] = uuid_pk()
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    market_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("markets.id", ondelete="CASCADE"), nullable=False
    )
    side: Mapped[str] = mapped_column(String(3), nullable=False)
    shares: Mapped[Decimal] = mapped_column(
        Numeric(14, 4), nullable=False, default=Decimal("0.0000"), server_default="0.0000"
    )
    total_invested_kp: Mapped[Decimal] = mapped_column(
        Numeric(12, 2), nullable=False, default=Decimal("0.00"), server_default="0.00"
    )
    avg_entry_probability: Mapped[Decimal] = mapped_column(Numeric(5, 2), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now()
    )


class LedgerEntry(Base):
    __tablename__ = "ledger_entries"
    __table_args__ = (
        CheckConstraint(_in("tx_type", TX_TYPES), name="tx_type_valid"),
        CheckConstraint("balance_after >= 0", name="balance_after_nonneg"),
        Index("idx_ledger_user", "user_id", "created_at"),
    )

    id: Mapped[uuid.UUID] = uuid_pk()
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    market_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("markets.id", ondelete="SET NULL")
    )
    tx_type: Mapped[str] = mapped_column(String(32), nullable=False)
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    balance_after: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    created_at: Mapped[datetime] = created_at_col()


class MarketPriceHistory(Base):
    __tablename__ = "market_price_history"
    __table_args__ = (Index("idx_price_history_market_time", "market_id", "recorded_at"),)

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    market_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("markets.id", ondelete="CASCADE"), nullable=False
    )
    yes_prob: Mapped[Decimal] = mapped_column(Numeric(5, 2), nullable=False)
    no_prob: Mapped[Decimal] = mapped_column(Numeric(5, 2), nullable=False)
    volume_kp: Mapped[Decimal] = mapped_column(Numeric(14, 2), nullable=False)
    recorded_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )


class Comment(Base):
    __tablename__ = "comments"
    __table_args__ = (
        CheckConstraint("user_side IN ('YES', 'NO')", name="user_side_valid"),
        Index("idx_comments_market_time", "market_id", "created_at"),
    )

    id: Mapped[uuid.UUID] = uuid_pk()
    market_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("markets.id", ondelete="CASCADE"), nullable=False
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    user_side: Mapped[str] = mapped_column(String(3), nullable=False)
    user_shares_snapshot: Mapped[Decimal] = mapped_column(Numeric(14, 2), nullable=False)
    content: Mapped[str] = mapped_column(String(500), nullable=False)
    created_at: Mapped[datetime] = created_at_col()
