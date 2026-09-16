# Phase D4 Hotfix: Deal Status Enum Contract & Home Active Deals Report

## 1. Executive Summary

During testing of the Flutter broker companion application on a physical Android device connecting to the live FastAPI backend (`http://192.168.0.101:8000/api`), the Home screen displayed an unhandled backend validation message:
```text
"Input should be 'inquiry', 'negotiation', 'agreement', 'completed' or 'cancelled'"
```

This hotfix resolves the underlying contract discrepancy, isolates "Active" as a client-side filter, handles unexpected network and validation errors gracefully with friendly UI states, fixes singular/plural document grammar, and ensures all status filter chips are responsive on compact physical phone screens.

---

## 2. Observed Physical-Device Error & Root Cause Analysis

### Observed Error
Upon successful broker authentication with `ashiyanarentbuysell@gmail.com`, the app navigated to `HomeScreen`. Instead of displaying the recent active transactions, an error container rendered:
`"Input should be 'inquiry', 'negotiation', 'agreement', 'completed' or 'cancelled'"`

### Root Cause
1. **Invalid Query Parameter**: `mobile/lib/features/home/home_screen.dart` executed:
   ```dart
   final items = await widget.dealsService.getDeals(status: 'active');
   ```
   This appended `?status=active` to `GET /api/deals`.
2. **Backend Pydantic Schema Validation**: FastAPI route `GET /api/deals` declares:
   ```python
   status_filter: Optional[DealStatus] = Query(None, alias="status")
   ```
   Because `DealStatus` in FastAPI only accepts `inquiry`, `negotiation`, `agreement`, `completed`, and `cancelled`, passing `'active'` failed schema validation with HTTP 422 Unprocessable Entity and returned:
   `{"detail": [{"type": "enum", "loc": ["query", "status"], "msg": "Input should be 'inquiry', 'negotiation', 'agreement', 'completed' or 'cancelled'"}]}`
3. **Leaked Error Text**: `HomeScreen` directly assigned `e.message` to `_errorMessage`, displaying raw schema validation internals on the UI.
4. **Deals List Screen Risk**: `mobile/lib/features/deals/deals_list_screen.dart` also passed selected chip values directly (`'active'`, `'closed'`) to `getDeals`, which would have caused the exact same 422 error when tapping those chips.

---

## 3. Exact Enum Contract & Active Filter Semantics

### Canonical Backend Contract (Untouched)
The backend model (`app/models/models.py`) and schema (`app/schemas/deals.py`) remain strictly canonical:
- `inquiry`
- `negotiation`
- `agreement`
- `completed`
- `cancelled`

`active` is **NOT** a backend status and was not added to the backend.

### Flutter DealStatus Enum (`mobile/lib/models/deal_model.dart`)
```dart
enum DealStatus {
  inquiry('inquiry', 'Inquiry'),
  negotiation('negotiation', 'Negotiation'),
  agreement('agreement', 'Agreement'),
  completed('completed', 'Completed'),
  cancelled('cancelled', 'Cancelled');

  final String value;
  final String label;

  const DealStatus(this.value, this.label);

  static DealStatus fromString(String? raw) {
    if (raw == null) return DealStatus.inquiry;
    final normalized = raw.trim().toLowerCase();
    for (final s in DealStatus.values) {
      if (s.value == normalized) return s;
    }
    return DealStatus.inquiry;
  }

  bool get isActive =>
      this == DealStatus.inquiry ||
      this == DealStatus.negotiation ||
      this == DealStatus.agreement;

  bool get isClosed =>
      this == DealStatus.completed ||
      this == DealStatus.cancelled;
}
```

### Active Deal Semantics (Local UI Filter)
- **Active Deals** (shown on Home screen and under "Active" filter chip):
  - `inquiry`
  - `negotiation`
  - `agreement`
- **Closed / Inactive Deals** (excluded from Home active list):
  - `completed`
  - `cancelled`

---

## 4. Files Inspected & Modified

### Files Inspected
- `app/models/models.py`
- `app/schemas/deals.py`
- `app/api/routes/deals.py`
- `mobile/lib/models/deal_model.dart`
- `mobile/lib/services/deals_service.dart`
- `mobile/lib/features/home/home_screen.dart`
- `mobile/lib/features/deals/deals_list_screen.dart`
- `mobile/lib/features/deals/deal_detail_screen.dart`
- `mobile/test/deals_test.dart`
- `mobile/test/models_test.dart`

### Files Modified
1. `mobile/lib/models/deal_model.dart`:
   - Introduced `DealStatus` enum matching backend canonical values.
   - Added `DealStatus.fromString` with defensive fallback to `inquiry` on unknown values.
   - Added `isActive` and `isClosed` getters.
   - Added `documentCountDisplay` property (`"1 document"` vs `"$count documents"`).
   - Defensively typed JSON parsing for properties, parties, and collections.
2. `mobile/lib/services/deals_service.dart`:
   - Whitelisted `status` query parameter strictly against `validBackendStatuses` (`{'inquiry', 'negotiation', 'agreement', 'completed', 'cancelled'}`).
   - Prohibited sending `'active'`, `'closed'`, or `'all'` to the backend.
   - Defensively caught individual parsing failures in deal lists so one corrupted record never breaks the entire list.
3. `mobile/lib/features/home/home_screen.dart`:
   - Removed `status: 'active'` API call argument.
   - Implemented client-side filtering: `items.where((d) => d.status.isActive).take(5).toList()`.
   - Converted raw error messages to user-friendly text: `"Unable to load active deals. Check your connection."` with a `Retry` button.
   - Used `deal.documentCountDisplay + ' attached'` ("1 document attached" vs "4 documents attached").
   - Wrapped deal number in `Expanded` with ellipsis overflow to prevent layout clipping on small screens.
4. `mobile/lib/features/deals/deals_list_screen.dart`:
   - Refactored filtering to be purely local on loaded deals without triggering redundant or invalid backend network requests.
   - Configured filter chips:
     - `All Deals`: all loaded deals
     - `Active`: `deal.status.isActive` (`inquiry`, `negotiation`, `agreement`)
     - `Negotiation`: `DealStatus.negotiation`
     - `Agreement`: `DealStatus.agreement`
     - `Closed`: `DealStatus.completed`
     - `Cancelled`: `DealStatus.cancelled`
   - Added `BouncingScrollPhysics`, `VisualDensity.compact`, and `MaterialTapTargetSize.shrinkWrap` to filter chips row for seamless horizontal scrolling on compact phone screens.
   - Used `deal.documentCountDisplay` for singular/plural grammar.
   - Wrapped deal number in `Expanded` to prevent flex overflow.
5. `mobile/lib/features/deals/deal_detail_screen.dart`:
   - Updated `_getStatusColor` to accept `DealStatus`.
   - Formatted status badge using `d.status.label.toUpperCase()`.
6. `mobile/test/models_test.dart`:
   - Updated model tests to assert `DealStatus.negotiation` and `documentCountDisplay`.
7. `mobile/test/deals_test.dart`:
   - Updated service test to query canonical status `negotiation`.
8. `mobile/test/hotfix_deal_status_test.dart` (New):
   - Added dedicated test suite covering all 12 required test scenarios.

---

## 5. UI & Usability Improvements

1. **Friendly Error State**:
   Raw Pydantic messages are no longer displayed. If the backend is unreachable or returns an error, the screen displays a clean card with an offline icon, friendly description, and a `Retry` action.
2. **Grammar Correction**:
   - Count = 1: `"1 document"` / `"1 document attached"`
   - Count != 1: `"${count} documents"` / `"${count} documents attached"`
3. **Small-Screen Filter Usability**:
   Filter chips on the Deals Workspace are contained within a horizontally scrollable container with bounce physics, compact spacing, and no text truncation.

---

## 6. Verification & Automated Test Results

### 1. Flutter Static Analysis
```bash
flutter analyze
```
Result: **PASSED (No issues found! ran in 15.7s)**

### 2. Flutter Test Suite
```bash
flutter test
```
Result: **PASSED (30 / 30 tests passed in 8s)**
Coverage highlights:
- Test 1: Deal status "inquiry" parses correctly.
- Test 2: Deal status "negotiation" parses correctly.
- Test 3: Deal status "agreement" parses correctly.
- Test 4: Deal status "completed" parses correctly.
- Test 5: Deal status "cancelled" parses correctly.
- Test 6: Active filter includes inquiry, negotiation, agreement.
- Test 7: Active filter excludes completed, cancelled.
- Test 8: DealsService never sends status=active, closed, or all to backend.
- Test 9: Home screen renders valid deals without error and excludes completed deals.
- Test 10: Home screen handles API failure gracefully without displaying Pydantic error.
- Test 11: Single document uses singular grammar ("1 document").
- Test 12: Filter row remains usable and does not overflow on 320px narrow screens.

### 3. Flutter APK Compilation
```bash
flutter build apk --debug
flutter build apk --release --dart-define=API_BASE_URL=http://192.168.0.101:8000/api
```
Result:
- Debug APK: `mobile\build\app\outputs\flutter-apk\app-debug.apk` (Generated successfully)
- Release APK: `mobile\build\app\outputs\flutter-apk\app-release.apk` (48.8MB, Generated successfully)

### 4. Backend Regression Suite
```bash
python -m pytest tests/ -v
```
Result: **20 passed in 98.49s (100% PASS)**

### 5. Frontend React Portal Verification
```bash
npm run lint
npm run build
```
Result:
- `npm run lint`: **0 errors (21 warnings)**
- `npm run build`: **Built in 1.10s (0 errors)**

### 6. Zero Emoji Scan
```bash
python -c "..."
```
Result: Checked 28 Dart files across `mobile/`. **0 emoji violations found.**

### 7. Live FastAPI Backend Verification
Script `scratch/verify_live.py` executed against live backend with valid broker token:
```text
Login success, broker token received.
Total deals returned by GET /api/deals: 50
Active deals matching UI filter: 50

Sample 5 active deals rendered on Home:
  Deal: ASH-2026-102 | Status: inquiry | 1 document attached | Buyer: Vikram Mehta
  Deal: ASH-2026-101 | Status: agreement | 4 documents attached | Buyer: Rahul Sharma
  Deal: ASH-2026-100 | Status: inquiry | 1 document attached | Buyer: Vikram Mehta
  Deal: ASH-2026-099 | Status: agreement | 4 documents attached | Buyer: Rahul Sharma
  Deal: ASH-2026-098 | Status: inquiry | 1 document attached | Buyer: Vikram Mehta
```

---

## 7. Physical Android Device Verification Instructions

The newly built APK is ready at:
`c:\Users\91951\OneDrive\Desktop\ashiyana-project\ashiyana\mobile\build\app\outputs\flutter-apk\app-release.apk`

### Steps to Test on the Physical Phone:
1. **Ensure Backend is Bound to 0.0.0.0**:
   ```bash
   python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
   ```
   *(Note: Binding to `127.0.0.1` will block incoming Wi-Fi requests from `192.168.0.101`)*.
2. **Install the Updated APK on the Phone**:
   Connect phone via USB and run:
   ```bash
   adb install -r mobile/build/app/outputs/flutter-apk/app-release.apk
   ```
   Or transfer `app-release.apk` via Google Drive / USB file transfer and tap to install.
3. **Log in**:
   - Email: `ashiyanarentbuysell@gmail.com`
   - Password: `ashiyana/9999`
4. **Verify Home Screen**:
   - Confirm active deals load immediately under "ACTIVE DEALS".
   - Confirm no Pydantic enum validation error message is shown.
   - Confirm singular grammar on 1 document deals ("1 document attached").
5. **Verify Deals Workspace**:
   - Tap "Deals" in bottom navigation.
   - Tap "All Deals" -> shows all transactions.
   - Tap "Active" -> shows active deals (`inquiry`, `negotiation`, `agreement`).
   - Tap "Negotiation" -> filters to negotiation deals.
   - Tap "Agreement" -> filters to agreement deals.
   - Tap "Closed" -> filters to completed deals.
   - Confirm horizontal filter chips scroll smoothly without text clipping.
