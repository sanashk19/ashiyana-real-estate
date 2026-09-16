import io
import os
import uuid
import pytest
import httpx
from PIL import Image
import pypdf
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas


def _create_sample_png(width=400, height=250, color=(50, 100, 180)) -> bytes:
    img = Image.new("RGB", (width, height), color=color)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


def _create_sample_pdf(num_pages: int = 2) -> bytes:
    buf = io.BytesIO()
    c = canvas.Canvas(buf, pagesize=A4)
    for p in range(1, num_pages + 1):
        c.drawString(100, 750, f"Sample Test PDF - Page {p} of {num_pages}")
        c.showPage()
    c.save()
    return buf.getvalue()


@pytest.fixture
async def setup_deals(async_client: httpx.AsyncClient, broker_auth_header: dict):
    # Create Deal A and Deal B
    res_a = await async_client.post(
        "/api/deals",
        json={
            "title": "Villa Mandovi Deal A",
            "seller_name": "Anthony Fernandes",
            "buyer_name": "Rahul Sharma",
            "status": "agreement",
            "notes": "Print Pack Test Deal A",
        },
        headers=broker_auth_header,
    )
    assert res_a.status_code == 201
    deal_a = res_a.json()

    res_b = await async_client.post(
        "/api/deals",
        json={
            "title": "Assagao Cottage Deal B",
            "seller_name": "David Lobo",
            "buyer_name": "Vikram Mehta",
            "status": "inquiry",
            "notes": "Print Pack Test Deal B",
        },
        headers=broker_auth_header,
    )
    assert res_b.status_code == 201
    deal_b = res_b.json()

    # Upload Deal A documents
    png_front = _create_sample_png(600, 380, (40, 120, 200))
    up_front = await async_client.post(
        f"/api/deals/{deal_a['id']}/documents",
        data={
            "category": "buyer",
            "title": "Buyer Aadhaar / Passport ID (Front)",
            "party": "buyer",
            "document_side": "front",
        },
        files={"file": ("aadhaar_front.png", png_front, "image/png")},
        headers=broker_auth_header,
    )
    assert up_front.status_code == 201

    png_back = _create_sample_png(600, 380, (40, 140, 180))
    up_back = await async_client.post(
        f"/api/deals/{deal_a['id']}/documents",
        data={
            "category": "buyer",
            "title": "Buyer Aadhaar / Passport ID (Back)",
            "party": "buyer",
            "document_side": "back",
        },
        files={"file": ("aadhaar_back.png", png_back, "image/png")},
        headers=broker_auth_header,
    )
    assert up_back.status_code == 201

    png_pan = _create_sample_png(500, 320, (180, 80, 40))
    up_pan = await async_client.post(
        f"/api/deals/{deal_a['id']}/documents",
        data={
            "category": "buyer",
            "title": "Buyer PAN Card",
            "party": "buyer",
            "document_side": "complete",
        },
        files={"file": ("pan_card.png", png_pan, "image/png")},
        headers=broker_auth_header,
    )
    assert up_pan.status_code == 201

    pdf_deed = _create_sample_pdf(num_pages=2)
    up_pdf = await async_client.post(
        f"/api/deals/{deal_a['id']}/documents",
        data={
            "category": "legal",
            "title": "Title Search Report",
            "party": "property",
            "document_side": "complete",
        },
        files={"file": ("title_deed.pdf", pdf_deed, "application/pdf")},
        headers=broker_auth_header,
    )
    assert up_pdf.status_code == 201

    # Upload Deal B alien document
    png_alien = _create_sample_png(400, 300, (100, 100, 100))
    up_alien = await async_client.post(
        f"/api/deals/{deal_b['id']}/documents",
        data={
            "category": "seller",
            "title": "Alien Seller Document",
            "party": "seller",
            "document_side": "complete",
        },
        files={"file": ("alien_seller.png", png_alien, "image/png")},
        headers=broker_auth_header,
    )
    assert up_alien.status_code == 201

    return {
        "deal_a": deal_a,
        "deal_b": deal_b,
        "doc_front_id": up_front.json()["document"]["id"],
        "doc_back_id": up_back.json()["document"]["id"],
        "doc_pan_id": up_pan.json()["document"]["id"],
        "doc_pdf_id": up_pdf.json()["document"]["id"],
        "doc_alien_id": up_alien.json()["document"]["id"],
    }


@pytest.mark.asyncio
async def test_print_pack_generation_and_front_back_pairing(
    async_client: httpx.AsyncClient,
    broker_auth_header: dict,
    setup_deals: dict,
):
    env = setup_deals
    deal_a_id = env["deal_a"]["id"]
    res = await async_client.post(
        f"/api/deals/{deal_a_id}/print-pack",
        headers=broker_auth_header,
        json={
            "document_ids": [
                env["doc_front_id"],
                env["doc_back_id"],
                env["doc_pan_id"],
                env["doc_pdf_id"],
            ],
            "include_cover_page": True,
        },
    )
    assert res.status_code == 200
    assert res.headers["content-type"] == "application/pdf"
    assert f"{env['deal_a']['deal_number']}_Document-Pack.pdf" in res.headers["content-disposition"]

    reader = pypdf.PdfReader(io.BytesIO(res.content))
    # Cover (1) + Paired Aadhaar (1) + PAN (1) + 2-page PDF (2) = 5
    assert len(reader.pages) == 5

    # Verify Cover Page
    cover_text = reader.pages[0].extract_text()
    assert "ASHIYANA REAL ESTATE" in cover_text
    assert env["deal_a"]["deal_number"] in cover_text
    assert "Rahul Sharma" in cover_text
    assert "Anthony Fernandes" in cover_text


@pytest.mark.asyncio
async def test_print_pack_preview(
    async_client: httpx.AsyncClient,
    broker_auth_header: dict,
    setup_deals: dict,
):
    env = setup_deals
    deal_a_id = env["deal_a"]["id"]
    res = await async_client.post(
        f"/api/deals/{deal_a_id}/print-pack/preview",
        headers=broker_auth_header,
        json={
            "document_ids": [
                env["doc_front_id"],
                env["doc_back_id"],
                env["doc_pan_id"],
                env["doc_pdf_id"],
            ],
            "include_cover_page": True,
        },
    )
    assert res.status_code == 200
    data = res.json()
    assert data["deal_number"] == env["deal_a"]["deal_number"]
    assert data["total_documents_selected"] == 4
    assert data["paired_documents_count"] == 2
    assert data["standalone_documents_count"] == 2
    assert data["include_cover_page"] is True
    assert len(data["items"]) == 3
    assert data["items"][0]["item_type"] == "paired"


@pytest.mark.asyncio
async def test_cover_page_toggle(
    async_client: httpx.AsyncClient,
    broker_auth_header: dict,
    setup_deals: dict,
):
    env = setup_deals
    deal_a_id = env["deal_a"]["id"]
    res = await async_client.post(
        f"/api/deals/{deal_a_id}/print-pack",
        headers=broker_auth_header,
        json={
            "document_ids": [
                env["doc_front_id"],
                env["doc_back_id"],
                env["doc_pan_id"],
                env["doc_pdf_id"],
            ],
            "include_cover_page": False,
        },
    )
    assert res.status_code == 200
    reader = pypdf.PdfReader(io.BytesIO(res.content))
    # Paired Aadhaar (1) + PAN (1) + 2-page PDF (2) = 4
    assert len(reader.pages) == 4


@pytest.mark.asyncio
async def test_lossless_pdf_page_preservation(
    async_client: httpx.AsyncClient,
    broker_auth_header: dict,
    setup_deals: dict,
):
    env = setup_deals
    deal_a_id = env["deal_a"]["id"]
    res = await async_client.post(
        f"/api/deals/{deal_a_id}/print-pack",
        headers=broker_auth_header,
        json={
            "document_ids": [env["doc_pdf_id"]],
            "include_cover_page": False,
        },
    )
    assert res.status_code == 200
    reader = pypdf.PdfReader(io.BytesIO(res.content))
    assert len(reader.pages) == 2
    assert "Sample Test PDF - Page 1 of 2" in reader.pages[0].extract_text()
    assert "Sample Test PDF - Page 2 of 2" in reader.pages[1].extract_text()


@pytest.mark.asyncio
async def test_cross_deal_isolation(
    async_client: httpx.AsyncClient,
    broker_auth_header: dict,
    setup_deals: dict,
):
    env = setup_deals
    deal_a_id = env["deal_a"]["id"]
    res = await async_client.post(
        f"/api/deals/{deal_a_id}/print-pack",
        headers=broker_auth_header,
        json={
            "document_ids": [env["doc_pan_id"], env["doc_alien_id"]],
            "include_cover_page": True,
        },
    )
    assert res.status_code == 403
    assert "Cross-deal authorization violation" in res.json()["detail"]


@pytest.mark.asyncio
async def test_non_existent_document_id(
    async_client: httpx.AsyncClient,
    broker_auth_header: dict,
    setup_deals: dict,
):
    env = setup_deals
    deal_a_id = env["deal_a"]["id"]
    res = await async_client.post(
        f"/api/deals/{deal_a_id}/print-pack",
        headers=broker_auth_header,
        json={
            "document_ids": [env["doc_pan_id"], str(uuid.uuid4())],
            "include_cover_page": True,
        },
    )
    assert res.status_code == 404
    assert "Document(s) not found" in res.json()["detail"]


@pytest.mark.asyncio
async def test_empty_document_list_rejected(
    async_client: httpx.AsyncClient,
    broker_auth_header: dict,
    setup_deals: dict,
):
    env = setup_deals
    deal_a_id = env["deal_a"]["id"]
    res = await async_client.post(
        f"/api/deals/{deal_a_id}/print-pack",
        headers=broker_auth_header,
        json={
            "document_ids": [],
            "include_cover_page": True,
        },
    )
    assert res.status_code == 400


@pytest.mark.asyncio
async def test_unauthorized_access(
    async_client: httpx.AsyncClient,
    setup_deals: dict,
):
    env = setup_deals
    deal_a_id = env["deal_a"]["id"]
    res = await async_client.post(
        f"/api/deals/{deal_a_id}/print-pack",
        json={"document_ids": [env["doc_pan_id"]]},
    )
    assert res.status_code == 401
