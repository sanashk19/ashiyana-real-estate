# Ashiyana Buy Sell Rent — Backend

AI-powered real estate broker platform built for a Goa-based broker.
Live project — actively used by the business.

## Tech Stack
- **Backend**: FastAPI + PostgreSQL (PostGIS) + SQLAlchemy (async)
- **Auth**: JWT + Google OAuth
- **Media**: Cloudinary
- **Maps**: PostGIS + Leaflet
- **AI**: scikit-learn price estimator (broker-only)
- **Integrations**: Twilio WhatsApp bot
- **Deployment**: Railway + Docker

## Project Structure
```
ashiyana/
├── app/
│   ├── api/routes/       # Route handlers per feature
│   ├── core/             # Config, security, dependencies
│   ├── db/               # Database engine, migrations
│   ├── models/           # SQLAlchemy models (7 tables)
│   ├── schemas/          # Pydantic request/response schemas
│   ├── services/         # Business logic layer
│   └── main.py           # FastAPI app entry point
├── tests/
├── docker-compose.yml
├── Dockerfile
└── requirements.txt
```

## Setup

### 1. Clone and install
```bash
git clone https://github.com/yourusername/ashiyana.git
cd ashiyana
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
```

### 2. Environment
```bash
cp .env.example .env
# Fill in your values
```

### 3. Run with Docker (recommended)
```bash
docker-compose up --build
```

### 4. Run locally
```bash
# Start PostgreSQL separately, then:
alembic upgrade head
uvicorn app.main:app --reload
```

### 5. Run migrations
```bash
alembic upgrade head
```

## API Docs
Visit `http://localhost:8000/docs` (development only)

## Key Design Decisions
- **No bypass**: Property addresses and owner contacts are never exposed in public API responses
- **Broker-only AI**: Price estimator endpoint protected by `require_broker` dependency
- **Approximate coordinates only**: Public map markers use `approx_lat/lng`, never `exact_location`
- **Document access control**: Per-buyer document unlocking controlled by broker

## Feature Map (all 4 phases — 48 endpoints)

### Phase 1 — Auth
- Email/password + Google OAuth, JWT + refresh tokens
- 3 roles: `broker` (full access) / `user` (registered buyer-seller) / public (anonymous)

### Phase 2 — Listings Engine
- Full property CRUD (broker-only writes)
- Public search with Goa-specific filters (region, flood risk, NRI eligibility, short-term rental potential)
- Two response shapes: `PropertyPublic` (no address) vs `PropertyBroker` (full details)
- Save/unsave listings, broker sees "who's watching" each property
- Enquiry system — every buyer message routes through the broker only
- "Get Free Valuation" seller submission flow → broker reviews → auto-creates draft listing
- Cloudinary media upload (photos, capped sizes/types)

### Phase 3 — Broker Dashboard
- `/broker/dashboard` — single endpoint, all home-screen stats
- `/broker/follow-ups` — leads due for callback
- `/broker/estimate-price` — **private AI price estimator** (GradientBoostingRegressor trained on Goa locality data), hard-gated to broker role, never reachable from public pages
- Document vault — per-property docs with granular per-buyer access grants/revokes

### Phase 4 — WhatsApp Bot + NRI Mode
- `/whatsapp/webhook` — Twilio-powered conversational bot: greets → asks intent → budget → BHK → locality → name → matches listings → creates structured lead automatically
- `/nri/guide` — FEMA rules, repatriation, tax, document checklist, Goa-specific buying tips
- `/nri/rental-yield` — long-term vs Airbnb yield calculator using Goa locality rent/occupancy data
- `/nri/ask` + `/nri/answer` — async Q&A between NRI buyers and broker across time zones

## Running the Price Estimator Standalone
```bash
python -m app.services.estimator   # trains + saves model to price_model.joblib on first call
```
The model auto-trains on first use if no saved model is found — no manual step needed in normal operation.

## What's Next (not yet built)
- Frontend (React) — separate repo/folder
- Redis-backed WhatsApp session state (currently in-memory, resets on restart)
- Persisting NRI Q&A to a database table (currently in-memory dict)
- Real PostGIS-based proximity scoring (beach/airport distances currently broker-entered, not computed)

