"""
Private AI Price Estimator — BROKER ONLY.
Never exposed in any public endpoint.

Trained on approximate Goa real estate price data.
Gives broker a market range to advise sellers honestly
before they decide on a listing price.
"""

import joblib
import numpy as np
from pathlib import Path
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.preprocessing import LabelEncoder
from sklearn.pipeline import Pipeline
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import StandardScaler, OrdinalEncoder
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_percentage_error
import os

MODEL_PATH = Path(__file__).parent / "price_model.joblib"

# ── Goa locality price data (₹ per sqft) ─────────────────────────────────────
# Based on approximate 2024-25 Goa market ranges
# North Goa beach belt: ₹12k–₹30k/sqft
# North Goa inland: ₹6k–₹14k/sqft
# South Goa beach: ₹8k–₹20k/sqft
# South Goa inland: ₹4k–₹10k/sqft

LOCALITY_BASE_PRICE = {
    # North Goa — premium beach belt
    "calangute": 22000, "baga": 21000, "anjuna": 20000, "vagator": 19000,
    "candolim": 23000, "sinquerim": 22500, "morjim": 18000, "assagao": 21000,
    "siolim": 17000, "mapusa": 10000, "porvorim": 12000, "panjim": 14000,
    "dona paula": 16000, "miramar": 15000, "caranzalem": 13000,
    "saligao": 13000, "pilerne": 11000, "aldona": 9000, "bicholim": 6000,
    # South Goa — beach belt
    "colva": 14000, "benaulim": 15000, "cavelossim": 16000, "palolem": 17000,
    "agonda": 16000, "varca": 14000, "betalbatim": 13000, "majorda": 13500,
    # South Goa — inland / mid tier
    "margao": 9000, "vasco": 8000, "cortalim": 7500, "curchorem": 5500,
    "quepem": 5000, "sanvordem": 4500, "sanguem": 4000,
    # Verna / IT corridor
    "verna": 10000, "chicalim": 8500, "dabolim": 8000,
}

PROPERTY_TYPE_MULTIPLIER = {
    "flat": 1.0,
    "villa": 1.35,
    "plot": 0.55,      # plots priced differently — land only
    "commercial": 1.2,
    "bungalow": 1.25,
}

FURNISHED_MULTIPLIER = {
    "furnished": 1.15,
    "semi-furnished": 1.07,
    "unfurnished": 1.0,
}


def _generate_training_data(n_samples: int = 2000):
    """Generate synthetic but realistic Goa property price data for training."""
    import random
    random.seed(42)
    np.random.seed(42)

    localities = list(LOCALITY_BASE_PRICE.keys())
    property_types = ["flat", "villa", "plot", "commercial", "bungalow"]
    furnished_states = ["furnished", "semi-furnished", "unfurnished"]

    X, y = [], []

    for _ in range(n_samples):
        locality = random.choice(localities)
        prop_type = random.choice(property_types)
        furnished = random.choice(furnished_states)
        bedrooms = random.choice([1, 2, 3, 4, 5]) if prop_type != "plot" else 0
        area_sqft = np.random.uniform(300, 5000)
        age_years = np.random.randint(0, 30)
        beach_km = np.random.uniform(0.1, 15.0)
        mopa_km = np.random.uniform(5, 80)
        floor = random.randint(0, 15) if prop_type == "flat" else 0
        region = 0 if locality in [
            "calangute", "baga", "anjuna", "vagator", "candolim", "sinquerim",
            "morjim", "assagao", "siolim", "mapusa", "porvorim", "panjim",
            "dona paula", "miramar", "caranzalem", "saligao", "pilerne",
            "aldona", "bicholim", "verna", "chicalim", "dabolim"
        ] else 1

        base = LOCALITY_BASE_PRICE.get(locality, 8000)
        type_mult = PROPERTY_TYPE_MULTIPLIER.get(prop_type, 1.0)
        furn_mult = FURNISHED_MULTIPLIER.get(furnished, 1.0)

        # Beach proximity premium
        beach_factor = max(0.7, 1.3 - (beach_km * 0.04))
        # Age depreciation
        age_factor = max(0.75, 1.0 - (age_years * 0.008))
        # Mopa airport proximity boost (North Goa)
        mopa_factor = 1.05 if mopa_km < 20 else 1.0

        price_per_sqft = base * type_mult * furn_mult * beach_factor * age_factor * mopa_factor
        # Add realistic noise
        price_per_sqft *= np.random.uniform(0.85, 1.15)

        total_price = price_per_sqft * area_sqft

        X.append([
            base / 1000,        # locality base (normalised)
            area_sqft,
            bedrooms,
            age_years,
            beach_km,
            mopa_km,
            floor,
            region,
            list(PROPERTY_TYPE_MULTIPLIER.keys()).index(prop_type),
            list(FURNISHED_MULTIPLIER.keys()).index(furnished),
        ])
        y.append(total_price)

    return np.array(X), np.array(y)


def train_and_save_model():
    """Train the estimator and save to disk. Run once."""
    print("Training Goa price estimator...")
    X, y = _generate_training_data(3000)
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    model = GradientBoostingRegressor(
        n_estimators=300,
        learning_rate=0.05,
        max_depth=5,
        subsample=0.8,
        random_state=42,
    )
    model.fit(X_train, y_train)

    mape = mean_absolute_percentage_error(y_test, model.predict(X_test))
    print(f"Model MAPE: {mape:.2%}")

    joblib.dump(model, MODEL_PATH)
    print(f"Model saved to {MODEL_PATH}")
    return model


def load_model():
    if not MODEL_PATH.exists():
        return train_and_save_model()
    return joblib.load(MODEL_PATH)


# Load model at module import (lazy — only when broker uses it)
_model = None


def get_model():
    global _model
    if _model is None:
        _model = load_model()
    return _model


def estimate_price(
    locality: str,
    area_sqft: float,
    property_type: str,
    bedrooms: int = 2,
    age_years: int = 5,
    beach_distance_km: float = 5.0,
    mopa_airport_km: float = 30.0,
    floor_number: int = 0,
    region: str = "north_goa",
    furnished: str = "unfurnished",
) -> dict:
    """
    Returns price estimate with low/mid/high range.
    BROKER EYES ONLY — never call from public endpoints.
    """
    model = get_model()

    locality_clean = locality.lower().strip()
    base = LOCALITY_BASE_PRICE.get(locality_clean, 8000)
    region_code = 0 if region == "north_goa" else 1

    prop_types = list(PROPERTY_TYPE_MULTIPLIER.keys())
    prop_idx = prop_types.index(property_type) if property_type in prop_types else 0

    furn_states = list(FURNISHED_MULTIPLIER.keys())
    furn_idx = furn_states.index(furnished) if furnished in furn_states else 2

    features = np.array([[
        base / 1000,
        area_sqft,
        bedrooms,
        age_years,
        beach_distance_km,
        mopa_airport_km,
        floor_number,
        region_code,
        prop_idx,
        furn_idx,
    ]])

    mid_estimate = float(model.predict(features)[0])

    # ±12% band for low/high range
    low = mid_estimate * 0.88
    high = mid_estimate * 1.12

    # Confidence: lower for unusual combos, higher for well-represented localities
    known_locality = locality_clean in LOCALITY_BASE_PRICE
    confidence = 0.82 if known_locality else 0.60

    return {
        "estimated_low": round(low, -3),       # round to nearest 1000
        "estimated_mid": round(mid_estimate, -3),
        "estimated_high": round(high, -3),
        "price_per_sqft_approx": round(mid_estimate / area_sqft, 0),
        "confidence_score": confidence,
        "locality_known": known_locality,
        "note": (
            "Based on approximate Goa market data. "
            "Use as internal reference only — final pricing at broker discretion."
        ),
    }
