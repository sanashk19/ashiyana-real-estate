import pytest
import httpx
import uuid


@pytest.mark.asyncio
async def test_auth_login_success(async_client: httpx.AsyncClient):
    res = await async_client.post(
        "/api/auth/login",
        json={"email": "ashiyanarentbuysell@gmail.com", "password": "ashiyana/9999"},
    )
    assert res.status_code == 200
    data = res.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert len(data["access_token"]) > 20
    assert len(data["refresh_token"]) > 20


@pytest.mark.asyncio
async def test_auth_invalid_credentials(async_client: httpx.AsyncClient):
    res = await async_client.post(
        "/api/auth/login",
        json={"email": "ashiyanarentbuysell@gmail.com", "password": "wrongpassword123"},
    )
    assert res.status_code == 401


@pytest.mark.asyncio
async def test_auth_refresh_rotation_and_revocation(async_client: httpx.AsyncClient):
    # 1. Register a test user
    uid = uuid.uuid4().hex[:8]
    email = f"test.refresh.{uid}@example.com"
    pwd = "SecureTestPassword123!"

    reg_res = await async_client.post(
        "/api/auth/register",
        json={"email": email, "password": pwd, "full_name": "Refresh Tester", "is_nri": False},
    )
    assert reg_res.status_code == 201
    tokens = reg_res.json()
    initial_refresh = tokens["refresh_token"]

    # 2. Refresh tokens using initial refresh token
    ref_res1 = await async_client.post(
        "/api/auth/refresh",
        json={"refresh_token": initial_refresh},
    )
    assert ref_res1.status_code == 200
    rotated_tokens = ref_res1.json()
    new_access = rotated_tokens["access_token"]
    new_refresh = rotated_tokens["refresh_token"]
    assert new_access != tokens["access_token"]
    assert new_refresh != initial_refresh

    # 3. Old refresh token reuse attempt should be rejected (401)
    reuse_res = await async_client.post(
        "/api/auth/refresh",
        json={"refresh_token": initial_refresh},
    )
    assert reuse_res.status_code == 401

    # 4. Logout using new access token
    logout_res = await async_client.post(
        "/api/auth/logout",
        headers={"Authorization": f"Bearer {new_access}"},
    )
    assert logout_res.status_code == 200

    # 5. After logout, the new_refresh token should also be revoked (401)
    post_logout_res = await async_client.post(
        "/api/auth/refresh",
        json={"refresh_token": new_refresh},
    )
    assert post_logout_res.status_code == 401
