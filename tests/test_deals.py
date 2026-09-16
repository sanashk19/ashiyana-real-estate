import pytest
import httpx
import uuid


@pytest.mark.asyncio
async def test_deal_document_vault_and_download_url(
    async_client: httpx.AsyncClient,
    broker_auth_header: dict,
):
    # 1. Create a deal
    deal_payload = {
        "seller_name": "Test Seller",
        "buyer_name": "Test Buyer",
        "status": "inquiry",
        "notes": "Pytest deal creation",
    }
    deal_res = await async_client.post("/api/deals", json=deal_payload, headers=broker_auth_header)
    assert deal_res.status_code == 201
    deal = deal_res.json()
    deal_id = deal["id"]

    try:
        # 2. Upload document
        fake_png = b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15c4"
        files = {"file": ("title_deed.png", fake_png, "image/png")}
        data = {"category": "property", "title": "Title Deed"}

        upload_res = await async_client.post(
            f"/api/deals/{deal_id}/documents",
            data=data,
            files=files,
            headers=broker_auth_header,
        )
        assert upload_res.status_code == 201
        upload_data = upload_res.json()
        doc_out = upload_data["document"]
        doc_id = doc_out["id"]

        # 3. Verify download_url contract
        expected_url = f"/api/documents/{doc_id}/download"
        assert doc_out["download_url"] == expected_url

        # 4. Broker access download URL succeeds
        dl_res = await async_client.get(expected_url, headers=broker_auth_header, follow_redirects=False)
        assert dl_res.status_code in (200, 307)

        # 5. Guest access denied
        guest_dl = await async_client.get(expected_url)
        assert guest_dl.status_code == 401

        # 6. Delete document
        del_res = await async_client.delete(f"/api/documents/{doc_id}", headers=broker_auth_header)
        assert del_res.status_code == 204
    finally:
        await async_client.delete(f"/api/deals/{deal_id}", headers=broker_auth_header)


@pytest.mark.asyncio
async def test_deal_parties_and_verification_workflow(
    async_client: httpx.AsyncClient,
    broker_auth_header: dict,
):
    # 1. Create deal with structured buyer and seller party details
    create_payload = {
        "buyer": {
            "name": "Arjun Singhal",
            "phone": "+91 98200 11223",
            "email": "arjun@example.com",
            "address": "Bandra West, Mumbai",
            "notes": "Looking for quick closing before Diwali",
        },
        "seller": {
            "name": "Maria Fernandes",
            "phone": "+91 94220 99887",
            "email": "maria.fernandes@example.com",
            "address": "Villa Rosa, Assagao, Goa",
            "notes": "Original Portuguese ancestral property title",
        },
        "status": "inquiry",
        "notes": "Assagao Villa Deal Phase D1",
    }
    res = await async_client.post("/api/deals", json=create_payload, headers=broker_auth_header)
    assert res.status_code == 201
    created_deal = res.json()
    deal_id = created_deal["id"]

    try:
        # Check structured party fields persisted in creation response
        assert created_deal["buyer_name"] == "Arjun Singhal"
        assert created_deal["seller_name"] == "Maria Fernandes"
        assert created_deal["buyer"]["phone"] == "+91 98200 11223"
        assert created_deal["seller"]["address"] == "Villa Rosa, Assagao, Goa"

        # 2. Retrieve Deal Detail & Dynamic Checklist
        detail_res = await async_client.get(f"/api/deals/{deal_id}", headers=broker_auth_header)
        assert detail_res.status_code == 200
        detail_data = detail_res.json()
        assert detail_data["buyer"]["email"] == "arjun@example.com"
        assert detail_data["seller"]["phone"] == "+91 94220 99887"
        assert "checklist" in detail_data
        assert len(detail_data["checklist"]) > 0

        # Verify initial checklist items are pending
        pan_item = next(item for item in detail_data["checklist"] if "Buyer PAN" in item["title"])
        assert pan_item["status"] == "pending"

        # 3. Upload a document with party & side metadata
        fake_pdf = b"%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF"
        files = {"file": ("buyer_pan.pdf", fake_pdf, "application/pdf")}
        data = {
            "category": "buyer",
            "title": "Buyer PAN Card",
            "party": "buyer",
            "document_side": "front",
        }
        upload_res = await async_client.post(
            f"/api/deals/{deal_id}/documents",
            data=data,
            files=files,
            headers=broker_auth_header,
        )
        assert upload_res.status_code == 201
        uploaded_doc = upload_res.json()["document"]
        doc_id = uploaded_doc["id"]
        assert uploaded_doc["party"] == "buyer"
        assert uploaded_doc["document_side"] == "front"
        assert uploaded_doc["is_verified"] is False

        # Verify checklist now marks Buyer PAN as uploaded
        detail_after_upload = (await async_client.get(f"/api/deals/{deal_id}", headers=broker_auth_header)).json()
        pan_item_after = next(item for item in detail_after_upload["checklist"] if "Buyer PAN" in item["title"])
        assert pan_item_after["status"] == "uploaded"

        # 4. Mark document verified by broker
        verify_res = await async_client.patch(
            f"/api/deals/{deal_id}/documents/{doc_id}/verify",
            json={"is_verified": True},
            headers=broker_auth_header,
        )
        assert verify_res.status_code == 200
        verified_doc = verify_res.json()
        assert verified_doc["is_verified"] is True
        assert verified_doc["verified_at"] is not None

        # Verify checklist now marks Buyer PAN as verified
        detail_after_verify = (await async_client.get(f"/api/deals/{deal_id}", headers=broker_auth_header)).json()
        pan_item_verified = next(item for item in detail_after_verify["checklist"] if "Buyer PAN" in item["title"])
        assert pan_item_verified["status"] == "verified"

        # 5. Update party contact info & status via PATCH
        patch_payload = {
            "buyer": {
                "name": "Arjun Singhal",
                "phone": "+91 98200 99999",
                "email": "arjun.updated@example.com",
            },
            "status": "negotiation",
        }
        patch_res = await async_client.patch(f"/api/deals/{deal_id}", json=patch_payload, headers=broker_auth_header)
        assert patch_res.status_code == 200
        patched_deal = patch_res.json()
        assert patched_deal["buyer"]["phone"] == "+91 98200 99999"
        assert patched_deal["buyer"]["email"] == "arjun.updated@example.com"
        assert patched_deal["status"] == "negotiation"

        # 6. Verify non-broker / guest access denied
        guest_res = await async_client.get(f"/api/deals/{deal_id}")
        assert guest_res.status_code == 401

    finally:
        await async_client.delete(f"/api/deals/{deal_id}", headers=broker_auth_header)


@pytest.mark.asyncio
async def test_tokenized_client_upload_requests(
    async_client: httpx.AsyncClient,
    broker_auth_header: dict,
):
    # 1. Create a deal
    deal_res = await async_client.post(
        "/api/deals",
        json={"seller_name": "Test Seller", "buyer_name": "Client Upload Buyer", "status": "inquiry"},
        headers=broker_auth_header,
    )
    assert deal_res.status_code == 201
    deal = deal_res.json()
    deal_id = deal["id"]
    deal_num = deal["deal_number"]

    try:
        # 2. Broker generates upload request link
        req_payload = {
            "party": "buyer",
            "requested_docs": ["Aadhaar / ID Card", "Passport Size Photo"],
            "message": "Please upload clear front and back copies of your ID.",
            "valid_days": 3,
        }
        create_req_res = await async_client.post(
            f"/api/deals/{deal_id}/upload-requests",
            json=req_payload,
            headers=broker_auth_header,
        )
        assert create_req_res.status_code == 201
        req_data = create_req_res.json()
        req_id = req_data["id"]
        raw_token = req_data["upload_token"]
        assert raw_token is not None
        assert "shareable_url" in req_data
        assert req_data["is_revoked"] is False

        # 3. List requests for this deal (raw token is not exposed in list)
        list_res = await async_client.get(f"/api/deals/{deal_id}/upload-requests", headers=broker_auth_header)
        assert list_res.status_code == 200
        requests_list = list_res.json()
        assert len(requests_list) >= 1
        assert requests_list[0]["upload_token"] is None

        # 4. Client verifies the token using public endpoint
        verify_res = await async_client.get(f"/api/public/upload-requests/verify?token={raw_token}")
        assert verify_res.status_code == 200
        verify_data = verify_res.json()
        assert verify_data["valid"] is True
        assert verify_data["deal_number"] == deal_num
        assert verify_data["party"] == "buyer"
        assert "Aadhaar / ID Card" in verify_data["requested_docs"]

        # 5. Invalid token returns 404
        fake_token = "invalidx" * 8
        invalid_res = await async_client.get(f"/api/public/upload-requests/verify?token={fake_token}")
        assert invalid_res.status_code == 404

        # 6. Revoke token
        revoke_res = await async_client.post(
            f"/api/deals/{deal_id}/upload-requests/{req_id}/revoke",
            headers=broker_auth_header,
        )
        assert revoke_res.status_code == 200
        assert revoke_res.json()["is_revoked"] is True

        # 7. Verification of revoked token is rejected with 400
        revoked_verify = await async_client.get(f"/api/public/upload-requests/verify?token={raw_token}")
        assert revoked_verify.status_code == 400
        assert "revoked" in revoked_verify.json()["detail"].lower()

    finally:
        await async_client.delete(f"/api/deals/{deal_id}", headers=broker_auth_header)
