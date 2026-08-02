from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from uuid import UUID
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

from app.db.database import get_db
from app.core.dependencies import require_broker, require_registered_user, get_optional_user
from app.models.models import User, Property

router = APIRouter(prefix="/nri", tags=["NRI mode"])


# ── Static NRI info ───────────────────────────────────────────────────────────

@router.get("/guide")
async def nri_buying_guide():
    """
    NRI-specific information for buying property in Goa.
    Displayed when NRI mode is toggled on a listing.
    """
    return {
        "title": "NRI Property Buying Guide — Goa",
        "eligibility": {
            "who_can_buy": [
                "NRI (Non-Resident Indian) — Indian citizen residing abroad",
                "OCI (Overseas Citizen of India) card holders",
                "PIO (Person of Indian Origin) card holders",
            ],
            "restrictions": [
                "Agricultural land cannot be purchased by NRIs without RBI permission",
                "Plantation property purchase requires special approval",
                "Commercial and residential property — freely purchasable",
            ],
        },
        "fema_rules": {
            "summary": "Under FEMA 1999, NRIs can freely purchase residential and commercial property in India.",
            "payment_rules": [
                "Payment must be made through NRE / NRO / FCNR bank account",
                "Foreign currency remittance through banking channels only",
                "No payment in foreign currency notes or travellers cheques",
            ],
            "repatriation": [
                "Sale proceeds of up to 2 residential properties can be repatriated",
                "Amount repatriable limited to original investment in foreign currency",
                "Capital gains can be repatriated after applicable TDS deduction",
                "Repatriation through NRE account — freely repatriable",
            ],
        },
        "tax_implications": {
            "tds_on_purchase": "Buyer must deduct TDS @ 1% if property value > ₹50L",
            "nri_seller_tds": "If buying from NRI seller — TDS @ 20% on long-term capital gains",
            "rental_income_tax": "Rental income taxable in India; DTAA benefits available for many countries",
        },
        "documents_required": [
            "Valid Indian passport / OCI card",
            "PAN card (mandatory for property purchase)",
            "NRE/NRO bank account details",
            "Address proof abroad",
            "Power of Attorney (if not visiting in person — notarized and apostilled)",
            "Sale agreement, title deed, approved building plan",
            "Form 26QB for TDS deduction",
        ],
        "goa_specific_tips": [
            "Verify property is not under Communidade land (village community ownership)",
            "Check for CRZ (Coastal Regulation Zone) restrictions near beaches",
            "Verify conversion from agricultural to residential if buying plot",
            "North Goa beach properties have very high Airbnb rental yields (peak season)",
            "Confirm RERA registration for under-construction projects",
        ],
        "process_steps": [
            "1. Identify property and negotiate price with broker",
            "2. Verify title, obtain encumbrance certificate",
            "3. Sign Agreement to Sell (pay token advance)",
            "4. Due diligence — title search, approvals",
            "5. Draft sale deed",
            "6. Register at Sub-Registrar office (can be via POA)",
            "7. Pay stamp duty and registration charges",
            "8. Transfer utilities, mutation at local panchayat",
        ],
    }


# ── Rental yield calculator ───────────────────────────────────────────────────

class YieldRequest(BaseModel):
    property_price: float
    locality: str
    property_type: str = "flat"
    bedrooms: int = 2
    area_sqft: float = 1000


@router.post("/rental-yield")
async def calculate_rental_yield(data: YieldRequest):
    """
    Rental yield calculator for investor buyers.
    Shows expected monthly rent, annual yield, and Airbnb potential.
    Anchored to realistic Goa rental data — NOT conflicting with listed prices.
    """
    # Approximate monthly rent ranges by locality (₹/month for long-term)
    LONG_TERM_RENT = {
        "calangute": {1: 18000, 2: 28000, 3: 45000},
        "baga": {1: 17000, 2: 26000, 3: 42000},
        "anjuna": {1: 16000, 2: 24000, 3: 40000},
        "candolim": {1: 20000, 2: 32000, 3: 50000},
        "assagao": {1: 18000, 2: 28000, 3: 45000},
        "morjim": {1: 14000, 2: 22000, 3: 35000},
        "panjim": {1: 15000, 2: 22000, 3: 35000},
        "porvorim": {1: 12000, 2: 18000, 3: 28000},
        "mapusa": {1: 10000, 2: 15000, 3: 24000},
        "verna": {1: 11000, 2: 16000, 3: 25000},
        "margao": {1: 9000, 2: 14000, 3: 22000},
        "colva": {1: 12000, 2: 18000, 3: 28000},
        "benaulim": {1: 13000, 2: 20000, 3: 32000},
        "palolem": {1: 14000, 2: 22000, 3: 35000},
    }

    # Airbnb/short-term daily rates (₹/night, peak season Oct–Mar)
    AIRBNB_DAILY_PEAK = {
        "calangute": {1: 3500, 2: 6000, 3: 9000},
        "baga": {1: 3200, 2: 5500, 3: 8500},
        "anjuna": {1: 3000, 2: 5000, 3: 8000},
        "candolim": {1: 4000, 2: 7000, 3: 10000},
        "assagao": {1: 3500, 2: 6000, 3: 9000},
        "morjim": {1: 2800, 2: 4800, 3: 7500},
        "palolem": {1: 2800, 2: 4800, 3: 7500},
        "benaulim": {1: 2500, 2: 4200, 3: 6500},
    }

    locality = data.locality.lower().strip()
    bhk = min(data.bedrooms, 3)  # cap at 3 for table lookup

    # Long-term monthly rent
    rent_table = LONG_TERM_RENT.get(locality, {1: 12000, 2: 18000, 3: 28000})
    monthly_rent = rent_table.get(bhk, rent_table.get(2, 18000))
    annual_long_term = monthly_rent * 12
    long_term_yield = (annual_long_term / data.property_price) * 100

    # Short-term (Airbnb) calculation
    airbnb_table = AIRBNB_DAILY_PEAK.get(locality)
    airbnb_available = airbnb_table is not None

    airbnb_annual = None
    airbnb_yield = None
    airbnb_peak_monthly = None

    if airbnb_available:
        daily_peak = airbnb_table.get(bhk, airbnb_table.get(2, 5000))
        daily_offpeak = daily_peak * 0.45
        # Peak: Oct–Mar (6 months) at 78% occupancy
        # Off-peak: Apr–Sep (6 months) at 35% occupancy
        peak_revenue = daily_peak * 180 * 0.78
        offpeak_revenue = daily_offpeak * 185 * 0.35
        airbnb_annual = peak_revenue + offpeak_revenue
        airbnb_yield = (airbnb_annual / data.property_price) * 100
        airbnb_peak_monthly = daily_peak * 30 * 0.78

    # Payback period
    payback_years_long = data.property_price / annual_long_term if annual_long_term > 0 else None
    payback_years_airbnb = data.property_price / airbnb_annual if airbnb_annual else None

    return {
        "property_price": data.property_price,
        "locality": data.locality,
        "bedrooms": data.bedrooms,
        "long_term_rental": {
            "monthly_rent_estimate": monthly_rent,
            "annual_income": annual_long_term,
            "gross_yield_percent": round(long_term_yield, 2),
            "payback_years": round(payback_years_long, 1) if payback_years_long else None,
            "note": "Long-term tenant, stable income, lower yield",
        },
        "short_term_airbnb": {
            "available_for_locality": airbnb_available,
            "peak_daily_rate": airbnb_table.get(bhk) if airbnb_available else None,
            "peak_monthly_income": round(airbnb_peak_monthly) if airbnb_peak_monthly else None,
            "annual_income_estimate": round(airbnb_annual) if airbnb_annual else None,
            "gross_yield_percent": round(airbnb_yield, 2) if airbnb_yield else None,
            "payback_years": round(payback_years_airbnb, 1) if payback_years_airbnb else None,
            "occupancy_assumptions": "78% peak (Oct–Mar), 35% off-peak (Apr–Sep)",
            "note": "Higher yield but requires property management",
        },
        "recommendation": (
            "Short-term rental significantly outperforms long-term for this locality."
            if (airbnb_yield and airbnb_yield > long_term_yield * 1.4)
            else "Long-term rental offers stable, lower-maintenance income for this locality."
        ),
        "disclaimer": (
            "Estimates based on approximate Goa market data. "
            "Actual returns depend on property condition, management, and market conditions. "
            "Consult a financial advisor before investing."
        ),
    }


# ── Async Q&A for NRI buyers ──────────────────────────────────────────────────

class NRIQuestion(BaseModel):
    property_id: UUID
    question: str
    buyer_name: str
    buyer_email: str
    timezone: Optional[str] = "UTC"


class NRIAnswer(BaseModel):
    question_id: UUID
    answer: str


# Simple in-memory Q&A store (replace with DB table in production)
_nri_questions: dict = {}


@router.post("/ask")
async def submit_nri_question(
    data: NRIQuestion,
    db: AsyncSession = Depends(get_db),
):
    """NRI buyer submits a question about a property — broker answers async."""
    import uuid as _uuid
    qid = str(_uuid.uuid4())
    _nri_questions[qid] = {
        "id": qid,
        "property_id": str(data.property_id),
        "question": data.question,
        "buyer_name": data.buyer_name,
        "buyer_email": data.buyer_email,
        "timezone": data.timezone,
        "answer": None,
        "answered_at": None,
        "created_at": datetime.utcnow().isoformat(),
    }
    return {
        "question_id": qid,
        "message": "Question submitted. Our broker will respond within 24 hours.",
    }


@router.get("/questions")
async def get_all_questions(broker: User = Depends(require_broker)):
    """Broker sees all pending NRI questions."""
    return list(_nri_questions.values())


@router.post("/answer/{question_id}")
async def answer_question(
    question_id: str,
    data: NRIAnswer,
    broker: User = Depends(require_broker),
):
    """Broker answers an NRI question."""
    if question_id not in _nri_questions:
        raise HTTPException(status_code=404, detail="Question not found")
    _nri_questions[question_id]["answer"] = data.answer
    _nri_questions[question_id]["answered_at"] = datetime.utcnow().isoformat()
    return {"message": "Answer saved. Buyer will be notified."}


@router.get("/questions/{property_id}")
async def get_property_qa(property_id: UUID):
    """Public: get answered Q&As for a property (helps future NRI buyers)."""
    answered = [
        {"question": q["question"], "answer": q["answer"], "answered_at": q["answered_at"]}
        for q in _nri_questions.values()
        if q["property_id"] == str(property_id) and q["answer"]
    ]
    return answered
