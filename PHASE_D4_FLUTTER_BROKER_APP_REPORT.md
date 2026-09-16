# Ashiyana Real Estate — Phase D4: Flutter Broker Mobile App Foundation
## Comprehensive Architecture, Implementation & Verification Report

**Status:** Completed & 100% Verified  
**Date:** September 8, 2026  
**Author:** Antigravity AI  

---

### 1. Overview & Core Purpose

Phase D4 delivers the mobile field companion application for lead broker Kassim Shaikh.

The Flutter application is NOT a consumer-facing website replica or generic admin dashboard. It is an operational field tool engineered specifically for mobile workflows:
- Broker is on-site at a property showing or client's residence.
- Broker needs to inspect an active transaction deal.
- Broker needs to view missing physical compliance documents on the dynamic Goa real-estate checklist.
- Broker captures document pages using the phone camera or photo gallery.
- Broker uploads documents directly into the Deal Document Vault with party (`buyer`/`seller`) and side (`front`/`back`/`complete`) tags.
- Broker creates tokenized, time-limited document upload links and transmits them via WhatsApp.

---

### 2. Zero Duplicate Business Logic & Existing Backend APIs Reused

The Flutter app strictly consumes the existing FastAPI backend (`http://127.0.0.1:8000/api`). It introduces zero duplicate backend servers, zero duplicate databases, and zero duplicate models.

#### Reused Endpoints:
- **Authentication**:
  - `POST /api/auth/login`: Authenticates broker email & password, returns JWT access and refresh tokens.
  - `POST /api/auth/refresh`: Rotates refresh tokens and issues fresh access tokens upon 401 expiration.
  - `GET /api/auth/me`: Retrieves authenticated user profile, enforcing `role == 'broker'`.
  - `POST /api/auth/logout`: Invalidates refresh token session on the server.
- **Deals Workspace**:
  - `GET /api/deals`: Lists deals with server-side search (`search`) and status filtering (`status`).
  - `GET /api/deals/{id}`: Fetches deal details, including structured buyer/seller parties, property summary, attached vault documents, and dynamic compliance checklist.
- **Document Vault**:
  - `GET /api/deals/{id}/documents`: Retrieves categorized deal documents.
  - `POST /api/deals/{id}/documents`: Multipart document upload supporting `title`, `category`, `party`, `document_side`, and raw image/PDF binary file. Handled server-side by authenticated Cloudinary service / local storage fallback.
  - `GET /api/documents/{document_id}/download`: Download streaming URL.
- **Client Document Upload Requests**:
  - `POST /api/deals/{id}/upload-requests`: Generates tokenized, time-limited upload links for buyer or seller.
  - `POST /api/deals/{id}/upload-requests/{request_id}/revoke`: Revokes active upload tokens.

---

### 3. Flutter Architecture & Project Structure

The mobile project was initialized in `mobile/` with a clean, decoupled layer architecture:

```
mobile/
  android/                     # Native Android toolchain with Camera/Internet permissions
  lib/
    core/
      config/
        env_config.dart        # Configurable API base URLs (Android emulator 10.0.2.2, web, production)
      network/
        api_client.dart        # Centralized HTTP client, token injection, auto-refresh on 401, error mapping
      storage/
        token_storage.dart     # FlutterSecureStorage with encrypted preferences & in-memory test fallback
      theme/
        app_theme.dart         # Warm ivory palette (#FAF8F5), slate navy (#121826), warm bronze (#9E762A)
    models/
      user_model.dart          # BrokerUser with isBroker role validation
      deal_model.dart          # Deal, DealParty, DealProperty models
      document_model.dart      # DealDocument with formatted size & side metadata
      checklist_model.dart     # DealChecklistItem with status flags (verified, uploaded, pending)
      upload_request_model.dart# DealUploadRequest with active/expiry calculation
    services/
      auth_service.dart        # Login, role enforcement, profile, and logout
      deals_service.dart       # Listing and fetching deal details
      documents_service.dart   # Fetching documents and multipart upload
      upload_requests_service.dart # Creating and revoking upload requests
    features/
      auth/
        login_screen.dart      # Broker login with validation and role rejection feedback
      home/
        home_screen.dart       # Greeting, quick access cards, and active deals preview
      deals/
        deals_list_screen.dart # Searchable deals list with status filter chips
        deal_detail_screen.dart# Tabbed Overview (Call/WhatsApp), Checklist, and Documents
      documents/
        capture_document_sheet.dart # Modal bottom sheet for camera/gallery upload with side tags
      requests/
        request_documents_sheet.dart# Modal bottom sheet for requesting client documents via WhatsApp
      profile/
        profile_screen.dart    # Broker credentials, connection switcher dialog, and logout
      navigation/
        main_scaffold.dart     # Bottom navigation with session expiry handling
    main.dart                  # Application entry point with AuthGate session routing
  test/
    auth_test.dart             # Login, broker role enforcement, and token wipe unit tests
    deals_test.dart            # DealsService, list rendering, and checklist UI tests
    models_test.dart           # Deserialization tests for all data models
    network_test.dart          # Token injection, 401 auto-refresh, and error mapping tests
    widget_test.dart           # LoginScreen and HomeScreen widget tests
  pubspec.yaml                 # Dependencies and asset declarations
```

---

### 4. Authentication & Broker-Only Role Enforcement

1. **Broker Credentials Authentication**:
   - Primary broker email `ashiyanarentbuysell@gmail.com` prefilled.
   - Securely exchanges credentials for JWT access and refresh tokens.
2. **Strict Role Verification**:
   - Immediately following token generation, the app queries `GET /api/auth/me`.
   - If `user.role != 'broker'` (e.g., guest, buyer, seller accounts), the app immediately wipes stored tokens from secure storage and throws:
     `"Access restricted to authorized Ashiyana brokers only."`
3. **Hardware-Backed Token Security**:
   - Implemented via `flutter_secure_storage` with Android `EncryptedSharedPreferences` and iOS `KeychainAccessibility.first_unlock`.
   - Zero access or refresh tokens are printed to console or application logs.

---

### 5. Centralized Network Layer & Token Auto-Refresh

The `ApiClient` class centralizes all HTTP operations:
- **Authorization Injection**: Attaches `Authorization: Bearer <access_token>` to all authenticated endpoints.
- **401 Interception & Auto-Refresh**:
  - When an API endpoint responds with `401 Unauthorized`, the client pauses outbound requests.
  - Calls `POST /api/auth/refresh` using the stored refresh token.
  - Saves new rotated tokens to secure storage.
  - Re-executes the original failed request seamlessly.
  - Prevents infinite refresh loops using an internal lock.
  - If refresh fails or token is revoked, invalidates session, clears tokens, and redirects user to `LoginScreen`.
- **Standardized Error Mapping**:
  - 400: `Invalid request details.`
  - 401: `Your session has expired. Please sign in again.`
  - 403: `You do not have permission to perform this action.`
  - 404: `Requested resource was not found.`
  - 413: `File size is too large (maximum 15 MB).`
  - 422: `Invalid submission parameters.`
  - 500/502: `Server temporarily unavailable. Please try again shortly.`

---

### 6. Mobile Field Operations & Workflows

#### A. Real-Time Document Checklist
- Groups deal documents into **Buyer Documents**, **Seller Documents**, and **Legal & Execution Documents**.
- Displays dynamic status badges:
  - `Verified`: Green checkmark (broker-approved).
  - `Uploaded`: Blue file icon (awaiting broker verification).
  - `Required` / `Optional`: Amber outlined circle (missing).
- One-tap interaction: Tapping any missing checklist item opens the **Capture Document Sheet** pre-filled with the corresponding title, party, and category.

#### B. Camera & Photo Gallery Capture
- Powered by `image_picker`.
- Broker chooses **[ Take Photo ]** or **[ From Gallery ]**.
- Allows designating document side: `Complete`, `Front`, or `Back`.
- Displays real-time file size and thumbnail preview before transmission.
- Streams multipart file bytes directly to `POST /api/deals/{id}/documents`.
- Progress indicator during upload; updates checklist immediately upon completion.

#### C. Request Client Documents & WhatsApp Sharing
- Tapping **[ Request Docs ]** opens the request generator.
- Automatically pre-selects missing checklist documents for the chosen party.
- Calls `POST /api/deals/{id}/upload-requests` to generate a secure, tokenized upload link.
- One-tap **[ Open WhatsApp ]** triggers native WhatsApp with pre-filled message:
  `"Hello {Name}, please upload the requested documents for your Ashiyana property deal ({DealNumber}) using this secure link: {Link}. Regards, Kassim Shaikh, Ashiyana Real Estate"`
- One-tap **[ Copy Link ]** copies URL to device clipboard.
- Zero sensitive PII (PAN, Aadhaar numbers, private URLs) in the message payload.

#### D. Direct Client Communication
- Buyer and Seller cards provide one-tap **[ Call ]** (`tel:`) and **[ WhatsApp ]** (`wa.me`) buttons using client contact details from deal metadata.

---

### 7. Verification & Test Results

#### A. Flutter Static Analysis (`flutter analyze`)
```bash
flutter analyze
Analyzing mobile...
No issues found! (ran in 20.6s)
```
- **Result:** **PASS (0 errors, 0 warnings)**

#### B. Automated Flutter Unit & Widget Test Suite (`flutter test`)
```bash
flutter test
================ 17 tests passed in 4.0s ================
```
1. `AuthService Tests: successful login for broker stores tokens and returns BrokerUser`: **PASS**
2. `AuthService Tests: rejects non-broker role and wipes tokens`: **PASS**
3. `AuthService Tests: logout clears tokens and current user`: **PASS**
4. `Data Models Tests: BrokerUser parses JSON and verifies broker role`: **PASS**
5. `Data Models Tests: Deal parses nested property and parties properly`: **PASS**
6. `Data Models Tests: DealDocument formats size and handles side metadata`: **PASS**
7. `Data Models Tests: DealChecklistItem computes status getters properly`: **PASS**
8. `Data Models Tests: DealUploadRequest checks active and expiry states`: **PASS**
9. `Deals Service & Screen Tests: DealsService fetches and parses deal list with search and status`: **PASS**
10. `Deals Service & Screen Tests: DealsListScreen renders deal card with status and document count`: **PASS**
11. `Deals Service & Screen Tests: DealDetailScreen renders tabs, checklist items, and contact actions`: **PASS**
12. `Network & ApiClient Tests: attaches Authorization header when access token is present`: **PASS**
13. `Network & ApiClient Tests: intercepts 401, refreshes tokens, and retries request successfully`: **PASS**
14. `Network & ApiClient Tests: maps 403 Forbidden to friendly ApiException`: **PASS**
15. `Network & ApiClient Tests: maps 413 Payload Too Large with 15MB limit message`: **PASS**
16. `Widget Tests: LoginScreen renders Ashiyana branding and input fields`: **PASS**
17. `Widget Tests: HomeScreen renders greeting and quick access cards`: **PASS**

#### C. Android Debug APK Build (`flutter build apk --debug`)
```bash
flutter build apk --debug
Running Gradle task 'assembleDebug'... (315.7s)
Built build\app\outputs\flutter-apk\app-debug.apk
```
- **Result:** **PASS (Verified native Gradle compilation and APK output)**

#### D. Live Backend Integration Suite (`scratch/test_live_flutter_backend_flow.py`)
Tested directly against the live FastAPI server on port 8000:
1. Broker Login (Kassim Shaikh): **PASS**
2. Profile & Role Verification (role=broker): **PASS**
3. Non-Broker Rejection Flow: **PASS**
4. Active Deals Listing: **PASS**
5. Deal Detail & Checklist Retrieval: **PASS**
6. Camera Document Upload (Front side PNG): **PASS**
7. Checklist Status Transition to Uploaded: **PASS**
8. Client Upload Request Generation (Tokenized link): **PASS**
9. Auto-Refresh Token Rotation: **PASS**
10. Broker Logout: **PASS**

#### E. Backend Pytest Regression Suite
```bash
python -m pytest tests/ -v
======================== 21 passed in 94.64s ========================
```
- Auth tests: **3 / 3 PASSED**
- Client upload tests: **1 / 1 PASSED**
- Deals & vault tests: **3 / 3 PASSED**
- Enquiries tests: **1 / 1 PASSED**
- Print pack tests: **8 / 8 PASSED**
- Properties tests: **1 / 1 PASSED**
- Saved properties tests: **1 / 1 PASSED**
- Seller submissions tests: **1 / 1 PASSED**
- Valuations tests: **1 / 1 PASSED**
- Watcher intelligence tests: **1 / 1 PASSED**

#### F. Frontend React Website Regression
- `npm run lint`: **0 errors (21 warnings on unused imports/vars)**
- `npm run build`: **Built in 1.28s without errors**

#### G. Zero Emoji Scan
- **Result:** **ZERO EMOJIS FOUND IN MOBILE DIRECTORY (CLEAN)**

---

### 8. Files Created & Modified

#### Files Created:
- `mobile/pubspec.yaml`
- `mobile/lib/core/config/env_config.dart`
- `mobile/lib/core/storage/token_storage.dart`
- `mobile/lib/core/network/api_client.dart`
- `mobile/lib/core/theme/app_theme.dart`
- `mobile/lib/models/user_model.dart`
- `mobile/lib/models/deal_model.dart`
- `mobile/lib/models/document_model.dart`
- `mobile/lib/models/checklist_model.dart`
- `mobile/lib/models/upload_request_model.dart`
- `mobile/lib/services/auth_service.dart`
- `mobile/lib/services/deals_service.dart`
- `mobile/lib/services/documents_service.dart`
- `mobile/lib/services/upload_requests_service.dart`
- `mobile/lib/features/auth/login_screen.dart`
- `mobile/lib/features/home/home_screen.dart`
- `mobile/lib/features/deals/deals_list_screen.dart`
- `mobile/lib/features/deals/deal_detail_screen.dart`
- `mobile/lib/features/documents/capture_document_sheet.dart`
- `mobile/lib/features/requests/request_documents_sheet.dart`
- `mobile/lib/features/profile/profile_screen.dart`
- `mobile/lib/features/navigation/main_scaffold.dart`
- `mobile/lib/main.dart`
- `mobile/test/auth_test.dart`
- `mobile/test/deals_test.dart`
- `mobile/test/models_test.dart`
- `mobile/test/network_test.dart`
- `mobile/test/widget_test.dart`
- `scratch/test_live_flutter_backend_flow.py`

#### Files Modified:
- `mobile/android/app/src/main/AndroidManifest.xml` (Added Internet, Camera, and URL intent permissions)

#### Dependencies Added:
- `http: ^1.2.0`
- `flutter_secure_storage: ^9.2.2`
- `image_picker: ^1.1.2`
- `url_launcher: ^6.3.0`
- `intl: ^0.19.0`
- `path: ^1.9.0`

---

### 9. Deferred Items (Out of Scope for Phase D4)
The following items remain strictly deferred for future phases:
1. **OCR / Automated Aadhaar Number Extraction**: Documents are verified by broker inspection.
2. **Offline Local SQLite / Hive Database**: Network failures are handled gracefully with retry indicators.
3. **Push Notifications (FCM)**: Live synchronization handled on screen entry and pull-to-refresh.
4. **Biometric Authentication (Fingerprint/FaceID)**.
5. **Customer Mobile Application**: The mobile app is strictly a broker field tool.
6. **Goa Police Verification Automation**.

---

### 10. Environment Limitations
- **iOS Build Verification**: iOS build verification could not be executed because the current development host is Microsoft Windows. Android debug APK compilation and cross-platform Dart/Flutter test suites were verified 100%.
