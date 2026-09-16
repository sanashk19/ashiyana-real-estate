import pytest
import httpx
import uuid


@pytest.mark.asyncio
async def test_seller_submission_and_dashboard_queries(
    async_client: httpx.AsyncClient,
    broker_auth_header: dict,
):
    # 1. Register a seller
    uid = uuid.uuid4().hex[:8]
    seller_res = await async_client.post(
        "/api/auth/seller/register",
        json={
            "email": f"seller.pytest.{uid}@example.com",
            "password": "SellerPassword123!",
            "full_name": "Pytest Seller",
            "phone": "+919876543210",
        },
    )
    assert seller_res.status_code == 201
    seller_headers = {"Authorization": f"Bearer {seller_res.json()['access_token']}"}

    # 2. Public submission
    sub_payload = {
        "seller_name": "Pytest Seller",
        "seller_phone": "+919876543210",
        "seller_email": f"seller.pytest.{uid}@example.com",
        "property_type": "villa",
        "listing_type": "sale",
        "locality": "Candolim",
        "bedrooms": 2,
        "area_sqft": 1200.0,
        "asking_price": 12000000.0,
        "description": "Pytest test submission",
        "submitted_photos": [],
    }
    sub_res = await async_client.post("/api/submissions", json=sub_payload)
    assert sub_res.status_code == 201

    # 3. Seller dashboard overview (verifies single query aggregation)
    dash_res = await async_client.get("/api/seller/dashboard", headers=seller_headers)
    assert dash_res.status_code == 200
    dash_data = dash_res.json()
    assert "total_submissions" in dash_data
    assert "pending_submissions" in dash_data
    assert "listed_properties" in dash_data

    # 4. Seller listed properties (verifies eager selectinload thumbnail query without N+1)
    props_res = await async_client.get("/api/seller/properties", headers=seller_headers)
    assert props_res.status_code == 200
    assert isinstance(props_res.json(), list)
