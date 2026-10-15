import uuid

from sqlalchemy import DateTime, MetaData, func, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import DeclarativeBase, mapped_column

# Alembic migration'larında deterministik constraint isimleri için
NAMING_CONVENTION = {
    "ix": "ix_%(column_0_label)s",
    "uq": "uq_%(table_name)s_%(column_0_name)s",
    "ck": "ck_%(table_name)s_%(constraint_name)s",
    "fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s",
    "pk": "pk_%(table_name)s",
}


class Base(DeclarativeBase):
    metadata = MetaData(naming_convention=NAMING_CONVENTION)
    # INSERT/UPDATE sonrası sunucu varsayılanlarını RETURNING ile hemen çek (async'te lazy-load yok)
    __mapper_args__ = {"eager_defaults": True}


def uuid_pk():
    return mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        server_default=text("gen_random_uuid()"),
    )


def created_at_col():
    return mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
