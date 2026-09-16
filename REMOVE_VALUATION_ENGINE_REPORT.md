# ASHIYANA — PROPERTY VALUATION ENGINE REMOVAL REPORT

Date: September 8, 2026
Status: COMPLETE AND VERIFIED

---

## 1. Why the Valuation Engine Was Removed

The decision was made to retire the private Property Valuation / AI Evaluation Engine completely from Ashiyana. Ashiyana focuses on verified human brokerage, direct seller submissions, lead enquiry workflows, Deal Vault management, client document verification, and print-pack generation led by Dad (Kassim Shaikh). An automated ML price estimation engine does not reflect the personalized, on-ground market advisory provided by the brokerage.

Per explicit directive:
- The valuation system was removed completely.
- It was NOT replaced with Price Guidance, Broker Price Guidance, any calculator, estimation tool, predictor, or ML/AI feature.
- All general property features (Properties, Detail, Search, Filters, Saved Properties, Watcher Intelligence, Enquiries, Seller Submissions, Deals, Deal Vault, Client Upload, Print Pack, Business Profile, WhatsApp) remain fully intact.

---

## 2. Files Inspected

The following files were inspected across the repository:
- `frontend/src/pages/BrokerPortal.tsx`: Checked for valuation tab, imports, state, handlers, sidebar, and mobile navigation.
- `frontend/src/lib/api.ts`: Checked for valuation DTOs and API methods.
- `frontend/src/pages/SellProperty.tsx`: Checked for seller submission flow (verified separate from ML engine; retained).
- `frontend/src/pages/Services.tsx`: Checked public services text.
- `frontend/src/App.tsx`: Checked for valuation routes (none existed).
- `app/api/routes/broker.py`: Checked for `/estimate-price` and `/valuation-history`.
- `app/schemas/broker.py`: Checked for `ValuationRequest` and `ValuationOut`.
- `app/services/estimator.py`: Checked for service dependencies and ML pipelines.
- `app/services/price_model.joblib`: Checked for serialized model file.
- `app/models/models.py`: Checked for `Valuation` ORM model and foreign key relationships.
- `app/core/dependencies.py`: Checked for broker role docstring references.
- `requirements.txt`: Checked for ML dependencies (`scikit-learn`, `joblib`, `numpy`).
- `tests/test_valuations.py`: Checked for valuation pytest cases.
- `scratch/test_broker_valuation.py`: Checked for scratch valuation test script.
- `README.md`: Checked for entity references.

---

## 3. Files Deleted

1. `app/services/estimator.py`: Private AI price estimator service (7.6 KB).
2. `app/services/price_model.joblib`: Pretrained GradientBoostingRegressor model artifact (1.7 MB).
3. `tests/test_valuations.py`: Valuation-specific pytest suite.
4. `scratch/test_broker_valuation.py`: Scratch test script for valuation endpoints.

---

## 4. Files Modified

1. `frontend/src/pages/BrokerPortal.tsx`:
   - Removed valuation API client imports (`estimatePropertyPrice`, `fetchValuationHistory`, `ValuationRequestDto`, `ValuationResultDto`, `ValuationHistoryItemDto`).
   - Removed `Calculator` and `SlidersHorizontal` icon imports from `lucide-react`.
   - Removed `"valuation"` from `ActiveTab` type union.
   - Removed valuation state variables (`valuationForm`, `valuationResult`, `valuationHistory`, `valuationLoading`, `historyLoading`, `valuationError`).
   - Removed `fetchValuationHistory()` from `loadDashboardData`.
   - Removed handlers `handleEstimatePrice` and `handleRefreshValuationHistory`.
   - Removed `Property Valuation` from desktop sidebar navigation array.
   - Removed `Property Valuation` from mobile navigation drawer array.
   - Removed entire `{activeTab === "valuation" && (...) }` tab JSX section (458 lines).
   - Updated Add Property Section 2 header from `2. Pricing & Valuation` to `2. Pricing`.

2. `frontend/src/lib/api.ts`:
   - Removed `ValuationRequestDto`, `ValuationResultDto`, `ValuationHistoryItemDto`.
   - Removed `estimatePropertyPrice()` and `fetchValuationHistory()`.

3. `app/api/routes/broker.py`:
   - Removed `ValuationRequest` and `ValuationOut` schema imports.
   - Removed `POST /api/broker/estimate-price` endpoint.
   - Removed `GET /api/broker/valuation-history` endpoint.

4. `app/schemas/broker.py`:
   - Removed `ValuationRequest` and `ValuationOut` Pydantic models.

5. `app/models/models.py`:
   - Removed `Valuation` SQLAlchemy model class.

6. `app/core/dependencies.py`:
   - Cleaned docstring on `require_broker` to remove mention of private AI estimator.

7. `requirements.txt`:
   - Removed `scikit-learn==1.5.1`, `joblib==1.4.2`, and `numpy==1.26.4`.

8. `README.md`:
   - Removed `- Valuations` from Database entities list.

---

## 5. API Routes Removed

- `POST /api/broker/estimate-price` (Removed from FastAPI router and OpenAPI schema).
- `GET /api/broker/valuation-history` (Removed from FastAPI router and OpenAPI schema).

Verified via automated OpenAPI inspection:
`Valuation paths in OpenAPI: []` (Zero valuation endpoints exposed).

---

## 6. Frontend Features Removed

- Valuation navigation tab in desktop sidebar.
- Valuation navigation tab in mobile drawer menu.
- Property Valuation tab form and result displays.
- Estimator calculation state and error banners.
- Valuation history data table and auto-refresh calls.
- Unused `Calculator` and `SlidersHorizontal` icons.

---

## 7. Database Model Decision

The `Valuation` SQLAlchemy model in `app/models/models.py` was removed cleanly. Inspection confirmed that neither `Property` nor `SellerSubmission` had foreign key back-references or relationship dependencies on `Valuation`. Removing the model eliminated all application-level ORM access without affecting any other entity.

---

## 8. Database Table Decision

Valuation application functionality has been removed; the historical database table was retained.

An inspection of the PostgreSQL database confirmed that the `valuations` table contains 33 historical records. In accordance with the prompt's instructions ("If the current development database contains valuation records: DO NOT silently destroy them... report the existing table/data"), the table was not dropped or purged. The historical table remains safe in PostgreSQL while application code no longer interacts with it.

---

## 9. Migration Decision

No historical migrations were edited or deleted. Baseline migration `e747d27c2e36_initial_schema.py` remains preserved as an immutable historical record. Because existing table data is intentionally retained and application-level access is removed, no destructive schema migration was performed.

---

## 10. Dependencies Removed

The following Python packages were solely required by `estimator.py` and were removed from `requirements.txt`:
- `scikit-learn==1.5.1`
- `joblib==1.4.2`
- `numpy==1.26.4`

No other backend services or modules depend on these libraries.

---

## 11. Tests Updated / Removed

- `tests/test_valuations.py`: Deleted completely.
- `scratch/test_broker_valuation.py`: Deleted completely.

---

## 12. Regression Test Results

Executed full pytest suite against all remaining endpoints and modules:
`python -m pytest tests/ -v`

Results:
- `tests/test_auth.py` (3 tests): **PASSED**
- `tests/test_client_upload.py` (1 test): **PASSED**
- `tests/test_deals.py` (3 tests): **PASSED**
- `tests/test_enquiries.py` (1 test): **PASSED**
- `tests/test_print_pack.py` (7 tests): **PASSED**
- `tests/test_properties.py` (1 test): **PASSED**
- `tests/test_saved_properties.py` (1 test): **PASSED**
- `tests/test_seller.py` (1 test): **PASSED**
- `tests/test_watcher_intelligence.py` (1 test): **PASSED**

Total: **20 / 20 passed (100%)**

---

## 13. Frontend Lint Results

Executed: `npm run lint` in `frontend/`
- Output: `Found 21 warnings and 0 errors.`
- Status: **0 TypeScript / lint errors.**

---

## 14. Frontend Build Results

Executed: `npm run build` in `frontend/`
- Output: Built successfully in 658ms.
- Bundle: `dist/assets/index-Dk01FL1a.js` (decreased by ~20 kB).
- Status: **0 build errors.**

---

## 15. Zero Emoji Result

Executed: `python scratch/check_zero_emojis.py`
- Output:
  - Scanned 111 files across extensions (`.ts`, `.tsx`, `.js`, `.jsx`, `.py`, `.html`, `.css`).
  - Total emojis found: 0
  - Zero emoji check: **PASSED (0 emojis found).**

---

## 16. Final Repository Search Result

Searched repository-wide for active references:
- `estimate-price`: 0 active references
- `valuation-history`: 0 active references
- `estimatePropertyPrice`: 0 active references
- `fetchValuationHistory`: 0 active references
- `estimator.py`: 0 active references
- `confidence_score`: 0 active references
- `Property Valuation Engine`: 0 active references

---

## 17. Remaining Historical References

Any remaining mentions of "valuation" in the repository fall strictly into two legitimate categories:
1. **Seller Submission ("Get Free Valuation" Form)**: Public seller submission workflow (`/api/submissions`, `SellerSubmission` model, `SellProperty.tsx`) where sellers submit their property details for broker review. This was explicitly protected from removal per prompt section 16.
2. **Historical Audit Reports & Initial Migration**: Static historical documents (`BATCH_A_...`, `FULL_CURRENT_STATE_AUDIT.md`, `e747d27c2e36_initial_schema.py`) that document past system states and are preserved for audit integrity.
