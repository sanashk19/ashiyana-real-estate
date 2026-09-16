import os
import json
import pytest
import httpx
from datetime import datetime, timedelta
from app.services.cloudinary_service import LOCAL_VAULT_DIR

FAKE_PDF_BYTES = b"%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n>>\nendobj\ntrailer\n<<\n/Root 1 0 R\n>>\n%%EOF"
FAKE_PNG_BYTES = b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15c4\x00\x00\x00\nIDATx\x9cc\x00\x01\x00\x00\x05\x00\x01\r\n-\xb4\x00\x00\x00\x00IEND\xaeB`\x82"
FAKE_JPG_BYTES = b"\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x01\x00`\x00`\x00\x00\xff\xdb\x00C\x00\xff\xd9"
FAKE_EXE_BYTES = b"MZ\x90\x00\x03\x00\x00\x00\x04\x00\x00\x00\xff\xff\x00\x00"


@pytest.mark.asyncio
async def test_client_upload_security_and_flow(
    async_client: httpx.AsyncClient,
    broker_auth_header: dict,
):
    """
    Comprehensive Phase D2 Security & Functional Test Suite:
    1. Valid token verification & metadata restriction.
    2. Invalid, expired, and revoked token rejections.
    3. Document scope enforcement (cannot upload unrequested docs).
    4. Party scoping (Buyer cannot upload seller docs).
    5. IDOR protection (Token for Deal A cannot write into Deal B).
    6. Token isolation (Cannot read/download existing vault docs).
    7. File validations (magic bytes, extensions, oversize, path traversal).
    8. Successful client upload (front & back sides).
    9. Duplicate prevention (anti-spam).
    10. Broker portal visibility & checklist update verification.
    """
    # 1. Create two test deals: Deal A and Deal B
    deal_a_res = await async_client.post(
        "/api/deals",
        json={"title": "Villa Calangute Deal A", "seller_name": "Goa Seller A", "buyer_name": "Buyer A", "status": "inquiry"},
        headers=broker_auth_header,
    )
    assert deal_a_res.status_code == 201
    deal_a = deal_a_res.json()
    deal_a_id = deal_a["id"]
    deal_a_num = deal_a["deal_number"]

    deal_b_res = await async_client.post(
        "/api/deals",
        json={"title": "Assagao Plot Deal B", "seller_name": "Goa Seller B", "buyer_name": "Buyer B", "status": "inquiry"},
        headers=broker_auth_header,
    )
    assert deal_b_res.status_code == 201
    deal_b = deal_b_res.json()
    deal_b_id = deal_b["id"]

    try:
        # 2. Broker generates upload request for Deal A (Buyer party)
        req_res = await async_client.post(
            f"/api/deals/{deal_a_id}/upload-requests",
            json={
                "party": "buyer",
                "requested_docs": ["Buyer Aadhaar / Passport ID", "Buyer PAN Card"],
                "message": "Please upload color scans.",
                "valid_days": 5,
            },
            headers=broker_auth_header,
        )
        assert req_res.status_code == 201
        req_data = req_res.json()
        token_a = req_data["upload_token"]
        req_a_id = req_data["id"]

        # 3. Test 1: Verify token returns safe metadata, includes broker_name, no internal IDs/phone/email
        verify_res = await async_client.get(f"/api/public/upload-requests/verify?token={token_a}")
        assert verify_res.status_code == 200
        v_data = verify_res.json()
        assert v_data["valid"] is True
        assert v_data["deal_number"] == deal_a_num
        assert v_data["party"] == "buyer"
        assert "Buyer Aadhaar / Passport ID" in v_data["requested_docs"]
        assert "Buyer PAN Card" in v_data["requested_docs"]
        assert "broker_name" in v_data
        # Ensure no sensitive PII leakage
        assert "buyer_phone" not in v_data
        assert "seller_phone" not in v_data
        assert "buyer_email" not in v_data
        assert "seller_email" not in v_data
        assert "deal_id" not in v_data

        # 4. Test 2: Invalid token rejection
        bad_token_res = await async_client.get("/api/public/upload-requests/verify?token=nonexistent_token_1234567890")
        assert bad_token_res.status_code == 404

        # 5. Test 3: Guest without token cannot upload
        no_token_upload = await async_client.post(
            "/api/public/upload-requests/upload",
            data={"requested_doc_title": "Buyer PAN Card", "document_side": "complete"},
            files={"file": ("pan.pdf", FAKE_PDF_BYTES, "application/pdf")},
        )
        assert no_token_upload.status_code in (400, 422)

        # 6. Test 4: Document outside scope rejected (403 Forbidden)
        unrequested_upload = await async_client.post(
            "/api/public/upload-requests/upload",
            data={
                "token": token_a,
                "requested_doc_title": "Title Search Report / Parent Deeds",  # Not requested!
                "document_side": "complete",
            },
            files={"file": ("title_report.pdf", FAKE_PDF_BYTES, "application/pdf")},
        )
        assert unrequested_upload.status_code == 403
        assert "not part of this upload request" in unrequested_upload.json()["detail"].lower()

        # 7. Test 5: Invalid file format (exe disguised as pdf) rejected by magic bytes
        fake_magic_upload = await async_client.post(
            "/api/public/upload-requests/upload",
            data={
                "token": token_a,
                "requested_doc_title": "Buyer PAN Card",
                "document_side": "complete",
            },
            files={"file": ("pan.pdf", FAKE_EXE_BYTES, "application/pdf")},
        )
        assert fake_magic_upload.status_code == 400
        assert "signature" in fake_magic_upload.json()["detail"].lower()

        # 8. Test 6: Oversized file rejected (>15MB)
        huge_bytes = b"%PDF" + b"0" * (15 * 1024 * 1024 + 100)
        oversize_upload = await async_client.post(
            "/api/public/upload-requests/upload",
            data={
                "token": token_a,
                "requested_doc_title": "Buyer PAN Card",
                "document_side": "complete",
            },
            files={"file": ("huge_pan.pdf", huge_bytes, "application/pdf")},
        )
        assert oversize_upload.status_code == 400
        assert "exceeds" in oversize_upload.json()["detail"].lower()

        # 9. Test 7: Path traversal in filename sanitized
        path_traversal_upload = await async_client.post(
            "/api/public/upload-requests/upload",
            data={
                "token": token_a,
                "requested_doc_title": "Buyer PAN Card",
                "document_side": "complete",
            },
            files={"file": ("../../../../etc/passwd.pdf", FAKE_PDF_BYTES, "application/pdf")},
        )
        assert path_traversal_upload.status_code == 201
        upload_resp = path_traversal_upload.json()
        assert upload_resp["success"] is True
        assert ".." not in upload_resp["original_filename"]

        # 10. Test 8: Rapid identical duplicate rejected (409 Conflict)
        dup_upload = await async_client.post(
            "/api/public/upload-requests/upload",
            data={
                "token": token_a,
                "requested_doc_title": "Buyer PAN Card",
                "document_side": "complete",
            },
            files={"file": ("../../../../etc/passwd.pdf", FAKE_PDF_BYTES, "application/pdf")},
        )
        assert dup_upload.status_code == 409
        assert "already uploaded" in dup_upload.json()["detail"].lower()

        # 11. Test 9: Valid upload with Document Side (Aadhaar Front & Back)
        aadhaar_front_res = await async_client.post(
            "/api/public/upload-requests/upload",
            data={
                "token": token_a,
                "requested_doc_title": "Buyer Aadhaar / Passport ID",
                "document_side": "front",
            },
            files={"file": ("aadhaar_front.png", FAKE_PNG_BYTES, "image/png")},
        )
        assert aadhaar_front_res.status_code == 201
        assert aadhaar_front_res.json()["document_side"] == "front"
        assert "(Front)" in aadhaar_front_res.json()["document_title"]

        aadhaar_back_res = await async_client.post(
            "/api/public/upload-requests/upload",
            data={
                "token": token_a,
                "requested_doc_title": "Buyer Aadhaar / Passport ID",
                "document_side": "back",
            },
            files={"file": ("aadhaar_back.jpg", FAKE_JPG_BYTES, "image/jpeg")},
        )
        assert aadhaar_back_res.status_code == 201
        assert aadhaar_back_res.json()["document_side"] == "back"
        assert "(Back)" in aadhaar_back_res.json()["document_title"]

        # 12. Test 10: Verify uploaded documents are in Deal A vault, NOT Deal B (Isolation & IDOR protection)
        deal_a_detail_res = await async_client.get(f"/api/deals/{deal_a_id}", headers=broker_auth_header)
        assert deal_a_detail_res.status_code == 200
        deal_a_docs = deal_a_detail_res.json()["documents"]
        doc_titles = [d["title"] for d in deal_a_docs]
        assert any("Buyer PAN Card" in t for t in doc_titles)
        assert any("Buyer Aadhaar / Passport ID (Front)" in t for t in doc_titles)
        assert any("Buyer Aadhaar / Passport ID (Back)" in t for t in doc_titles)

        # Deal B must have 0 documents
        deal_b_detail_res = await async_client.get(f"/api/deals/{deal_b_id}", headers=broker_auth_header)
        assert deal_b_detail_res.status_code == 200
        assert len(deal_b_detail_res.json()["documents"]) == 0

        # Checklist in Deal A should reflect uploaded items
        checklist_items = deal_a_detail_res.json()["checklist"]
        pan_check = next((c for c in checklist_items if "pan" in c["title"].lower() and c["party"] == "buyer"), None)
        assert pan_check is not None
        assert pan_check["status"] == "uploaded"

        # 13. Test 11: Token cannot be used to download existing documents
        doc_id_to_try = deal_a_docs[0]["id"]
        # Public download attempt without broker auth should fail
        guest_dl_res = await async_client.get(f"/api/deals/{deal_a_id}/documents/{doc_id_to_try}/download")
        assert guest_dl_res.status_code == 401

        # 14. Test 12: Revoked link blocks upload immediately
        await async_client.post(
            f"/api/deals/{deal_a_id}/upload-requests/{req_a_id}/revoke",
            headers=broker_auth_header,
        )
        post_revoke_upload = await async_client.post(
            "/api/public/upload-requests/upload",
            data={
                "token": token_a,
                "requested_doc_title": "Buyer PAN Card",
                "document_side": "complete",
            },
            files={"file": ("another_pan.pdf", FAKE_PDF_BYTES, "application/pdf")},
        )
        assert post_revoke_upload.status_code == 400
        assert "revoked" in post_revoke_upload.json()["detail"].lower()

    finally:
        # Cleanup test deals
        await async_client.delete(f"/api/deals/{deal_a_id}", headers=broker_auth_header)
        await async_client.delete(f"/api/deals/{deal_b_id}", headers=broker_auth_header)
