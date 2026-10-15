import uuid
from datetime import datetime
from decimal import Decimal

from sqlalchemy import Boolean, CheckConstraint, DateTime, Integer, Numeric, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, created_at_col, uuid_pk

TIERS = ("CAYLAK", "GOZLEMCI", "ANALIST", "USTAT", "KAHINLER_MECLISI")


class User(Base):
    __tablename__ = "users"
    __table_args__ = (
        CheckConstraint("kp_balance >= 0", name="kp_balance_nonneg"),
        CheckConstraint("diamond_balance >= 0", name="diamond_balance_nonneg"),
        CheckConstraint(
            "tier IN ('CAYLAK', 'GOZLEMCI', 'ANALIST', 'USTAT', 'KAHINLER_MECLISI')",
            name="tier_valid",
        ),
    )

    id: Mapped[uuid.UUID] = uuid_pk()
    username: Mapped[str] = mapped_column(String(32), unique=True, nullable=False)
    email: Mapped[str] = mapped_column(String(120), unique=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    kp_balance: Mapped[Decimal] = mapped_column(
        Numeric(12, 2), nullable=False, default=Decimal("1000.00"), server_default="1000.00"
    )
    diamond_balance: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0")
    accuracy_score: Mapped[Decimal] = mapped_column(
        Numeric(8, 2), nullable=False, default=Decimal("0.00"), server_default="0.00"
    )
    tier: Mapped[str] = mapped_column(String(24), nullable=False, default="CAYLAK", server_default="CAYLAK")
    streak_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0")
    last_daily_claim_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    daily_bankruptcy_claims: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0")
    # Hangi güne ait olduğunu bilmek için (günlük limit sıfırlaması)
    last_bankruptcy_claim_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    is_admin: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, server_default="false")
    created_at: Mapped[datetime] = created_at_col()
