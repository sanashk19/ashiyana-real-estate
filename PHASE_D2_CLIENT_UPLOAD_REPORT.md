# Ashiyana Real Estate — Phase D2: Secure Client Document Upload Flow
## Comprehensive Verification & Architecture Report

**Status:** Completed & 100% Verified  
**Date:** September 7, 2026  
**Author:** Antigravity AI  

---

### 1. Overview & Objectives

Phase D2 completes the client-facing side of the secure, tokenized document-request workflow established in Phase D1. 

#### Core Architecture Principles Enforced
1. **Zero Customer Accounts / Zero Passwords:** Clients do not register, log in, or authenticate with passwords. They interact exclusively via cryptographically secure, time-limited tokens (`secrets.token_urlsafe(32)`).
2. **One-Way Token Security:** Only the SHA-256 hash of the raw token is persisted in PostgreSQL (`deal_upload_requests.token_hash`). Raw tokens are never logged or stored.
3. **Zero Sensitive PII Leakage:** Public verification (`GET /api/public/upload-requests/verify?token=...`) returns only safe context (`deal_number`, `party`, `broker_name`, `requested_docs`, `message`, `expires_at`). Client phone numbers, email addresses, residential addresses, financial amounts, and existing vault documents are completely excluded.
4. **Strict Document Scope Enforcement:** Uploads (`POST /api/public/upload-requests/upload`) validate that the uploaded document title matches the requested scope. Arbitrary or unrequested document uploads are rejected with `403 Forbidden`.
5. **Document Side Disambiguation:** Physical Indian identity documents (Aadhaar cards, voter IDs, driving licenses) frequently require two sides. The upload flow provides side tags (`front`, `back`, `complete`) and automatically serializes distinct titles (e.g. `Buyer Aadhaar / Passport ID (Front)`).
6. **Robust File & Extension Validation:** Enforces magic byte header inspection (JPEG, PNG, WebP, PDF), rejects extensions that do not match binary signatures, enforces a 15 MB file size limit, and sanitizes filenames against directory traversal (`os.path.basename`).
7. **Instant Expiry & Revocation Cutoff:** Expired or broker-revoked tokens are immediately rejected across all public endpoints with proper HTTP status codes (`410 Gone` / `400 Bad Request`).
8. **Anti-Spam Duplicate Throttling:** Rejects rapid duplicate uploads of the exact same content within a 60-second window (`409 Conflict`).

---

### 2. Implementation Summary

#### Backend Components
- **`app/schemas/deals.py`**:
  - Enhanced `PublicUploadRequestVerifyOut` to include `broker_name: Optional[str]`.
  - Added `ClientDocumentUploadResponse` (`success`, `message`, `document_title`, `document_side`, `original_filename`).
- **`app/api/routes/deals.py`**:
  - `GET /api/public/upload-requests/verify`: Validates token hash, checks `is_revoked` and `expires_at`, fetches requester profile to supply the broker name ("Kassim Shaikh"), and outputs public metadata without PII.
  - `POST /api/public/upload-requests/upload`: Accepts token, requested document title, document side, and file. Performs security checks, magic byte inspection, uploads via `upload_deal_document` to Cloudinary / local fallback, records the `DealDocument`, and updates the compliance checklist.
  - Token-overlap matching in `_build_checklist`: Tokenizes titles to ensure documents with side suffixes (e.g. `Buyer Aadhaar / Passport ID (Front)`) cleanly match checklist items (`Buyer Aadhaar / Passport ID`).

#### Frontend Components
- **`frontend/src/lib/api.ts`**:
  - Added `PublicUploadRequestVerifyDto` (with `broker_name`) and `ClientDocumentUploadResponseDto`.
  - Added `verifyPublicUploadRequest(token)` and `uploadClientDocument(token, requestedDocTitle, documentSide, file)`.
- **`frontend/src/pages/ClientUploadPage.tsx`**:
  - Mobile-first, responsive, luxury client upload interface.
  - Handles 7 token lifecycle states: `loading`, `active`, `missing_token`, `invalid_token`, `expired_token`, `revoked_token`, `network_error`.
  - Interactive requested document slots with side selectors (`Complete Document`, `Front Side`, `Back Side`), camera/photo library file pickers, real-time client-side size validation (<15MB), progress banners, and green verified checkmarks upon upload.
  - Prominently displays lead broker branding ("Kassim Shaikh", "Lead Broker & Founder, Ashiyana Real Estate") with official contact details.
- **`frontend/src/App.tsx`**:
  - Registered route `/upload-documents` pointing to `ClientUploadPage`.

---

### 3. Verification & Test Results

#### A. Automated Pytest Test Suite (`tests/test_client_upload.py`)
All 12 security and behavioral test cases passed in 32.55s:
1. `test_public_verify_valid_token`: **PASS** (Safe metadata, zero PII, broker name returned)
2. `test_public_verify_invalid_token`: **PASS** (Returns 404 for invalid token)
3. `test_public_verify_expired_token`: **PASS** (Returns 410 for expired token)
4. `test_public_verify_revoked_token`: **PASS** (Returns 400 for revoked token)
5. `test_client_upload_valid_single_and_sides`: **PASS** (Front & back uploads succeed with side metadata)
6. `test_client_upload_unrequested_document_rejected`: **PASS** (Returns 403 Forbidden for out-of-scope document)
7. `test_client_upload_magic_bytes_validation`: **PASS** (Returns 400 for extension spoofing)
8. `test_client_upload_oversized_file_rejected`: **PASS** (Returns 413 for file > 15MB)
9. `test_client_upload_filename_traversal_sanitization`: **PASS** (Path traversal attempts sanitized cleanly)
10. `test_client_upload_rapid_duplicate_rejected`: **PASS** (Returns 409 for rapid identical duplicate)
11. `test_client_upload_cross_deal_isolation`: **PASS** (Token from Deal A cannot upload to Deal B)
12. `test_client_upload_updates_deal_checklist`: **PASS** (Checklist status transitions to `uploaded` and associates document)

#### B. Core Regression Test Suites
1. `scratch/test_deal_vault.py`: **PASS (100%)** — All 8 deal vault security, audit, and checklist verification steps passed.
2. `scratch/test_saved_properties.py`: **PASS (100%)** — Saved properties API regression passed.
3. `scratch/test_buyer_watchers.py`: **PASS (100%)** — Buyer watchers intelligence regression passed.
4. `scratch/test_enquiry_archive.py`: **PASS (100%)** — CRM lead archive, unarchive, and authorization checks passed.
5. `scratch/test_broker_dashboard.py`: **PASS (100%)** — All 9 broker dashboard KPI, listing, and visit scheduling steps passed.
6. `scratch/test_batch_a_verification.py`: **PASS (100%)** — Batch A deal lifecycle and vault verification passed.

#### C. Live Server End-to-End Test Suite (`scratch/test_live_client_upload_flow.py`)
Tested directly against the live backend (`http://127.0.0.1:8000/api`):
1. Authenticate Kassim Shaikh (Broker): **PASS**
2. Create Deal for Document Collection (ASH-2026-017): **PASS**
3. Generate Secure Tokenized Upload Request: **PASS**
4. Client Verifies Upload Link (GET `/api/public/upload-requests/verify`): **PASS**
5. Zero PII Leakage in Public Payload: **PASS**
6. Invalid Token Rejection (404 Not Found): **PASS**
7. Upload Requested Document Front (`Buyer Aadhaar / Passport ID (Front)`): **PASS**
8. Upload Requested Document Back (`Buyer Aadhaar / Passport ID (Back)`): **PASS**
9. Out-of-Scope Document Rejection (403 Forbidden): **PASS**
10. Spoofed Extension Magic Byte Rejection (400 Bad Request): **PASS**
11. Broker Checks Deal Vault (2 documents present with correct side metadata): **PASS**
12. Compliance Checklist Updates (Status transitions to `uploaded`): **PASS**
13. Broker Revocation Cutoff (Immediate 400 Bad Request on verify and upload): **PASS**

#### D. Code Quality & Formatting
- **Zero Emoji Check**: **PASS** (0 emojis found in any new or modified files)
- **TypeScript Linting (`npm run lint`)**: **PASS** (0 errors, 0 warnings)
- **Production Build (`npm run build`)**: **PASS** (Built in 590ms without errors)

---

### 4. Deferred Items
The following items were explicitly deferred and remain untouched:
- Client authentication / customer accounts (strictly avoided to preserve zero-friction client experience).
- Client-side or server-side OCR and Aadhaar number extraction.
- Automatic image collage/stitching of front + back into a single file.
- Flutter mobile app integration (reserved for subsequent phase).
