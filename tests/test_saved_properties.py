import pytest
import httpx
import uuid


@pytest.mark.asyncio
async def test_saved_properties_crud_and_idempotency(async_client: httpx.AsyncClient):
    # 1. Register a buyer
    uid = uuid.uuid4().hex[:8]
    email = f"buyer.saved.{uid}@example.com"
    reg_res = await async_client.post(
        "/api/auth/register",
        json={"email": email, "password": "TestPassword123!", "full_name": "Saved Buyer", "is_nri": False},
    )
    assert reg_res.status_code == 201
    buyer_headers = {"Authorization": f"Bearer {reg_res.json()['access_token']}"}

    # 2. Get a property
    props_res = await async_client.get("/api/properties")
    assert props_res.status_code == 200
    prop_id = props_res.json()["results"][0]["id"]

    # 3. Save property
    save_res = await async_client.post(f"/api/properties/{prop_id}/save", headers=buyer_headers)
    assert save_res.status_code == 200

    # 4. Idempotent save (saving again returns success without error)
    save_again = await async_client.post(f"/api/properties/{prop_id}/save", headers=buyer_headers)
    assert save_again.status_code == 200

    # 5. Fetch saved properties list
    list_saved = await async_client.get("/api/properties/saved/mine", headers=buyer_headers)
    assert list_saved.status_code == 200
    saved_items = list_saved.json()
    assert any(p["id"] == prop_id for p in saved_items)

    # 6. Unsave property
    unsave_res = await async_client.delete(f"/api/properties/{prop_id}/save", headers=buyer_headers)
    assert unsave_res.status_code == 200

    # 7. List should now be empty
    list_after = await async_client.get("/api/properties/saved/mine", headers=buyer_headers)
    assert list_after.status_code == 200
    assert not any(p["id"] == prop_id for p in list_after.json())
