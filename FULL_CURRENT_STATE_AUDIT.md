# ASHIYANA — FULL CURRENT STATE AUDIT

**Audit Date**: September 5, 2026  
**Auditor**: Antigravity Agentic AI Quality & Security Engine  
**Repository Source of Truth**: `c:\Users\91951\OneDrive\Desktop\ashiyana-project\ashiyana`  
**Operating Mode**: Read-Only Comprehensive Audit (Zero Modifications Executed)

---

## 1. Executive Summary

This repository-wide audit evaluates the current operational, architectural, security, database, and contract health of the **Ashiyana Real Estate** platform (Goa Buy / Sell / Rent brokerage platform). 

The platform's foundational architecture is robust: FastAPI async backend, PostgreSQL with PostGIS geometric extensions, Alembic schema versioning, JWT RBAC authorization, React 19 / Vite frontend, and Cloudinary dual-tier media storage (public property assets vs authenticated private deal document vault). All prior P0/P1 fixes (Enquiry contract alignment, general contact inquiries, schedule visit flows, Broker Deals route consistency, and production Cloudinary fail-closed behavior) remain functional in the core code.

However, this audit uncovered **2 P1 major feature issues**, **6 P2 reliability/security/database issues**, and **6 P3 polish/code-quality issues**:
1. **ReferenceError in Watcher Intelligence**: `frontend/src/lib/api.ts` invokes an undefined function `getBrokerAuthToken()` in `fetchPropertyWatchers()` and `fetchPropertyWatcherSummary()`, throwing a runtime error.
2. **Unmounted Watcher Intelligence UI**: In `frontend/src/pages/BrokerPortal.tsx`, watcher intelligence methods are imported but never rendered in the portal JSX.
3. **Database/Model Schema Mismatch**: `valuations` table in PostgreSQL contains column `confidence_score NUMERIC(5,2)`, but the SQLAlchemy model `Valuation` in `app/models/models.py` omits it.
4. **Security Expiration Gap**: JWT `ACCESS_TOKEN_EXPIRE_MINUTES` defaults to **30 days** in `app/core/config.py`, contradicting `.env.example` (30 minutes) and presenting an extended exposure window.
5. **Inconsistent Document Download Route**: Backend `_format_doc_out` outputs `download_url` as `/api/broker/documents/{id}/download` (which returns 404), while the actual route mounted is `/api/documents/{id}/download`.
6. **Zero Emoji Mandate Violations**: 244 emojis remain present across 18 frontend/backend files and `README.md`.
7. **Empty Test Suite**: The official `tests/` directory is empty (`__init__.py` only); all tests exist as ad-hoc scripts in `scratch/`, with one script failing import on removed `SellerDocument`.

---

## 2. What Is Working
*(Only features physically verified via direct ASGI/database testing are listed)*

1. **Authentication & Role-Based Access Control (RBAC)**:
   - Broker login (`/api/auth/login`), Buyer registration/login (`/api/auth/register`), Seller registration/login (`/api/auth/seller/register`).
   - Hard RBAC gate: Unauthenticated access to `/api/broker/dashboard` returns `401 Unauthorized`.
   - Role isolation: Buyer and Seller tokens accessing `/api/broker/*` return `403 Forbidden`. Buyer tokens accessing `/api/seller/*` return `403 Forbidden`.
   - Current user profile endpoint (`/api/auth/me`) correctly reflects active role and claims.
2. **Business Profile Single Source of Truth**:
   - Database table `business_profiles` backed by `GET /api/business/profile` and `PUT /api/business/profile`.
   - Frontend `BusinessProfileContext` distributes dynamic broker details (`Kassim Shaikh`, `+91 8888083558`, `918888083558`, `Calangute & Panaji, Goa`) to `SiteNavbar`, `SiteFooter`, and WhatsApp link generators.
3. **Public Property Browse & Search**:
   - `GET /api/properties` with multi-dimensional filtering (`property_type`, `listing_type`, `region`, `locality`, `price`, `bedrooms`, `nri_eligible`).
   - `GET /api/properties/featured` returning active featured property cards.
   - Strict address protection: `PropertyPublic` schema excludes `full_address` and exact PostGIS coordinates.
4. **Property Detail & Private Walkthrough Modal**:
   - `GET /api/properties/{id}` resolves property data and auto-increments `view_count`.
   - Lead submission modal (`PropertyEnquiryModal`) posts to `/api/enquiries` with full buyer contact, NRI flag, and custom walkthrough message.
5. **Buyer Saved Properties (Bookmarks)**:
   - Registered buyers can bookmark (`POST /api/properties/{id}/save`), list bookmarks (`GET /api/properties/saved/mine`), and remove bookmarks (`DELETE /api/properties/{id}/save`).
   - Duplicate saves are gracefully handled; deletion of property cascades to saved properties.
6. **Enquiry & Broker CRM Lifecycle**:
   - Public/authenticated enquiry submissions (`POST /api/enquiries`) support both property-linked inquiries and general contact inquiries (`property_id=None`).
   - Broker CRM board (`GET /api/enquiries`) lists leads with status filters.
   - Lead archiving (`PATCH /api/enquiries/{id}/archive`) and restoring (`PATCH /api/enquiries/{id}/unarchive`) function without data loss.
7. **Broker Deal Pipeline & Deal Document Vault**:
   - Deals CRUD: `POST /api/deals`, `GET /api/deals`, `GET /api/deals/{id}`, `PUT /api/deals/{id}`, `DELETE /api/deals/{id}`.
   - Sequential deal number generation (`ASH-YYYY-NNN`).
   - Document upload (`POST /api/deals/{id}/documents`) supports authenticated Cloudinary upload with magic-byte, MIME, and 15MB size validation.
   - Direct download endpoint (`GET /api/documents/{id}/download`) serves time-limited signed URLs or streams local fallback files.
   - Document deletion (`DELETE /api/documents/{id}`) removes remote storage assets prior to deleting the DB record.
8. **AI Property Valuation Engine**:
   - `POST /api/broker/estimate-price` calculates low/mid/high price bands using `GradientBoostingRegressor` and Goan locality base rates.
   - Valuation history (`GET /api/broker/valuation-history`) logs past calculations for broker reference.
9. **Seller Submissions & Portal**:
   - Public seller submission (`POST /api/submissions`) records property details and photos.
   - Broker review (`PATCH /api/submissions/{id}`) updates status (`pending` -> `reviewing` -> `accepted` -> `listed`).
   - Seller dashboard (`GET /api/seller/dashboard`, `GET /api/seller/submissions`, `GET /api/seller/properties`) displays live submission statuses and converted listings.
10. **Storage Fail-Closed Safeguards**:
    - In `ENVIRONMENT=production`, missing or invalid Cloudinary credentials fail closed (raising HTTP 500/502) rather than writing unauthenticated local files.
11. **Direct WhatsApp Connectivity**:
    - Direct `wa.me` links generated across `SiteNavbar`, `SiteFooter`, `PropertyDetail`, `Contact`, and `SellProperty` with pre-filled context messages.

---

## 3. What Is Broken

1. **`frontend/src/lib/api.ts` — Undefined `getBrokerAuthToken` Reference**:
   - **Location**: [api.ts:L1327](file:///c:/Users/91951/OneDrive/Desktop/ashiyana-project/ashiyana/frontend/src/lib/api.ts#L1327) and [api.ts:L1341](file:///c:/Users/91951/OneDrive/Desktop/ashiyana-project/ashiyana/frontend/src/lib/api.ts#L1341)
   - **Reason**: Functions `fetchPropertyWatchers()` and `fetchPropertyWatcherSummary()` attempt to invoke `getBrokerAuthToken()`, but `api.ts` exports `getAuthToken()`. Calling either function results in an unhandled `ReferenceError: getBrokerAuthToken is not defined`.
2. **`frontend/src/pages/BrokerPortal.tsx` — Unmounted Watcher Intelligence UI**:
   - **Location**: [BrokerPortal.tsx:L44-46](file:///c:/Users/91951/OneDrive/Desktop/ashiyana-project/ashiyana/frontend/src/pages/BrokerPortal.tsx#L44-L46)
   - **Reason**: `fetchPropertyWatchers` and `fetchPropertyWatcherSummary` are imported on line 44-45, but are nowhere referenced in the component body or JSX tabs. Brokers cannot access Watcher Intelligence from the UI.
3. **`scratch/test_step6_document_access.py` — Broken Test Import**:
   - **Location**: [test_step6_document_access.py:L10](file:///c:/Users/91951/OneDrive/Desktop/ashiyana-project/ashiyana/scratch/test_step6_document_access.py#L10)
   - **Reason**: The test script imports `SellerDocument` from `app.models.models`, but `SellerDocument` was removed when document vaults were consolidated. This causes `pytest` collection and test runs to fail with `ImportError`.
4. **`app/api/routes/deals.py` — Broken Download URL in DTO Serializer**:
   - **Location**: [deals.py:L91](file:///c:/Users/91951/OneDrive/Desktop/ashiyana-project/ashiyana/app/api/routes/deals.py#L91)
   - **Reason**: Helper `_format_doc_out` generates `download_url=f"/api/broker/documents/{doc.id}/download"`. No route `/api/broker/documents/{id}/download` exists; the actual route is `/api/documents/{id}/download`.

---

## 4. What Is Missing

1. **Official Test Suite in `tests/` Directory**:
   - **Location**: [tests/](file:///c:/Users/91951/OneDrive/Desktop/ashiyana-project/ashiyana/tests)
   - **Reason**: `tests/` contains only `__init__.py`. There are no automated CI integration test suites using FastAPI `ASGITransport` or `pytest-asyncio`.
2. **JWT Token Invalidation / Revocation Mechanism**:
   - **Location**: [app/api/routes/auth.py](file:///c:/Users/91951/OneDrive/Desktop/ashiyana-project/ashiyana/app/api/routes/auth.py)
   - **Reason**: `/api/auth/logout` clears cookies/frontend tokens, but the issued JWT remains valid on the backend until expiry because no token blacklist or session versioning exists.
3. **Database-backed Dynamic Content for Area Guide**:
   - **Location**: [frontend/src/pages/AreaGuide.tsx](file:///c:/Users/91951/OneDrive/Desktop/ashiyana-project/ashiyana/frontend/src/pages/AreaGuide.tsx)
   - **Reason**: Area Guide uses static arrays with fixed listing counts (e.g. `listings: 24`, `listings: 31`) rather than deriving active counts from `GET /api/properties`.

---

## 5. What Is Incomplete

1. **NRI Backend Endpoints Orphaned from Frontend**:
   - **Location**: [app/api/routes/nri.py](file:///c:/Users/91951/OneDrive/Desktop/ashiyana-project/ashiyana/app/api/routes/nri.py)
   - **Reason**: `GET /api/nri/guide` and `POST /api/nri/rental-yield` exist with complete mathematical and regulatory models in FastAPI, but `frontend/src/lib/api.ts` and UI pages have no functions or components connected to them.
2. **Broker Unused Analytics & Follow-Up Endpoints**:
   - **Location**: [app/api/routes/enquiries.py:L310](file:///c:/Users/91951/OneDrive/Desktop/ashiyana-project/ashiyana/app/api/routes/enquiries.py) and [app/api/routes/broker.py:L108](file:///c:/Users/91951/OneDrive/Desktop/ashiyana-project/ashiyana/app/api/routes/broker.py#L108)
   - **Reason**: `GET /api/enquiries/stats/summary` and `GET /api/broker/follow-ups` exist in FastAPI backend, but frontend `BrokerPortal.tsx` calculates follow-up filters and KPIs locally from the main enquiries list and dashboard stats.

---

## 6. Security Findings

| Finding | Severity | Location | Risk | Recommendation |
|---|---|---|---|---|
| **30-Day JWT Expiry Default** | P2 | [config.py:L13](file:///c:/Users/91951/OneDrive/Desktop/ashiyana-project/ashiyana/app/core/config.py#L13) | `ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 30` (30 days). Leaked access tokens remain usable for an entire month without server revocation. | Align default to 30-60 minutes in `config.py` and rely on refresh token rotation for long sessions. |
| **CORS Default Port Mismatch** | P3 | [config.py:L27](file:///c:/Users/91951/OneDrive/Desktop/ashiyana-project/ashiyana/app/core/config.py#L27) | `FRONTEND_URL` defaults to `http://localhost:3000` while Vite runs on `http://localhost:5173`. `main.py` manually adds 5173 as a workaround. | Update `FRONTEND_URL` default in `config.py` to `http://localhost:5173`. |
| **Document Download URL 404 Exposure** | P2 | [deals.py:L91](file:///c:/Users/91951/OneDrive/Desktop/ashiyana-project/ashiyana/app/api/routes/deals.py#L91) | `download_url` in DTO points to `/api/broker/documents/...` instead of `/api/documents/...`. | Fix route prefix in `_format_doc_out` to `/api/documents/{doc.id}/download`. |
| **Hardcoded Fallback Phone in Constants** | P3 | [constants.ts:L11-50](file:///c:/Users/91951/OneDrive/Desktop/ashiyana-project/ashiyana/frontend/src/lib/constants.ts#L11-L50) | `constants.ts` defines static `BUSINESS_CONTACT` and placeholder `SOCIAL_LINKS` (`facebook.com/ashiyanagoa`). | Ensure `useBusinessProfile()` is the strict single source of truth across all components. |

---

## 7. Database Findings

1. **Model / Schema Drift: `valuations.confidence_score`**:
   - **PostgreSQL Database**: Column `confidence_score NUMERIC(5,2)` exists in `valuations` table.
   - **SQLAlchemy Model**: `Valuation` class in [models.py:L414-438](file:///c:/Users/91951/OneDrive/Desktop/ashiyana-project/ashiyana/app/models/models.py#L414-L438) does not declare `confidence_score`.
   - **Impact**: Inserting or querying `Valuation` records via SQLAlchemy ignores this column.
2. **Seller Submission Conversion Foreign Key**:
   - `seller_submissions.converted_property_id` references `properties.id`.
   - If a converted property is deleted, `converted_property_id` is not automatically set to `NULL` unless explicitly configured with `ondelete="SET NULL"`.
3. **N+1 Image Query on Seller Properties**:
   - In `app/api/routes/seller.py` [seller.py:L112](file:///c:/Users/91951/OneDrive/Desktop/ashiyana-project/ashiyana/app/api/routes/seller.py#L112), fetching listed properties for a seller executes a separate `SELECT property_images...` query inside a Python `for` loop.

---

## 8. API Contract Findings

### Backend vs Frontend Contract Matrix

| Endpoint | HTTP Method | Backend Route File | Frontend Method (`api.ts`) | Status / Match |
|---|---|---|---|---|
| `/api/auth/login` | POST | `auth.py` | `loginBroker`, `loginUser` | MATCH |
| `/api/auth/register` | POST | `auth.py` | `registerUser` | MATCH |
| `/api/auth/seller/register` | POST | `auth.py` | `registerSeller` | MATCH |
| `/api/auth/seller/login` | POST | `auth.py` | `loginSeller` | MATCH |
| `/api/auth/me` | GET | `auth.py` | `fetchCurrentUserProfile` | MATCH |
| `/api/business/profile` | GET | `business.py` | `fetchBusinessProfile` | MATCH |
| `/api/business/profile` | PUT | `business.py` | `updateBusinessProfile` | MATCH |
| `/api/properties` | GET | `properties.py` | `fetchProperties` | MATCH |
| `/api/properties/featured` | GET | `properties.py` | `fetchFeaturedProperties` | MATCH |
| `/api/properties/{id}` | GET | `properties.py` | `fetchPropertyById` | MATCH |
| `/api/properties` | POST | `properties.py` | `createProperty` | MATCH |
| `/api/properties/{id}` | PATCH | `properties.py` | `updateProperty` | MATCH |
| `/api/properties/{id}` | DELETE | `properties.py` | `deleteProperty` | MATCH |
| `/api/properties/{id}/images` | GET | `properties.py` | `fetchPropertyImages` | MATCH |
| `/api/properties/{id}/images` | POST | `properties.py` | `attachPropertyImages` | MATCH |
| `/api/properties/{id}/images/upload` | POST | `properties.py` | `uploadPropertyImages` | MATCH |
| `/api/properties/{id}/images/reorder` | PATCH | `properties.py` | `reorderPropertyImages` | MATCH |
| `/api/properties/{id}/images/{img_id}/thumbnail` | PATCH | `properties.py` | `setPropertyThumbnail` | MATCH |
| `/api/properties/{id}/images/{img_id}` | DELETE | `properties.py` | `deletePropertyImage` | MATCH |
| `/api/properties/{id}/save` | POST | `properties.py` | `saveProperty` | MATCH |
| `/api/properties/{id}/save` | DELETE | `properties.py` | `unsaveProperty` | MATCH |
| `/api/properties/saved/mine` | GET | `properties.py` | `fetchMySavedProperties` | MATCH |
| `/api/properties/{id}/watchers` | GET | `properties.py` | `fetchPropertyWatchers` | **MISMATCH** (`getBrokerAuthToken` undefined) |
| `/api/broker/properties/watcher-summary` | GET | `broker.py` | `fetchPropertyWatcherSummary` | **MISMATCH** (`getBrokerAuthToken` undefined) |
| `/api/enquiries` | POST | `enquiries.py` | `submitEnquiry` | MATCH |
| `/api/enquiries` | GET | `enquiries.py` | `fetchEnquiries` | MATCH |
| `/api/enquiries/{id}` | PATCH | `enquiries.py` | `updateEnquiry` | MATCH |
| `/api/enquiries/{id}/archive` | PATCH | `enquiries.py` | `archiveEnquiry` | MATCH |
| `/api/enquiries/{id}/unarchive` | PATCH | `enquiries.py` | `unarchiveEnquiry` | MATCH |
| `/api/submissions` | POST | `enquiries.py` | `submitValuationRequest` | MATCH |
| `/api/submissions` | GET | `enquiries.py` | `fetchSubmissions` | MATCH |
| `/api/submissions/{id}` | PATCH | `enquiries.py` | `reviewSubmission` | MATCH |
| `/api/seller/dashboard` | GET | `seller.py` | `fetchSellerDashboardStats` | MATCH |
| `/api/seller/submissions` | GET | `seller.py` | `fetchSellerSubmissions` | MATCH |
| `/api/seller/properties` | GET | `seller.py` | `fetchSellerProperties` | MATCH |
| `/api/deals` | GET | `deals.py` | `fetchDeals` | MATCH |
| `/api/deals` | POST | `deals.py` | `createDeal` | MATCH |
| `/api/deals/{id}` | GET | `deals.py` | `fetchDeal` | MATCH |
| `/api/deals/{id}` | PUT | `deals.py` | `updateDeal` | MATCH |
| `/api/deals/{id}` | DELETE | `deals.py` | `deleteDeal` | MATCH |
| `/api/deals/{id}/documents` | POST | `deals.py` | `uploadDealDocument` | MATCH |
| `/api/deals/{id}/documents` | GET | `deals.py` | `fetchDealDocuments` | MATCH |
| `/api/documents/{id}/download` | GET | `deals.py` | `downloadDealDocument` | MATCH |
| `/api/documents/{id}` | DELETE | `deals.py` | `deleteDealDocument` | MATCH |
| `/api/broker/dashboard` | GET | `broker.py` | `fetchDashboardStats` | MATCH |
| `/api/broker/estimate-price` | POST | `broker.py` | `estimatePropertyPrice` | MATCH |
| `/api/broker/valuation-history` | GET | `broker.py` | `fetchValuationHistory` | MATCH |
| `/api/broker/sellers` | GET | `broker.py` | `fetchBrokerSellers` | MATCH |
| `/api/broker/sellers/{id}` | GET | `broker.py` | `fetchBrokerSellerDetail` | MATCH |
| `/api/media/upload/seller-photos` | POST | `media.py` | `uploadSellerPhotos` | MATCH |
| `/api/nri/guide` | GET | `nri.py` | *None* | **ORPHANED** (backend only) |
| `/api/nri/rental-yield` | POST | `nri.py` | *None* | **ORPHANED** (backend only) |
| `/api/enquiries/stats/summary` | GET | `enquiries.py` | *None* | **ORPHANED** (backend only) |
| `/api/broker/follow-ups` | GET | `broker.py` | *None* | **ORPHANED** (backend only) |

---

## 9. Frontend Findings

1. **Watcher Intelligence Tab Missing in Broker Navigation**:
   - `ActiveTab` type in `BrokerPortal.tsx` has `dashboard`, `properties`, `add-property`, `submissions`, `sellers`, `deals`, `enquiries`, `visits`, `valuation`, `profile`.
   - Watcher intelligence has no dedicated sub-view or property inspector modal in the UI.
2. **15 Oxlint Linter Warnings**:
   - Unused variables: `enquiryIntent` in `PropertyDetail.tsx`, `loadingSellers`, `loadingSellerDetail`, `loadingDeals`, `loadingDealDetail`, `setEnquiryNriFilter` in `BrokerPortal.tsx`.
   - Unused imports in `SavedPropertiesContext.tsx` (`getUserAuthToken`, `setUserAuthToken`).
   - Fast refresh warnings in `shared.tsx`, `SavedPropertiesContext.tsx`, `BusinessProfileContext.tsx`.
3. **Hardcoded WhatsApp Link in Services Page**:
   - `frontend/src/pages/Services.tsx` line 31 hardcodes `https://wa.me/918888083558` rather than dynamically generating from `useBusinessProfile()`.

---

## 10. Backend Findings

1. **N+1 Query in `get_my_listed_properties`**:
   - `app/api/routes/seller.py` loops over properties and queries `property_images` one-by-one.
2. **Missing `confidence_score` in SQLAlchemy `Valuation` Model**:
   - Missing field prevents ORM reading/writing of model confidence ratings.
3. **Download URL Prefix Inconsistency in `_format_doc_out`**:
   - In `app/api/routes/deals.py`, `doc.download_url` is formatted with `/api/broker/documents/{id}/download` which 404s.

---

## 11. Cloudinary / Storage Findings

1. **Dual Storage Model Working Correctly**:
   - Public property images upload via `app/api/routes/media.py` and `app/services/property_service.py` with `type="upload"`.
   - Private deal documents upload via `app/services/cloudinary_service.py` with `type="authenticated"`.
2. **Safe Deletion Shielding**:
   - Deleting a property catches Cloudinary destruction exceptions so PostgreSQL transaction commits successfully even if Cloudinary network timeouts occur.
3. **Production Fail-Closed Guarantee**:
   - In `ENVIRONMENT=production`, if Cloudinary credentials are empty or invalid, requests fail closed (HTTP 500/502) rather than writing unauthenticated local files.

---

## 12. Authentication Findings

1. **30-Day Token Duration**:
   - `app/core/config.py` hardcodes `ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 30`. Recommended best practice is short-lived access tokens (15–60 minutes) combined with refresh tokens.
2. **Multiple Role Token Storage in Frontend**:
   - Frontend uses `ashiyana_token` (broker), `ashiyana_user_token` (buyer), and `ashiyana_seller_token` (seller) in `localStorage`.
   - Axios request interceptor prioritizes tokens based on request path. If a user logs into multiple roles on the same browser, token resolution works cleanly.

---

## 13. Testing Gaps

1. **Empty `tests/` Directory**:
   - No pytest test suite in `tests/`.
2. **External Server Coupling in `scratch/` Tests**:
   - Existing scratch scripts assume `http://127.0.0.1:8000/api` is running on a live port, failing when Docker or local port 8000 is occupied.
3. **Broken Script `test_step6_document_access.py`**:
   - Fails on obsolete `SellerDocument` import.
4. **Missing Frontend Automated Tests**:
   - No Vitest / React Testing Library suites for component validation.

---

## 14. Dead / Obsolete Code

1. **`scratch/test_step6_document_access.py`**:
   - Outdated test referencing deleted `SellerDocument` model.
2. **Orphaned Backend Endpoints**:
   - `GET /api/nri/guide` and `POST /api/nri/rental-yield` in `app/api/routes/nri.py`.
   - `GET /api/enquiries/stats/summary` in `app/api/routes/enquiries.py`.
   - `GET /api/broker/follow-ups` in `app/api/routes/broker.py`.
3. **Dead Imports in `BrokerPortal.tsx`**:
   - `fetchPropertyWatchers`, `fetchPropertyWatcherSummary`, `PropertyWatcherItemDto` imported on lines 44-46 without usage.

---

## 15. Performance Findings

1. **[CURRENTLY PROBLEMATIC] Seller Properties N+1 Query**:
   - In `app/api/routes/seller.py`, querying images inside a loop causes `1 + N` SQL roundtrips.
2. **[CURRENTLY PROBLEMATIC] Large Asset Bundling in Frontend**:
   - Vite build warnings indicate individual assets and main JS chunk (`dist/assets/index-PP8lwx0E.js` at 967 kB) exceed 500 kB recommended threshold due to un-codesplit route imports.
3. **[FUTURE OPTIMIZATION] Property Search PostGIS Spatial Indexing**:
   - `properties.exact_location` has a geometry column, but spatial GIST indexes could be added if geospatial radius searches expand.

---

## 16. Documentation Findings

1. **`README.md` Emoji Count**:
   - `README.md` contains 55 emoji characters across headers and lists, violating the zero emoji policy.
2. **Port Documentation**:
   - `.env.example` documents `FRONTEND_URL=http://localhost:3000`, while the Vite app defaults to `5173`.

---

## 17. Production Readiness Assessment

### Overall Status: **NEEDS FIXES**

**Reasoning**:
The core architecture (FastAPI + PostgreSQL + Cloudinary + React 19) is exceptionally strong, stable, and functionally complete across the primary user journeys (Buyer Search, Property Details, Saved Properties, Lead Inquiries, Seller Submissions, Broker CRM, AI Valuation, and Deal Vault).

However, it cannot be marked **READY** until the following production-blocking items are addressed:
1. Fix the runtime `ReferenceError` in `frontend/src/lib/api.ts` (`getBrokerAuthToken` -> `getAuthToken`) and wire up Watcher Intelligence in the Broker Portal.
2. Align the database/model schema for `valuations.confidence_score`.
3. Correct the 30-day JWT access token lifetime default in `app/core/config.py`.
4. Fix the DTO `download_url` in `app/api/routes/deals.py`.
5. Eliminate the 244 emoji violations across the codebase to adhere to the strict design mandate.
6. Populate standard integration tests in `tests/` using `ASGITransport`.

---

## 18. Prioritized Fix List

| Priority | Category | Finding | Exact Location | Evidence | Recommended Action |
|---|---|---|---|---|---|
| **P1** | **API CONTRACT** | `getBrokerAuthToken` is undefined in `api.ts` | [api.ts:L1327, 1341](file:///c:/Users/91951/OneDrive/Desktop/ashiyana-project/ashiyana/frontend/src/lib/api.ts#L1327) | `fetchPropertyWatchers()` and `fetchPropertyWatcherSummary()` throw `ReferenceError: getBrokerAuthToken is not defined` | Replace `getBrokerAuthToken()` with `getAuthToken()` in `api.ts`. |
| **P1** | **UI/UX** | Buyer Watcher Intelligence UI unmounted in Broker Portal | [BrokerPortal.tsx:L44](file:///c:/Users/91951/OneDrive/Desktop/ashiyana-project/ashiyana/frontend/src/pages/BrokerPortal.tsx#L44) | `fetchPropertyWatchers` is imported on line 44 but never rendered in the Broker Portal JSX | Render Watcher Intelligence summary cards or modal inside the Properties / CRM tab. |
| **P2** | **DATA INTEGRITY** | `valuations.confidence_score` column missing in SQLAlchemy model | [models.py:L414-438](file:///c:/Users/91951/OneDrive/Desktop/ashiyana-project/ashiyana/app/models/models.py#L414-L438) | DB inspector shows column `confidence_score NUMERIC(5,2)` exists in `valuations` table, missing in `Valuation` model | Add `confidence_score = Column(Numeric(5, 2), nullable=True)` to `Valuation` model in `models.py`. |
| **P2** | **SECURITY** | 30-Day JWT Access Token Expiry in Config | [config.py:L13](file:///c:/Users/91951/OneDrive/Desktop/ashiyana-project/ashiyana/app/core/config.py#L13) | `ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 30` in `config.py` | Change default in `config.py` to `30` minutes and use refresh token endpoint for renewal. |
| **P2** | **API CONTRACT** | Inconsistent `download_url` in Deal Document serializer | [deals.py:L91](file:///c:/Users/91951/OneDrive/Desktop/ashiyana-project/ashiyana/app/api/routes/deals.py#L91) | `download_url` returns `/api/broker/documents/{doc.id}/download` (404) | Change `_format_doc_out` to return `/api/documents/{doc.id}/download`. |
| **P2** | **TESTING** | `tests/` directory empty and scratch tests coupled to live port | [tests/](file:///c:/Users/91951/OneDrive/Desktop/ashiyana-project/ashiyana/tests), [scratch/](file:///c:/Users/91951/OneDrive/Desktop/ashiyana-project/ashiyana/scratch) | Official `tests/` has 0 tests; scratch tests require running on live port 8000 | Migrate verified test flows to `tests/` using `pytest` and `httpx.ASGITransport(app=app)`. |
| **P2** | **DEAD CODE** | Broken test import in `scratch/test_step6_document_access.py` | [test_step6_document_access.py:L10](file:///c:/Users/91951/OneDrive/Desktop/ashiyana-project/ashiyana/scratch/test_step6_document_access.py#L10) | `ImportError: cannot import name 'SellerDocument' from 'app.models.models'` | Remove obsolete script or update to test Deal Documents. |
| **P2** | **PERFORMANCE** | N+1 Query in Seller Listed Properties endpoint | [seller.py:L112](file:///c:/Users/91951/OneDrive/Desktop/ashiyana-project/ashiyana/app/api/routes/seller.py#L112) | Individual image query inside loop over seller's listed properties | Load properties with `selectinload(Property.images)` in a single query. |
| **P3** | **UI/UX / CLEANUP** | 244 Emoji Violations Across Files | 18 files across `frontend/`, `app/`, and `README.md` | Automated Unicode regex scan detected 244 emojis | Remove all emojis and replace with Lucide SVG icons in UI or clean text in docs. |
| **P3** | **DEAD CODE** | Orphaned backend endpoints in NRI & Broker routes | `nri.py`, `enquiries.py`, `broker.py` | `/api/nri/guide`, `/api/nri/rental-yield`, `/api/enquiries/stats/summary`, `/api/broker/follow-ups` unused by UI | Either connect NRI endpoints to frontend calculators or document as headless API. |
| **P3** | **UI/UX** | Static listing counts in Area Guide | [AreaGuide.tsx:L101-112](file:///c:/Users/91951/OneDrive/Desktop/ashiyana-project/ashiyana/frontend/src/pages/AreaGuide.tsx#L101-L112) | Hardcoded numbers like `listings: 24`, `listings: 31` | Remove hardcoded counts or derive dynamically from backend. |
| **P3** | **CONFIGURATION** | Default Frontend Port mismatch (`3000` vs `5173`) | [config.py:L27](file:///c:/Users/91951/OneDrive/Desktop/ashiyana-project/ashiyana/app/core/config.py#L27), [.env.example:L21](file:///c:/Users/91951/OneDrive/Desktop/ashiyana-project/ashiyana/.env.example#L21) | `FRONTEND_URL` defaults to `3000` while Vite runs on `5173` | Update default `FRONTEND_URL` to `http://localhost:5173`. |
| **P3** | **CODE QUALITY** | 15 Oxlint linter warnings in frontend | `BrokerPortal.tsx`, `PropertyDetail.tsx`, `SavedPropertiesContext.tsx` | Oxlint identifies unused state variables and fast-refresh exports | Clean up unused state declarations and split utility exports. |
| **P3** | **CONFIGURATION** | Hardcoded WhatsApp Link in Services Page | [Services.tsx:L31](file:///c:/Users/91951/OneDrive/Desktop/ashiyana-project/ashiyana/frontend/src/pages/Services.tsx#L31) | `https://wa.me/918888083558` hardcoded in `buildWaLink` | Use `useBusinessProfile()` dynamic WhatsApp number. |

---

### MUST FIX BEFORE PRODUCTION (P0 / P1)
1. **Fix `getBrokerAuthToken` in `frontend/src/lib/api.ts`**: Replace undefined call with `getAuthToken()`.
2. **Mount Buyer Watcher Intelligence in `BrokerPortal.tsx`**: Wire up watcher lists and summary counters in the broker properties dashboard.

---

### SHOULD FIX (P2)
1. **Sync `Valuation` SQLAlchemy Model**: Add `confidence_score` column to `app/models/models.py`.
2. **Reduce JWT Access Token Default Expiry**: Update `ACCESS_TOKEN_EXPIRE_MINUTES` in `config.py` from 30 days to 30 minutes.
3. **Fix Deal Document `download_url` in DTO**: Correct route string to `/api/documents/{id}/download`.
4. **Create Canonical Integration Tests in `tests/`**: Implement in-memory ASGI test fixtures.
5. **Clean up `test_step6_document_access.py`**: Remove obsolete import of deleted `SellerDocument`.
6. **Optimize Seller Properties Query**: Eliminate the N+1 image loop in `app/api/routes/seller.py`.

---

### NICE TO HAVE (P3)
1. **Zero Emoji Purge**: Strip all 244 emojis across UI components, docstrings, and `README.md`.
2. **NRI UI Connection or Documentation**: Wire `/api/nri/rental-yield` to an interactive calculator modal in `PropertyDetail` or `Services`.
3. **Area Guide Dynamic Counts**: Replace static numbers in `AreaGuide.tsx` with dynamic tags or qualitative descriptions.
4. **Align Default Ports**: Set `FRONTEND_URL=http://localhost:5173` in `config.py` and `.env.example`.
5. **Clean Oxlint Warnings**: Remove unused variables in `BrokerPortal.tsx` and `PropertyDetail.tsx`.
6. **Dynamic WhatsApp in `Services.tsx`**: Connect `useBusinessProfile()` in `Services.tsx`.

---

### INTENTIONALLY NOT REQUIRED
*(Deliberately outside Ashiyana's architectural scope)*
- **Twilio SMS / Third-party WhatsApp Gateway**: Direct `wa.me` links with URL-encoded messages are the intentional, zero-cost, high-reliability architecture for Goa real estate.
- **Customer / Seller Legal Vaults**: Legal documents are exclusively managed in the Broker Deal Document Vault. Customers and sellers do not possess arbitrary cloud document storage.
- **Multi-Tenancy / Multi-Broker Routing**: Ashiyana is a dedicated single-brokerage platform for Kassim Shaikh. Multi-tenant routing is out of scope.
- **Third-Party Map Tiles / Paid GIS Subscriptions**: Leaflet / static map approximations with PostGIS backend point calculations meet all privacy and operational requirements without recurring API fees.
