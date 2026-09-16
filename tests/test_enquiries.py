import pytest
import httpx
import uuid


@pytest.mark.asyncio
async def test_enquiry_lifecycle_and_broker_notes(
    async_client: httpx.AsyncClient,
    broker_auth_header: dict,
):
    # 1. Fetch a property to enquire about
    props_res = await async_client.get("/api/properties")
    assert props_res.status_code == 200
    prop_id = props_res.json()["results"][0]["id"]

    # 2. Public buyer creates enquiry
    buyer_name = f"Test Buyer {uuid.uuid4().hex[:6]}"
    enq_payload = {
        "property_id": prop_id,
        "buyer_name": buyer_name,
        "buyer_phone": "+919876543210",
        "buyer_email": "testbuyer@example.com",
        "message": "Interested in private villa walkthrough.",
        "is_nri": False,
        "budget": 25000000.0,
        "source": "website",
    }
    create_res = await async_client.post("/api/enquiries", json=enq_payload)
    assert create_res.status_code == 201
    enquiry_id = create_res.json()["enquiry_id"]

    # 3. Broker fetches enquiries list
    list_res = await async_client.get("/api/enquiries", headers=broker_auth_header)
    assert list_res.status_code == 200
    enquiries = list_res.json()
    created_enq = next((e for e in enquiries if e["id"] == enquiry_id), None)
    assert created_enq is not None
    assert created_enq["buyer_name"] == buyer_name

    # 4. Broker updates status & notes
    patch_res = await async_client.patch(
        f"/api/enquiries/{enquiry_id}",
        json={"status": "site_visit", "broker_notes": "Walkthrough scheduled for Saturday."},
        headers=broker_auth_header,
    )
    assert patch_res.status_code == 200
    assert patch_res.json()["message"] == "Enquiry updated"

    # 5. Broker archives enquiry
    arch_res = await async_client.patch(
        f"/api/enquiries/{enquiry_id}/archive",
        headers=broker_auth_header,
    )
    assert arch_res.status_code == 200
    assert arch_res.json()["is_archived"] is True
