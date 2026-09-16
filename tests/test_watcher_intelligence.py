import pytest
import httpx
import uuid


@pytest.mark.asyncio
async def test_watcher_intelligence_access_and_isolation(
    async_client: httpx.AsyncClient,
    broker_auth_header: dict,
):
    # 1. Broker watcher summary succeeds
    summary_res = await async_client.get("/api/broker/properties/watcher-summary", headers=broker_auth_header)
    assert summary_res.status_code == 200
    assert isinstance(summary_res.json(), list)

    # 2. Get a property
    props_res = await async_client.get("/api/properties")
    assert props_res.status_code == 200
    prop_id = props_res.json()["results"][0]["id"]

    # 3. Broker property watcher details succeeds
    watchers_res = await async_client.get(f"/api/properties/{prop_id}/watchers", headers=broker_auth_header)
    assert watchers_res.status_code == 200
    watchers_data = watchers_res.json()
    assert isinstance(watchers_data, list)

    # 4. Guest access denied (401)
    guest_res = await async_client.get(f"/api/properties/{prop_id}/watchers")
    assert guest_res.status_code == 401

    # 5. Buyer access denied (403)
    uid = uuid.uuid4().hex[:8]
    buyer_res = await async_client.post(
        "/api/auth/register",
        json={"email": f"buyer.watch.{uid}@example.com", "password": "Password123!", "full_name": "Buyer Watch", "is_nri": False},
    )
    buyer_headers = {"Authorization": f"Bearer {buyer_res.json()['access_token']}"}
    buyer_access = await async_client.get(f"/api/properties/{prop_id}/watchers", headers=buyer_headers)
    assert buyer_access.status_code == 403

    # 6. Seller access denied (403)
    seller_res = await async_client.post(
        "/api/auth/seller/register",
        json={"email": f"seller.watch.{uid}@example.com", "password": "Password123!", "full_name": "Seller Watch", "phone": "+919876543210"},
    )
    seller_headers = {"Authorization": f"Bearer {seller_res.json()['access_token']}"}
    seller_access = await async_client.get(f"/api/properties/{prop_id}/watchers", headers=seller_headers)
    assert seller_access.status_code == 403
