# ASHIYANA — PHASE D1 REPORT: BROKER CLIENT + DEAL WORKSPACE FOUNDATION
**Status**: Completed  
**Date**: September 7, 2026  
**Environment**: Production-grade local stack (FastAPI + PostgreSQL + Alembic + Vite React + Cloudinary Authenticated Storage)

---

## 1. Executive Summary

Phase D1 establishes the unified backend and frontend foundation for real estate transaction management in Ashiyana. It bridges the desktop **Broker Portal** (`/broker`) with the forthcoming **Broker Flutter Mobile App** by introducing structured buyer/seller party records, statutory document checklists, broker verification workflows, and secure tokenized document upload requests without requiring customer accounts.

All modifications strictly conform to the project guidelines:
- **No redesign** of the public website, home hero, fonts, colors, or global design system.
- **Zero plain-text storage** of sensitive client identity numbers (e.g. Aadhaar).
- **Single Source of Truth** for Deal models—no duplicate tables or bifurcated mobile business logic.
- **No extra external dependencies** (no Twilio, no Cloudflare R2). Existing authenticated Cloudinary storage is utilized for document retention.

---

## 2. Database & Schema Migrations

### Alembic Migration
- **Revision ID**: `8b9c0d1e2f3a`
- **Down Revision**: `7a8b9c0d1e2f`
- **Execution**: Successfully applied via `python -m alembic upgrade head`.

### Data Model Enhancements
1. **`deals` Table**:
   - Added structured party fields:
     - `buyer_phone` (`VARCHAR(32)`, nullable)
     - `buyer_email` (`VARCHAR(255)`, nullable)
     - `buyer_address` (`TEXT`, nullable)
     - `buyer_notes` (`TEXT`, nullable)
     - `seller_phone` (`VARCHAR(32)`, nullable)
     - `seller_email` (`VARCHAR(255)`, nullable)
     - `seller_address` (`TEXT`, nullable)
     - `seller_notes` (`TEXT`, nullable)
2. **`deal_documents` Table**:
   - Added verification and side classification:
     - `party` (`VARCHAR(32)`: `"property"`, `"buyer"`, `"seller"`, `"joint"`)
     - `document_side` (`VARCHAR(32)`: `"complete"`, `"front"`, `"back"`)
     - `is_verified` (`BOOLEAN`, default `False`)
     - `verified_at` (`TIMESTAMPTZ`, nullable)
     - `verified_by` (`VARCHAR(100)`, nullable)
3. **`deal_upload_requests` Table (New)**:
   - Tokenized client document upload requests:
     - `id` (`VARCHAR(36)`, Primary Key UUID)
     - `deal_id` (`VARCHAR(36)`, ForeignKey to `deals.id` on delete CASCADE)
     - `party` (`VARCHAR(32)`: `"buyer"` or `"seller"`)
     - `token_hash` (`VARCHAR(64)`, Indexed SHA-256 hash of random 32-byte URL-safe secret)
     - `requested_docs` (`JSONB`, list of requested document types)
     - `custom_message` (`TEXT`, optional note from broker)
     - `status` (`VARCHAR(32)`: `"active"`, `"used"`, `"expired"`, `"revoked"`)
     - `expires_at` (`TIMESTAMPTZ`)
     - `created_at` (`TIMESTAMPTZ`)

---

## 3. API Contract & Endpoints

| Method | Path | Auth | Purpose |
|---|---|---|---|
| `GET` | `/api/deals` | Broker (Bearer) | List all deals with parties and document counts |
| `POST` | `/api/deals` | Broker (Bearer) | Create a deal with structured buyer & seller info |
| `GET` | `/api/deals/{deal_id}` | Broker (Bearer) | Retrieve deal details, structured parties, documents, and dynamic checklist |
| `PATCH` | `/api/deals/{deal_id}` | Broker (Bearer) | Update deal details, status, commercials, or party records |
| `POST` | `/api/deals/{deal_id}/documents` | Broker (Bearer) | Upload document to vault with party and side metadata |
| `PATCH` | `/api/deals/{deal_id}/documents/{document_id}/verify` | Broker (Bearer) | Toggle broker verification status of a vault document |
| `POST` | `/api/deals/{deal_id}/upload-requests` | Broker (Bearer) | Generate a secure, tokenized document request link |
| `GET` | `/api/deals/{deal_id}/upload-requests` | Broker (Bearer) | List upload request links and statuses for a deal |
| `POST` | `/api/deals/{deal_id}/upload-requests/{request_id}/revoke` | Broker (Bearer) | Revoke an active upload request link |
| `GET` | `/api/public/upload-requests/verify?token=...` | Public | Validate token and retrieve deal number, broker name, and requested docs |

---

## 4. Desktop Broker Workspace (`/broker`) Enhancements

The Deal Detail view has been refactored into a focused 4-tab executive transaction workspace:

1. **Tab 1: Overview & Financials**
   - 5-stage interactive transaction stepper (`Inquiry` -> `Negotiation` -> `Agreement Signed` -> `Closed Won` -> `Cancelled`).
   - Associated listing preview with direct link.
   - Financial breakdown (agreed price, brokerage fee, vault doc count, compliance %).
   - Confidential internal broker notes.
2. **Tab 2: Document Vault**
   - Filter pills (`All`, `Property`, `Seller KYC`, `Buyer Proofs`, `Legal Contracts`, `Financial`).
   - Metadata tags (`Party`, `Side`, `File Size`, `Date`).
   - One-click broker document verification toggle (`Verify` / `Verified`).
   - Authenticated Cloudinary / local fallback document download and permanent deletion.
3. **Tab 3: Verification & Checklist**
   - Statutory Goa compliance checklist matching uploaded vault documents vs pending items.
   - Match indicator displaying linked vault document ID and verification state.
   - Active client upload request table with statuses (`Active`, `Expired`, `Revoked`) and revocation button.
   - "Request Client Documents" primary action trigger.
4. **Tab 4: Client Parties & CRM**
   - Comprehensive Buyer & Seller contact cards.
   - Direct click-to-call (`tel:`) and click-to-WhatsApp (`wa.me`) integration.
   - "Edit Party Records" modal allowing instantaneous updates to names, phones, emails, addresses, and transaction notes.
5. **Modals Added**:
   - **Edit Deal Parties Modal**: Manage buyer & seller details simultaneously.
   - **Upload Document Modal**: Updated with Party (`Property`, `Buyer`, `Seller`, `Joint`) and Side (`Complete`, `Front`, `Back`) selectors.
   - **Create Tokenized Upload Request Modal**: Multi-select requested checklist documents, configure link expiry, generate copyable links, and launch pre-filled WhatsApp messages to clients.

---

## 5. Security & Privacy Architecture

1. **Token Storage**: Plaintext tokens are returned **only once** upon generation. Only the SHA-256 hash (`token_hash`) is persisted in PostgreSQL.
2. **Access Control**: Public upload verification only reveals non-sensitive transaction context (`deal_number`, `broker_name`, `party`, `requested_docs`). No financial commercials, confidential broker notes, or other parties' contact details are exposed.
3. **Storage Security**: Document uploads remain protected behind authenticated broker endpoints. Document URLs are signed and time-limited.
4. **No Sensitive ID Storage**: The database does not store plain-text identity numbers (e.g., Aadhaar / PAN numbers); only document file attachments and verification flags are retained.

---

## 6. Verification Results

1. **Backend Test Suite**:
   ```bash
   python -m pytest tests/ -v
   ============================= 12 passed in 11.13s =============================
   ```
   - `test_deals.py::test_deal_document_vault_and_download_url PASSED`
   - `test_deals.py::test_deal_parties_and_verification_workflow PASSED`
   - `test_deals.py::test_tokenized_client_upload_requests PASSED`
   - Full regression suite across auth, enquiries, properties, valuations, seller submissions, and watcher intelligence passing 100%.

2. **Frontend Build & Compilation**:
   ```bash
   npm run build
   ✓ 205 modules transformed.
   ✓ built in 547ms
   ```
   - Zero TypeScript compilation errors.
   - Clean bundle generated.

---

## 7. Deferred Items & Phase D2 Scope

As explicitly bounded in the Phase D1 requirements:
- **Public Client Document Upload Webpage (`/upload-docs?token=...`)**: Deferred to Phase D2.
- **Client Side Document Capture & Upload Processing**: Deferred to Phase D2.
- **Flutter Broker Mobile App**: Deferred to Mobile Phase (built on top of the exact same `/api/deals` contracts).
- **Printable Deal Summary & PDF Dossier Generation**: Deferred to Phase D3.
