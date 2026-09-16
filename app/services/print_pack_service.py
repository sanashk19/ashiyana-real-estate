import io
import os
import re
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional, Tuple
from uuid import UUID

import httpx
from PIL import Image
import pypdf
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.utils import ImageReader
from reportlab.pdfgen import canvas
from fastapi import HTTPException, status

from app.core.config import settings
from app.models.models import Deal, DealDocument
from app.services.cloudinary_service import (
    LOCAL_VAULT_DIR,
    get_signed_document_url,
)

PAGE_WIDTH, PAGE_HEIGHT = A4  # 595.28 x 841.89 points
MARGIN = 40.0
CONTENT_WIDTH = PAGE_WIDTH - (2 * MARGIN)  # 515.28 pt


def _clean_base_title(title: str) -> str:
    """Strip front/back indicators to get the core document title for pairing."""
    cleaned = re.sub(r"\s*[\(\[\-]?\s*(?:front|back)\s*[\)\]]?\s*$", "", title, flags=re.IGNORECASE)
    return cleaned.strip()


class PrintItem:
    """Represents an item in the print pack (single document or paired front/back)."""
    def __init__(
        self,
        item_type: str,  # "paired", "single_image", "pdf"
        title: str,
        party: str,
        documents: List[DealDocument],
        front_doc: Optional[DealDocument] = None,
        back_doc: Optional[DealDocument] = None,
    ):
        self.item_type = item_type
        self.title = title
        self.party = party
        self.documents = documents
        self.front_doc = front_doc
        self.back_doc = back_doc


def group_documents_for_printing(documents: List[DealDocument]) -> List[PrintItem]:
    """
    Intelligently inspects the selected documents.
    If both 'front' and 'back' sides of an identity or title document exist for the same party,
    pairs them into a single PrintItem to be laid out together on one A4 page.
    Otherwise, preserves each as a standalone item.
    """
    items: List[PrintItem] = []
    processed_ids = set()

    # First pass: look for front/back pairs
    for i, doc in enumerate(documents):
        if doc.id in processed_ids:
            continue

        doc_side = (doc.document_side or "").lower()
        title_lower = doc.title.lower()
        is_front = doc_side == "front" or "front" in title_lower
        is_back = doc_side == "back" or "back" in title_lower

        if is_front or is_back:
            target_is_opposite_front = not is_front
            base_title = _clean_base_title(doc.title)
            doc_party = (doc.party or "").lower()

            # Search for the matching other half
            pair_match: Optional[DealDocument] = None
            for j, candidate in enumerate(documents):
                if candidate.id == doc.id or candidate.id in processed_ids:
                    continue

                cand_party = (candidate.party or "").lower()
                if cand_party != doc_party:
                    continue

                cand_side = (candidate.document_side or "").lower()
                cand_title_lower = candidate.title.lower()
                cand_is_front = cand_side == "front" or "front" in cand_title_lower
                cand_is_back = cand_side == "back" or "back" in cand_title_lower

                if target_is_opposite_front and cand_is_front:
                    cand_base = _clean_base_title(candidate.title)
                    if cand_base.lower() == base_title.lower():
                        pair_match = candidate
                        break
                elif not target_is_opposite_front and cand_is_back:
                    cand_base = _clean_base_title(candidate.title)
                    if cand_base.lower() == base_title.lower():
                        pair_match = candidate
                        break

            if pair_match:
                front = doc if is_front else pair_match
                back = pair_match if is_front else doc
                items.append(
                    PrintItem(
                        item_type="paired",
                        title=base_title,
                        party=doc.party or "joint",
                        documents=[front, back],
                        front_doc=front,
                        back_doc=back,
                    )
                )
                processed_ids.add(front.id)
                processed_ids.add(back.id)
                continue

        # Single document (either complete, PDF, or unpaired single side)
        is_pdf = (doc.mime_type == "application/pdf") or doc.original_filename.lower().endswith(".pdf")
        item_type = "pdf" if is_pdf else "single_image"
        items.append(
            PrintItem(
                item_type=item_type,
                title=doc.title,
                party=doc.party or "joint",
                documents=[doc],
            )
        )
        processed_ids.add(doc.id)

    return items


async def fetch_document_bytes(doc: DealDocument) -> Tuple[bytes, str]:
    """
    Safely retrieves document binary content from local secure vault or Cloudinary signed storage.
    Returns (bytes, mime_type).
    """
    if doc.cloudinary_public_id.startswith("local:"):
        local_filename = doc.cloudinary_public_id.replace("local:", "")
        local_path = os.path.abspath(os.path.join(LOCAL_VAULT_DIR, local_filename))
        if not os.path.exists(local_path) or not local_path.startswith(LOCAL_VAULT_DIR):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Physical file for document '{doc.title}' not found in vault.",
            )
        with open(local_path, "rb") as f:
            content = f.read()
        return content, doc.mime_type or "application/octet-stream"

    file_ext = os.path.splitext(doc.original_filename)[1].lower()
    signed_url = get_signed_document_url(
        public_id=doc.cloudinary_public_id,
        resource_type=doc.resource_type,
        format_ext=file_ext,
    )
    if not signed_url:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Unable to access secure storage for document '{doc.title}'.",
        )

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.get(signed_url)
            if resp.status_code != 200:
                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail=f"Failed to retrieve document '{doc.title}' from storage provider.",
                )
            return resp.content, doc.mime_type or "application/octet-stream"
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Network error retrieving document '{doc.title}': {str(e)}",
        )


def _draw_page_header(
    c: canvas.Canvas,
    title: str,
    subtitle: Optional[str] = None,
    party: Optional[str] = None,
    status_label: Optional[str] = None,
) -> float:
    """Draws a clean, non-intrusive legal work document header. Returns next available Y coordinate."""
    y = PAGE_HEIGHT - MARGIN

    # Top brand bar
    c.setFont("Helvetica-Bold", 8)
    c.setFillColor(colors.HexColor("#717A7D"))
    c.drawString(MARGIN, y, "ASHIYANA REAL ESTATE  |  PROPERTY TRANSACTION VAULT")

    if status_label:
        c.drawRightString(PAGE_WIDTH - MARGIN, y, status_label.upper())

    y -= 14
    c.setStrokeColor(colors.HexColor("#EDE8E0"))
    c.setLineWidth(0.75)
    c.line(MARGIN, y, PAGE_WIDTH - MARGIN, y)

    y -= 22
    # Document main title
    c.setFont("Helvetica-Bold", 14)
    c.setFillColor(colors.HexColor("#172124"))
    c.drawString(MARGIN, y, title[:55])

    # Party badge
    if party:
        c.setFont("Helvetica-Bold", 9)
        c.setFillColor(colors.HexColor("#17805B") if party.lower() == "buyer" else colors.HexColor("#2C4A5A"))
        c.drawRightString(PAGE_WIDTH - MARGIN, y, f"PARTY: {party.upper()}")

    if subtitle:
        y -= 14
        c.setFont("Helvetica", 9)
        c.setFillColor(colors.HexColor("#717A7D"))
        c.drawString(MARGIN, y, subtitle[:75])

    y -= 16
    return y


def generate_deal_cover_page(
    deal: Deal,
    items: List[PrintItem],
    total_docs_count: int,
) -> bytes:
    """
    Renders an executive, professional A4 Deal Document Pack Cover Page.
    Includes only transaction-level metadata intended for brokerage use.
    Strictly excludes sensitive identity numbers, customer contacts, and private URLs.
    """
    buf = io.BytesIO()
    c = canvas.Canvas(buf, pagesize=A4)

    # 1. Header Banner
    c.setFillColor(colors.HexColor("#172124"))
    c.rect(MARGIN, PAGE_HEIGHT - 120, CONTENT_WIDTH, 80, fill=1, stroke=0)

    c.setFillColor(colors.white)
    c.setFont("Helvetica-Bold", 16)
    c.drawString(MARGIN + 20, PAGE_HEIGHT - 75, "ASHIYANA REAL ESTATE")

    c.setFont("Helvetica", 10)
    c.drawString(MARGIN + 20, PAGE_HEIGHT - 95, "CONFIDENTIAL PROPERTY TRANSACTION DOCUMENT PACK")

    c.setFont("Helvetica-Bold", 11)
    c.drawRightString(PAGE_WIDTH - MARGIN - 20, PAGE_HEIGHT - 75, f"DEAL: {deal.deal_number}")

    gen_date = datetime.now(timezone.utc).strftime("%d %B %Y")
    c.setFont("Helvetica", 9)
    c.drawRightString(PAGE_WIDTH - MARGIN - 20, PAGE_HEIGHT - 95, f"Generated: {gen_date}")

    y = PAGE_HEIGHT - 150

    # 2. Transaction Summary Card
    c.setStrokeColor(colors.HexColor("#EDE8E0"))
    c.setFillColor(colors.HexColor("#FAF7F2"))
    c.roundRect(MARGIN, y - 100, CONTENT_WIDTH, 100, 6, fill=1, stroke=1)

    prop_title = deal.property.title if getattr(deal, "property", None) and deal.property else f"Property #{deal.property_id}"
    prop_loc = deal.property.locality if getattr(deal, "property", None) and deal.property and deal.property.locality else "Goa"

    c.setFillColor(colors.HexColor("#717A7D"))
    c.setFont("Helvetica-Bold", 8)
    c.drawString(MARGIN + 16, y - 22, "PROPERTY")
    c.drawString(MARGIN + 16, y - 62, "TRANSACTION PARTIES")

    c.setFillColor(colors.HexColor("#172124"))
    c.setFont("Helvetica-Bold", 11)
    c.drawString(MARGIN + 16, y - 38, f"{prop_title} ({prop_loc})")

    buyer_name = deal.buyer_name or (deal.buyer.name if deal.buyer and getattr(deal.buyer, "name", None) else "Not Specified")
    seller_name = deal.seller_name or (deal.seller.name if deal.seller and getattr(deal.seller, "name", None) else "Not Specified")
    c.setFont("Helvetica", 10)
    c.drawString(MARGIN + 16, y - 78, f"Buyer: {buyer_name}   |   Seller: {seller_name}")

    c.setFont("Helvetica-Bold", 9)
    c.drawRightString(PAGE_WIDTH - MARGIN - 16, y - 38, f"Status: {deal.status.replace('_', ' ').title()}")
    c.setFont("Helvetica", 9)
    c.drawRightString(PAGE_WIDTH - MARGIN - 16, y - 78, f"Total Documents Included: {total_docs_count}")

    y -= 130

    # 3. Document Pack Index Table Header
    c.setFont("Helvetica-Bold", 11)
    c.setFillColor(colors.HexColor("#172124"))
    c.drawString(MARGIN, y, "Included Documents Index")
    y -= 15

    c.setFillColor(colors.HexColor("#172124"))
    c.rect(MARGIN, y - 18, CONTENT_WIDTH, 18, fill=1, stroke=0)
    c.setFillColor(colors.white)
    c.setFont("Helvetica-Bold", 8)
    c.drawString(MARGIN + 10, y - 13, "#")
    c.drawString(MARGIN + 35, y - 13, "DOCUMENT TITLE")
    c.drawString(MARGIN + 280, y - 13, "PARTY")
    c.drawString(MARGIN + 360, y - 13, "TYPE / SIDES")
    c.drawString(MARGIN + 450, y - 13, "STATUS")

    y -= 22

    # Index Rows
    row_idx = 1
    c.setFont("Helvetica", 8.5)
    for item in items:
        if y < MARGIN + 60:
            c.drawString(MARGIN + 35, y - 10, "... additional documents continue in attached pack")
            break

        c.setStrokeColor(colors.HexColor("#EDE8E0"))
        c.line(MARGIN, y - 4, PAGE_WIDTH - MARGIN, y - 4)

        c.setFillColor(colors.HexColor("#717A7D"))
        c.drawString(MARGIN + 10, y - 16, str(row_idx))

        c.setFillColor(colors.HexColor("#172124"))
        c.drawString(MARGIN + 35, y - 16, item.title[:45])

        c.setFillColor(colors.HexColor("#717A7D"))
        c.drawString(MARGIN + 280, y - 16, (item.party or "Joint").upper())

        type_label = "Front + Back" if item.item_type == "paired" else ("PDF Document" if item.item_type == "pdf" else "Standalone Image")
        c.drawString(MARGIN + 360, y - 16, type_label)

        # Verification summary
        is_verified = all(getattr(d, "is_verified", False) for d in item.documents)
        c.setFillColor(colors.HexColor("#17805B") if is_verified else colors.HexColor("#717A7D"))
        c.drawString(MARGIN + 450, y - 16, "Verified" if is_verified else "Recorded")

        y -= 20
        row_idx += 1

    # 4. Footer Legal Disclaimer Notice
    c.setStrokeColor(colors.HexColor("#EDE8E0"))
    c.line(MARGIN, MARGIN + 35, PAGE_WIDTH - MARGIN, MARGIN + 35)

    c.setFont("Helvetica", 7.5)
    c.setFillColor(colors.HexColor("#717A7D"))
    c.drawString(
        MARGIN,
        MARGIN + 22,
        "CONFIDENTIALITY NOTICE: This document pack is compiled solely for official verification, registration, and deal closure.",
    )
    c.drawString(
        MARGIN,
        MARGIN + 10,
        "Prepared by Kassim Shaikh, Ashiyana Real Estate. Not for unauthorized distribution or reproduction.",
    )

    c.save()
    buf.seek(0)
    return buf.getvalue()


def render_paired_images_page(
    title: str,
    front_bytes: bytes,
    back_bytes: bytes,
    party: str,
    front_filename: str,
    back_filename: str,
) -> bytes:
    """
    Renders front and back sides of an identity or title document onto a single A4 page.
    Preserves exact aspect ratios, centers images, and adds clean section dividers.
    """
    buf = io.BytesIO()
    c = canvas.Canvas(buf, pagesize=A4)

    y_top = _draw_page_header(
        c,
        title=f"{title.upper()}",
        subtitle="Front and Back Sides Arranged for Verification & Printing",
        party=party,
        status_label="IDENTITY / TITLE RECORD",
    )

    available_h = y_top - MARGIN
    # Height allocation per image slot: half of available space minus label offsets
    slot_h = (available_h - 40) / 2.0
    slot_w = CONTENT_WIDTH

    # --- Slot 1: Front ---
    y_front_label = y_top - 12
    c.setFont("Helvetica-Bold", 9)
    c.setFillColor(colors.HexColor("#172124"))
    c.drawString(MARGIN, y_front_label, "SIDE 1: FRONT")
    c.setFont("Helvetica", 8)
    c.setFillColor(colors.HexColor("#717A7D"))
    c.drawRightString(PAGE_WIDTH - MARGIN, y_front_label, front_filename[:40])

    slot_1_box_y = y_front_label - 8 - slot_h
    _draw_scaled_image(c, front_bytes, MARGIN, slot_1_box_y, slot_w, slot_h)

    # Divider line
    divider_y = slot_1_box_y - 12
    c.setStrokeColor(colors.HexColor("#EDE8E0"))
    c.setLineWidth(0.5)
    c.line(MARGIN, divider_y, PAGE_WIDTH - MARGIN, divider_y)

    # --- Slot 2: Back ---
    y_back_label = divider_y - 14
    c.setFont("Helvetica-Bold", 9)
    c.setFillColor(colors.HexColor("#172124"))
    c.drawString(MARGIN, y_back_label, "SIDE 2: BACK")
    c.setFont("Helvetica", 8)
    c.setFillColor(colors.HexColor("#717A7D"))
    c.drawRightString(PAGE_WIDTH - MARGIN, y_back_label, back_filename[:40])

    slot_2_box_y = y_back_label - 8 - slot_h
    _draw_scaled_image(c, back_bytes, MARGIN, slot_2_box_y, slot_w, slot_h)

    c.save()
    buf.seek(0)
    return buf.getvalue()


def render_single_image_page(
    title: str,
    image_bytes: bytes,
    party: str,
    side: str,
    original_filename: str,
) -> bytes:
    """
    Renders a standalone image document onto an A4 page.
    Centers the image and scales it cleanly within printable margins.
    """
    buf = io.BytesIO()
    c = canvas.Canvas(buf, pagesize=A4)

    side_label = f" ({side.title()})" if side and side.lower() not in ("complete", "") else ""
    y_top = _draw_page_header(
        c,
        title=f"{title}{side_label}",
        subtitle=f"File: {original_filename}",
        party=party,
        status_label="STANDALONE DOCUMENT",
    )

    available_h = y_top - MARGIN - 10
    slot_w = CONTENT_WIDTH
    box_y = MARGIN + 10

    _draw_scaled_image(c, image_bytes, MARGIN, box_y, slot_w, available_h)

    c.save()
    buf.seek(0)
    return buf.getvalue()


def _draw_scaled_image(
    c: canvas.Canvas,
    img_bytes: bytes,
    x: float,
    y: float,
    max_w: float,
    max_h: float,
):
    """Calculates aspect ratio, centers, and draws image inside the given bounding box."""
    try:
        pil_img = Image.open(io.BytesIO(img_bytes))
        # Handle orientation if EXIF is present
        if hasattr(pil_img, "_getexif"):
            exif = pil_img._getexif()
            if exif:
                orientation = exif.get(274)
                if orientation == 3:
                    pil_img = pil_img.rotate(180, expand=True)
                elif orientation == 6:
                    pil_img = pil_img.rotate(270, expand=True)
                elif orientation == 8:
                    pil_img = pil_img.rotate(90, expand=True)

        img_w, img_h = pil_img.size
        if img_w <= 0 or img_h <= 0:
            return

        # Calculate uniform scaling factor
        scale = min(max_w / float(img_w), max_h / float(img_h))
        target_w = img_w * scale
        target_h = img_h * scale

        # Center inside target bounding box
        draw_x = x + (max_w - target_w) / 2.0
        draw_y = y + (max_h - target_h) / 2.0

        # Save to buffer for ReportLab
        clean_buf = io.BytesIO()
        # Convert RGBA to RGB for JPEG/PDF safety if needed
        if pil_img.mode in ("RGBA", "P"):
            pil_img = pil_img.convert("RGB")
        pil_img.save(clean_buf, format="JPEG", quality=92)
        clean_buf.seek(0)

        reportlab_img = ImageReader(clean_buf)
        c.drawImage(
            reportlab_img,
            draw_x,
            draw_y,
            width=target_w,
            height=target_h,
            preserveAspectRatio=True,
            anchor="c",
        )
    except Exception:
        # Fallback if image fails to decode: draw clean placeholder box
        c.setStrokeColor(colors.HexColor("#EDE8E0"))
        c.setFillColor(colors.HexColor("#FAF7F2"))
        c.rect(x, y, max_w, max_h, fill=1, stroke=1)
        c.setFont("Helvetica", 9)
        c.setFillColor(colors.HexColor("#717A7D"))
        c.drawCentredString(x + max_w / 2.0, y + max_h / 2.0, "[Image could not be rendered]")


async def generate_deal_print_pack(
    deal: Deal,
    documents: List[DealDocument],
    include_cover: bool = True,
) -> bytes:
    """
    Assembles a complete printable PDF pack from selected DealDocuments.
    1. Optionally renders an A4 Deal Cover Page.
    2. Groups front/back image documents into single A4 pages.
    3. Renders standalone images onto dedicated A4 pages.
    4. Seamlessly and losslessly appends PDF documents page-by-page.
    Returns unified PDF bytes.
    """
    if not documents:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="At least one document must be selected to generate a print pack.",
        )

    # 1. Group documents (front/back paired vs standalone)
    items = group_documents_for_printing(documents)

    writer = pypdf.PdfWriter()

    # 2. Cover Page
    if include_cover:
        cover_bytes = generate_deal_cover_page(
            deal=deal,
            items=items,
            total_docs_count=len(documents),
        )
        cover_reader = pypdf.PdfReader(io.BytesIO(cover_bytes))
        for page in cover_reader.pages:
            writer.add_page(page)

    # 3. Process each item
    for item in items:
        if item.item_type == "paired":
            # Both front and back images
            assert item.front_doc and item.back_doc
            front_content, _ = await fetch_document_bytes(item.front_doc)
            back_content, _ = await fetch_document_bytes(item.back_doc)

            paired_page_bytes = render_paired_images_page(
                title=item.title,
                front_bytes=front_content,
                back_bytes=back_content,
                party=item.party,
                front_filename=item.front_doc.original_filename,
                back_filename=item.back_doc.original_filename,
            )
            paired_reader = pypdf.PdfReader(io.BytesIO(paired_page_bytes))
            for page in paired_reader.pages:
                writer.add_page(page)

        elif item.item_type == "single_image":
            doc = item.documents[0]
            img_content, _ = await fetch_document_bytes(doc)
            single_page_bytes = render_single_image_page(
                title=doc.title,
                image_bytes=img_content,
                party=doc.party or "joint",
                side=doc.document_side or "complete",
                original_filename=doc.original_filename,
            )
            single_reader = pypdf.PdfReader(io.BytesIO(single_page_bytes))
            for page in single_reader.pages:
                writer.add_page(page)

        elif item.item_type == "pdf":
            doc = item.documents[0]
            pdf_content, _ = await fetch_document_bytes(doc)
            try:
                doc_pdf_reader = pypdf.PdfReader(io.BytesIO(pdf_content))
                for page in doc_pdf_reader.pages:
                    writer.add_page(page)
            except Exception as e:
                # If the PDF is encrypted or invalid, render a fallback notice page
                fallback_buf = io.BytesIO()
                fc = canvas.Canvas(fallback_buf, pagesize=A4)
                _draw_page_header(
                    fc,
                    title=doc.title,
                    subtitle=f"Original File: {doc.original_filename} (Could not decode PDF stream)",
                    party=doc.party,
                    status_label="ATTACHED PDF NOTICE",
                )
                fc.save()
                fallback_buf.seek(0)
                fr = pypdf.PdfReader(fallback_buf)
                writer.add_page(fr.pages[0])

    out = io.BytesIO()
    writer.write(out)
    out.seek(0)
    return out.getvalue()
