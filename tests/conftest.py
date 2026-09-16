import pytest
import pytest_asyncio
import asyncio
import httpx
import os
import sys
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.pool import NullPool

# Ensure repository root is on sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.core.config import settings
from app.db.database import get_db
from app.main import app


@pytest.fixture(scope="session")
def event_loop():
    policy = asyncio.get_event_loop_policy()
    loop = policy.new_event_loop()
    yield loop
    loop.close()


@pytest.fixture(scope="session")
def test_engine():
    engine = create_async_engine(
        settings.DATABASE_URL,
        poolclass=NullPool,
    )
    return engine


@pytest_asyncio.fixture(autouse=True)
async def override_db(test_engine):
    TestSessionLocal = async_sessionmaker(test_engine, class_=AsyncSession, expire_on_commit=False)

    async def _get_test_db():
        async with TestSessionLocal() as session:
            try:
                yield session
                await session.commit()
            except Exception:
                await session.rollback()
                raise
            finally:
                await session.close()

    app.dependency_overrides[get_db] = _get_test_db
    yield
    app.dependency_overrides.pop(get_db, None)


@pytest_asyncio.fixture
async def async_client():
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test", timeout=30.0) as client:
        yield client


@pytest_asyncio.fixture
async def broker_auth_header(async_client: httpx.AsyncClient):
    res = await async_client.post(
        "/api/auth/login",
        json={"email": "ashiyanarentbuysell@gmail.com", "password": "ashiyana/9999"},
    )
    assert res.status_code == 200, f"Broker login fixture failed: {res.text}"
    token = res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}
