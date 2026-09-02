"""
WhatsApp Lead Qualification Bot — Phase 4
Buyer messages your dad's WhatsApp business number
→ Twilio webhook → FastAPI → bot qualifies lead
→ structured lead card appears in broker dashboard
→ broker gets notified, not spammed with raw messages
"""

from fastapi import APIRouter, Request, Depends, Form
from fastapi.responses import PlainTextResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from typing import Optional
import re

from app.db.database import get_db
from app.models.models import Property, Enquiry, PropertyStatus, ListingType, PropertyType
from app.core.config import settings

router = APIRouter(prefix="/whatsapp", tags=["whatsapp bot"])

# ── Conversation state store (in-memory, keyed by phone number) ───────────────
_sessions: dict[str, dict] = {}


def _twiml_reply(message: str) -> PlainTextResponse:
    """Return a TwiML response that WhatsApp understands."""
    xml = f"""<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Message>{message}</Message>
</Response>"""
    return PlainTextResponse(content=xml, media_type="application/xml")


def _parse_budget(text: str) -> Optional[float]:
    """Parse budget from natural language. '50 lakhs', '1.5 cr', '80L' etc."""
    text = text.lower().replace(",", "").strip()
    match_cr = re.search(r"(\d+\.?\d*)\s*(cr|crore)", text)
    match_l = re.search(r"(\d+\.?\d*)\s*(l|lakh|lac)", text)
    match_plain = re.search(r"(\d+)", text)

    if match_cr:
        return float(match_cr.group(1)) * 1_00_00_000
    elif match_l:
        return float(match_l.group(1)) * 1_00_000
    elif match_plain and int(match_plain.group(1)) > 1000:
        return float(match_plain.group(1))
    return None


def _parse_bhk(text: str) -> Optional[int]:
    match = re.search(r"(\d)\s*bhk", text.lower())
    if match:
        return int(match.group(1))
    for word, num in [("one", 1), ("two", 2), ("three", 3), ("four", 4)]:
        if word in text.lower():
            return num
    return None


async def _find_matching_listings(
    db: AsyncSession,
    listing_type: str,
    budget: Optional[float],
    bedrooms: Optional[int],
    locality: Optional[str],
) -> list:
    conditions = [Property.status == PropertyStatus.active]

    if listing_type in ("rent", "buy"):
        lt = ListingType.rent if listing_type == "rent" else ListingType.sale
        conditions.append(
            (Property.listing_type == lt) |
            (Property.listing_type == ListingType.both)
        )
    if budget:
        conditions.append(Property.price <= budget * 1.15)  # 15% flexibility
    if bedrooms:
        conditions.append(Property.bedrooms == bedrooms)
    if locality:
        conditions.append(Property.locality.ilike(f"%{locality}%"))

    result = await db.execute(
        select(Property)
        .where(and_(*conditions))
        .order_by(Property.is_featured.desc(), Property.created_at.desc())
        .limit(3)
    )
    return result.scalars().all()


@router.post("/webhook", response_class=PlainTextResponse)
async def whatsapp_webhook(
    request: Request,
    From: str = Form(...),           # buyer's WhatsApp number
    Body: str = Form(...),           # message text
    db: AsyncSession = Depends(get_db),
):
    """
    Twilio webhook — called on every incoming WhatsApp message.
    Runs a simple state-machine conversation to qualify the lead.
    """
    phone = From.replace("whatsapp:", "").strip()
    text = Body.strip()
    session = _sessions.get(phone, {"step": "start"})

    # ── Step: start / greeting ─────────────────────────────────────────────────
    if session["step"] == "start" or any(
        greet in text.lower() for greet in ["hi", "hello", "namaste", "hey", "helo"]
    ):
        _sessions[phone] = {"step": "ask_intent", "name": None}
        return _twiml_reply(
            "*Ashiyana Buy Sell Rent*\n\n"
            "Welcome! I am here to help you find the perfect property in Goa.\n\n"
            "Are you looking to:\n"
            "1. *Buy* a property\n"
            "2. *Rent* a property\n"
            "3. *Sell / List* your property\n\n"
            "Reply with 1, 2, or 3."
        )

    # ── Step: intent ──────────────────────────────────────────────────────────
    if session["step"] == "ask_intent":
        if "1" in text or "buy" in text.lower():
            session.update({"step": "ask_budget", "intent": "buy"})
        elif "2" in text or "rent" in text.lower():
            session.update({"step": "ask_budget", "intent": "rent"})
        elif "3" in text or "sell" in text.lower() or "list" in text.lower():
            session.update({"step": "done"})
            _sessions.pop(phone, None)
            return _twiml_reply(
                "Great! Our broker will contact you to discuss listing your property.\n\n"
                "You can also submit our *Property Valuation Form* at:\n"
                f"{settings.FRONTEND_URL}/sell\n\n"
                "We will be in touch shortly!"
            )
        else:
            return _twiml_reply("Please reply with *1* (Buy), *2* (Rent), or *3* (Sell).")

        _sessions[phone] = session
        return _twiml_reply(
            f"Looking to *{'buy' if session['intent'] == 'buy' else 'rent'}* — great choice!\n\n"
            "What is your *budget*?\n"
            "_(e.g. 50 lakhs, 1.5 crore, 25000/month)_"
        )

    # ── Step: budget ──────────────────────────────────────────────────────────
    if session["step"] == "ask_budget":
        budget = _parse_budget(text)
        session.update({"step": "ask_bhk", "budget": budget})
        _sessions[phone] = session
        return _twiml_reply(
            "Got it!\n\n"
            "How many *bedrooms* are you looking for?\n"
            "_(e.g. 1 BHK, 2 BHK, 3 BHK — or type 'any')_"
        )

    # ── Step: BHK ─────────────────────────────────────────────────────────────
    if session["step"] == "ask_bhk":
        bedrooms = None if "any" in text.lower() else _parse_bhk(text)
        session.update({"step": "ask_locality", "bedrooms": bedrooms})
        _sessions[phone] = session
        return _twiml_reply(
            "Understood.\n\n"
            "Any preferred *area or locality* in Goa?\n"
            "_(e.g. Calangute, Panjim, Margao, South Goa — or type 'any')_"
        )

    # ── Step: locality → find matches + create lead ───────────────────────────
    if session["step"] == "ask_locality":
        locality = None if "any" in text.lower() else text.strip()
        session.update({"step": "ask_name", "locality": locality})
        _sessions[phone] = session
        return _twiml_reply(
            "Great! One last thing — what is your *name*?"
        )

    # ── Step: name → find listings + save lead ────────────────────────────────
    if session["step"] == "ask_name":
        name = text.strip().title()
        session["name"] = name

        # Find matching properties
        matches = await _find_matching_listings(
            db,
            listing_type=session.get("intent", "buy"),
            budget=session.get("budget"),
            bedrooms=session.get("bedrooms"),
            locality=session.get("locality"),
        )

        # Save structured lead to broker dashboard
        if matches:
            lead = Enquiry(
                property_id=matches[0].id,
                buyer_name=name,
                buyer_phone=phone,
                message=(
                    f"WhatsApp lead | Intent: {session.get('intent')} | "
                    f"Budget: INR {session.get('budget', 'not specified')} | "
                    f"BHK: {session.get('bedrooms', 'any')} | "
                    f"Locality: {session.get('locality', 'any')}"
                ),
                budget=session.get("budget"),
                source="whatsapp",
            )
            db.add(lead)
            await db.flush()

        # Build reply with matching listings
        _sessions.pop(phone, None)

        if not matches:
            return _twiml_reply(
                f"Thank you, *{name}*!\n\n"
                "We do not have exact matches right now, but our broker will personally "
                "reach out with curated options.\n\n"
                "Expect a call soon."
            )

        reply = f"Thank you, *{name}*! Here are your top matches:\n\n"
        for i, prop in enumerate(matches, 1):
            price_display = (
                f"INR {prop.price/100000:.1f}L/mo"
                if session.get("intent") == "rent"
                else f"INR {prop.price/100000:.1f}L"
            )
            reply += (
                f"*{i}. {prop.title}*\n"
                f"Location: {prop.locality}\n"
                f"Price: {price_display}"
            )
            if prop.bedrooms:
                reply += f" | {prop.bedrooms} BHK"
            reply += f"\nLink: {settings.FRONTEND_URL}/property/{prop.id}\n\n"

        reply += "Our broker will call you shortly to arrange site visits!"
        return _twiml_reply(reply)

    # ── Fallback ──────────────────────────────────────────────────────────────
    _sessions.pop(phone, None)
    return _twiml_reply(
        "Hello! Type *hi* to start finding your property in Goa.\n"
        "Or call us directly for immediate assistance."
    )
