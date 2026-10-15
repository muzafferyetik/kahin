import asyncio
import uuid
from datetime import datetime, timedelta, timezone
from decimal import Decimal

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy import text
from sqlalchemy.engine import make_url
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import NullPool

from app.core.config import settings
from app.db.session import get_db
from app.main import app
from app.models import Base, Market, User


async def _ensure_test_database() -> None:
    url = make_url(settings.test_database_url)
    admin = create_async_engine(url.set(database="postgres"), isolation_level="AUTOCOMMIT", poolclass=NullPool)
    async with admin.connect() as conn:
        exists = await conn.scalar(text("SELECT 1 FROM pg_database WHERE datname = :n"), {"n": url.database})
        if not exists:
            await conn.execute(text(f'CREATE DATABASE "{url.database}"'))
    await admin.dispose()


@pytest_asyncio.fixture(scope="session")
async def engine():
    await _ensure_test_database()
    eng = create_async_engine(settings.test_database_url, poolclass=NullPool)
    async with eng.begin() as conn:
        await conn.execute(text('CREATE EXTENSION IF NOT EXISTS "pgcrypto"'))
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    yield eng
    await eng.dispose()


@pytest.fixture(scope="session")
def sessionmaker_(engine):
    return async_sessionmaker(engine, expire_on_commit=False)


@pytest_asyncio.fixture(autouse=True)
async def clean_db(engine):
    async with engine.begin() as conn:
        tables = ", ".join(t.name for t in Base.metadata.sorted_tables)
        await conn.execute(text(f"TRUNCATE {tables} RESTART IDENTITY CASCADE"))


@pytest.fixture(autouse=True)
def no_redis(monkeypatch):
    async def _noop(*a, **k):
        return None

    monkeypatch.setattr("app.api.v1.trade.publish_price_tick", _noop)


@pytest_asyncio.fixture
async def client(sessionmaker_):
    async def _get_db():
        async with sessionmaker_() as s:
            yield s

    app.dependency_overrides[get_db] = _get_db
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        yield c
    app.dependency_overrides.clear()


@pytest_asyncio.fixture
async def db(sessionmaker_) -> AsyncSession:
    async with sessionmaker_() as s:
        yield s


# ---------- yardımcılar ----------
async def register(client: AsyncClient, username: str = "ahmet", password: str = "sifre12345") -> dict:
    r = await client.post(
        "/api/v1/auth/register",
        json={"username": username, "email": f"{username}@example.com", "password": password},
    )
    assert r.status_code == 201, r.text
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


async def make_market(
    db: AsyncSession,
    slug: str | None = None,
    status: str = "OPEN",
    closes_in: timedelta = timedelta(days=1),
    pool: Decimal = Decimal("1000"),
) -> Market:
    m = Market(
        slug=slug or f"soru-{uuid.uuid4().hex[:8]}",
        title="Test sorusu mu?",
        category="FUTBOL",
        resolution_criteria="Test kriteri",
        yes_pool=pool,
        no_pool=pool,
        k_constant=pool * pool,
        status=status,
        closes_at=datetime.now(timezone.utc) + closes_in,
    )
    db.add(m)
    await db.commit()
    return m


@pytest.fixture
def make_admin(db):
    async def _make(username: str) -> None:
        await db.execute(text("UPDATE users SET is_admin = true WHERE username = :u"), {"u": username})
        await db.commit()

    return _make
