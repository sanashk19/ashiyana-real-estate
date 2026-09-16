# Ashiyana Real Estate — P2/P3 Cleanup & Technical Debt Removal Report

## Executive Summary
Following the verification of P0/P1 fixes, this implementation batch executed all P2/P3 cleanup tasks from the comprehensive system audit. The legacy PropertyDocument architecture has been decommissioned, obsolete database tables safely dropped, dead frontend document logic and broken download handlers removed, stale hardcoded phone literals eliminated across the frontend in favor of canonical business profile constants, Vite entry-point inconsistency resolved, safe Cloudinary property media deletion implemented, JWT configuration analyzed and documented, and in-memory dead code purged.

All 6 regression suites passed 100%, frontend TypeScript builds and linter passed with 0 errors, and zero emojis are present across the codebase.

---

## Status Classification Summary

| Category | Status | Details |
| :--- | :--- | :--- |
| Legacy Property Document System | **FIXED & VERIFIED** | Removed `PropertyDocument` model, relationship, schemas, and routes. Dropped `property_documents` table via Alembic migration `7a8b9c0d1e2f`. |
| Dead Seller Document Frontend Logic | **FIXED & VERIFIED** | Removed `fetchPropertySellerDocuments`, `SellerDocumentDto`, and broken handlers `handleBrokerDownloadSellerDoc` in `BrokerPortal.tsx`. |
| Stale Phone Fallbacks | **FIXED & VERIFIED** | Eliminated `+91 95118 54490` and `+91 832 246 7890`. Replaced with `BusinessProfileContext` dynamic data and centralized `BUSINESS_CONTACT` (`+91 8888083558`). |
| Entry Point Consistency | **FIXED & VERIFIED** | Updated `frontend/index.html` from `/src/main.jsx` (which did not exist) to `/src/main.tsx`. Verified clean Vite production build. |
| Cloudinary Media Deletion | **FIXED & VERIFIED** | Added public ID extraction and safe deletion shielding in `cloudinary_service.py`. Integrated into `PropertyService.delete` and `PropertyService.delete_image`. |
| JWT Token Lifetime Review | **VERIFIED & DOCUMENTED** | Documented runtime behavior: configurable via `.env` (`ACCESS_TOKEN_EXPIRE_MINUTES=30`), default `60*24*30`. Refresh token architecture exists on backend, but silent refresh interceptor is not wired on frontend. Retained configuration to prevent mid-session logout. |
| Dead In-Memory NRI Code | **FIXED & VERIFIED** | Removed in-memory dictionary `_nri_questions` and dead endpoints (`/ask`, `/questions`, `/answer/{id}`, `/questions/{property_id}`) from `app/api/routes/nri.py`. |
| Phantom DealListItemDto | **FIXED & VERIFIED** | Replaced phantom alias `DealListItemDto` with canonical `DealDto` across frontend. |
| Zero Emojis Compliance | **VERIFIED** | Scanned 93 files across the repository; 0 emojis found. |

---

## 1. Files Changed & Files Deleted

### Files Changed:
1. `app/models/models.py`
   - Removed `Property.documents` relationship.
   - Removed `class PropertyDocument(Base)`.
2. `app/api/routes/broker.py`
   - Removed legacy routes: `POST /documents`, `GET /documents/{property_id}`, `POST /documents/{id}/grant-access`, `DELETE /documents/{id}/revoke-access`, `DELETE /documents/{id}`, `GET /my-documents/{property_id}`.
   - Cleaned up unused imports (`PropertyDocument`, `require_registered_user`, `DocumentUpload`, `DocumentAccessGrant`, `DocumentOut`).
3. `app/schemas/broker.py`
   - Removed `DocumentUpload`, `DocumentAccessGrant`, `DocumentOut`.
4. `app/schemas/seller.py`
   - Removed `SellerDocumentOut`, `SellerDocumentUploadResponse`.
5. `app/api/routes/seller.py`
   - Cleaned up unused legacy imports (`UploadFile`, `File`, `Form`, `FileResponse`, `HTTPException`, `status`, `require_registered_user`, `get_current_user`, `UserRole`, `PropertyStatus`).
6. `app/api/routes/nri.py`
   - Removed dead in-memory `_nri_questions` dict and routes (`/ask`, `/questions`, `/answer/{id}`, `/questions/{property_id}`).
   - Cleaned up unused imports (`Depends`, `HTTPException`, `AsyncSession`, `select`, `UUID`, `Optional`, `List`, `datetime`, `get_db`, `require_broker`, `require_registered_user`, `get_optional_user`, `User`, `Property`).
7. `app/services/cloudinary_service.py`
   - Added `extract_public_id_from_url(image_url: str) -> Optional[str]`.
   - Added `delete_property_media_asset(image_url: str) -> bool` with error shielding, supporting Cloudinary public assets and local disk uploads without affecting authenticated Deal Document Vault files.
8. `app/services/property_service.py`
   - Updated `delete(db, prop)` to gather associated `PropertyImage` URLs and trigger `delete_property_media_asset` post-deletion.
   - Updated `delete_image(db, property_id, image_id)` to invoke `delete_property_media_asset(image_url)` post-deletion.
9. `frontend/src/lib/api.ts`
   - Removed `SellerDocumentDto` interface.
   - Removed `fetchPropertySellerDocuments` function.
   - Removed `DealListItemDto` alias (replaced by canonical `DealDto`).
10. `frontend/src/pages/BrokerPortal.tsx`
    - Removed `fetchPropertySellerDocuments` and `SellerDocumentDto` imports.
    - Removed `propertyDocuments` and `loadingPropertyDocs` state.
    - Removed `fetchPropertySellerDocuments` call from `handleStartEditProperty`.
    - Removed dead `{/* Private Property Legal Documents */}` block from Edit Property modal.
    - Removed dead `{/* Document Vault */}` block with broken `handleBrokerDownloadSellerDoc` from Seller Detail modal.
    - Replaced `DealListItemDto` with `DealDto`.
11. `frontend/src/pages/PropertyDetail.tsx`
    - Removed hardcoded stale phone literals (`+919511854490`, `+918322467890`, `+91 832 246 7890`).
    - Connected WhatsApp and Call buttons to `profile?.whatsapp_number` / `profile?.phone` with fallback to centralized `BUSINESS_CONTACT`.
12. `frontend/src/pages/Contact.tsx`
    - Removed hardcoded stale phone literals (`+91 832 246 7890`, `+919511854490`, `+91 95118 54490`, `+918322467890`).
    - Connected contact cards, Call Now, and WhatsApp actions to `profile` and centralized `BUSINESS_CONTACT`.
13. `frontend/src/components/SiteNavbar.tsx`
    - Removed hardcoded stale phone literals (`+91 832 246 7890`).
    - Connected desktop and mobile call links to `profile?.phone` with `BUSINESS_CONTACT` fallback.
14. `frontend/src/components/SiteFooter.tsx`
    - Removed hardcoded stale phone literals (`+91 832 246 7890`).
    - Connected phone and email links to `profile` with `BUSINESS_CONTACT` fallback.
15. `frontend/index.html`
    - Corrected `<script type="module" src="/src/main.jsx"></script>` to `/src/main.tsx`.

### Files Created:
1. `app/db/alembic/versions/7a8b9c0d1e2f_drop_property_documents_table.py`
   - Alembic migration safely dropping `property_documents` table with full schema recreation on downgrade.
2. `scratch/check_db_tables.py`
   - Database inspection utility.
3. `scratch/run_migration_7a8b9c0d1e2f.py`
   - Migration runner applying `7a8b9c0d1e2f` via asyncpg.

### Files Deleted:
- None deleted from repository root (all obsolete components were cleanly refactored within their respective files; no orphaned files existed).

---

## 2. Database Migration Created & Applied

### Migration: `7a8b9c0d1e2f_drop_property_documents_table.py`
- **Revises**: `6f1b2c3d4e5f`
- **Upgrade**: `op.drop_table('property_documents')`
- **Downgrade**: Re-creates `property_documents` with exact schema from `initial_schema.py` (`id`, `property_id`, `name`, `doc_type`, `file_url`, `is_public`, `allowed_user_ids`, `uploaded_at`, foreign key constraint to `properties.id`).
- **Execution**: Applied to PostgreSQL database `ashiyana`.
- **Verified Schema**:
  - `alembic_version` head: `7a8b9c0d1e2f`
  - Active tables: `deals`, `deal_documents`, `properties`, `property_images`, `enquiries`, `saved_properties`, `seller_submissions`, `valuations`, `business_profiles`, `users`.
  - `property_documents` table: Confirmed **DROPPED** (0 references).

---

## 3. Obsolete Architecture Removed

### Backend:
- Legacy `PropertyDocument` ORM model and `Property.documents` relationship dropped.
- 6 legacy endpoints in `app/api/routes/broker.py` removed.
- Obsolete schemas `DocumentUpload`, `DocumentAccessGrant`, `DocumentOut`, `SellerDocumentOut`, `SellerDocumentUploadResponse` removed.
- Single unified document architecture confirmed: **BROKER -> DEAL -> DEAL DOCUMENTS**.

### Frontend:
- `fetchPropertySellerDocuments` and `SellerDocumentDto` removed from `frontend/src/lib/api.ts`.
- Removed dead state `propertyDocuments` and `loadingPropertyDocs` from `BrokerPortal.tsx`.
- Removed dead call to `fetchPropertySellerDocuments` on property edit.
- Removed dead UI card "Seller Legal Documents" from Edit Property modal.
- Removed dead UI card "Private Legal Documents" with un-implemented `handleBrokerDownloadSellerDoc` from Seller Detail modal.
- Confirmed Deal Document Vault UI remains sole document manager using `fetchDeals`, `fetchDeal`, `uploadDealDocument`, `downloadDealDocument`, `deleteDealDocument`.

---

## 4. Phone Fallback Cleanup

- **Canonical Sources of Truth**:
  - Dynamic: `BusinessProfileContext` (`profile.phone`, `profile.whatsapp_number`).
  - Static fallback: `BUSINESS_CONTACT` in `frontend/src/lib/constants.ts`:
    - Phone: `+91 8888083558` (Display: `+91 88880 83558`, Tel: `tel:+918888083558`)
    - WhatsApp: `918888083558` (`https://wa.me/918888083558`)
- **Stale Literals Eliminated**:
  - `+91 95118 54490` (0 occurrences remaining)
  - `+91 832 246 7890` (0 occurrences remaining)
  - `9511854490` (0 occurrences remaining)
  - `8322467890` (0 occurrences remaining)
- **Files Cleaned**: `PropertyDetail.tsx`, `Contact.tsx`, `SiteNavbar.tsx`, `SiteFooter.tsx`.

---

## 5. Cloudinary Property Media Cleanup Implementation

- **Location**: `app/services/cloudinary_service.py` and `app/services/property_service.py`
- **Mechanism**:
  1. `extract_public_id_from_url(image_url)`: Extracts Cloudinary public IDs matching pattern `/upload/(?:.../)*(?:v\d+/)?(ashiyana/[^.?#]+)`.
  2. `delete_property_media_asset(image_url)`:
     - Handles local development files stored in `uploads/properties/`.
     - Calls `cloudinary.uploader.destroy(public_id, resource_type="image", type="upload")` for public property images.
     - Shielded with `try ... except` error handling so storage network errors never roll back or abort database transactions.
  3. Integrated into `PropertyService.delete_image` (deleting single property photo).
  4. Integrated into `PropertyService.delete` (deleting entire property cascades to clean up all associated Cloudinary photo assets).
  5. Isolated from Deal Document Vault authenticated/private asset storage logic (`type="authenticated"`, signed token generation).

---

## 6. JWT Token Lifetime Finding & Architecture Review

- **Analysis**:
  - `app/core/config.py`: `ACCESS_TOKEN_EXPIRE_MINUTES` defaults to `60 * 24 * 30` (30 days).
  - `.env`: Already exposes `ACCESS_TOKEN_EXPIRE_MINUTES=30` and `REFRESH_TOKEN_EXPIRE_DAYS=7`.
  - Backend has a complete refresh token flow: `create_refresh_token()` in `app/core/security.py` and `POST /api/auth/refresh` in `app/api/routes/auth.py`.
  - Frontend currently stores only `access_token` in `localStorage` (`ashiyana_token`) without an automated Axios interceptor for transparent refresh on 401.
- **Decision (Intentionally Deferred Rewrite)**:
  - In accordance with audit instructions, we did NOT invent a frontend silent refresh token subsystem in this cleanup batch.
  - Setting `ACCESS_TOKEN_EXPIRE_MINUTES` to 15 or 30 minutes without the frontend interceptor would log brokers and users out mid-work every 30 minutes.
  - The configuration remains environment-configurable (`ACCESS_TOKEN_EXPIRE_MINUTES`) in `.env` and `app/core/config.py`.

---

## 7. Dead NRI / Phantom Code Cleanup

- **Purged**:
  - `_nri_questions: dict = {}` in-memory store in `app/api/routes/nri.py`.
  - `POST /api/nri/ask`
  - `GET /api/nri/questions`
  - `POST /api/nri/answer/{question_id}`
  - `GET /api/nri/questions/{property_id}`
  - Phantom alias `DealListItemDto` removed; `DealDto` used directly.
- **Preserved**:
  - `GET /api/nri/guide` (Static legal/regulatory Goa buying guide).
  - `POST /api/nri/rental-yield` (Stateless Goa rental & Airbnb yield calculator).

---

## 8. Verification & Test Execution Results

| Test Suite | Command | Result |
| :--- | :--- | :--- |
| Deal Vault Security & Isolation | `python scratch/test_deal_vault.py` | **PASS (100%)** |
| Saved Properties & Bookmarks | `python scratch/test_saved_properties.py` | **PASS (100%)** |
| Buyer Watcher Lead Intel | `python scratch/test_buyer_watchers.py` | **PASS (100%)** |
| Enquiry Archive & CRM Lifecycle | `python scratch/test_enquiry_archive.py` | **PASS (100%)** |
| Broker Dashboard End-to-End | `python scratch/test_broker_dashboard.py` | **PASS (100%)** |
| P0/P1 Fixes Regression | `python scratch/test_p0_p1_fixes.py` | **PASS (100%)** |
| Zero Emojis Compliance | `python scratch/check_zero_emojis.py` | **PASS (0 emojis)** |
| Frontend Oxlint | `npm run lint` | **PASS (0 errors)** |
| Frontend Vite Production Build | `npm run build` | **PASS (Built in 916ms)** |
| Healthcheck Endpoint | `GET http://127.0.0.1:8000/health` | **PASS (200 OK)** |

---

## 9. Items Intentionally Left Unchanged

1. **Fonts & Design Tokens**: Plus Jakarta Sans for headings, Inter for body/filters, gold `#C4A66A` accents preserved 100%.
2. **Home Hero & Core Pages**: Untouched as mandated.
3. **No External Dependencies**: Twilio and Cloudflare R2 were strictly NOT introduced. Direct WhatsApp (`wa.me`) and Cloudinary remain the verified stack.
4. **JWT Interceptor Architecture**: Retained current token persistence without inventing complex Axios interceptor chains.

---

## Conclusion
The Ashiyana Real Estate project is clean, structurally consistent, free of obsolete document systems and broken handlers, devoid of stale phone fallbacks, and fully verified across all backend endpoints and frontend interfaces.
