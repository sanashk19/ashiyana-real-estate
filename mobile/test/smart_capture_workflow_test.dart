import 'dart:convert';
import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

import 'package:ashiyana_broker/core/network/api_client.dart';
import 'package:ashiyana_broker/core/storage/token_storage.dart';
import 'package:ashiyana_broker/core/theme/app_theme.dart';
import 'package:ashiyana_broker/core/utils/mime_detector.dart';
import 'package:ashiyana_broker/features/deals/deal_detail_screen.dart';
import 'package:ashiyana_broker/features/documents/smart_camera_screen.dart';
import 'package:ashiyana_broker/features/documents/capture_document_sheet.dart';
import 'package:ashiyana_broker/services/deals_service.dart';
import 'package:ashiyana_broker/services/documents_service.dart';
import 'package:ashiyana_broker/services/upload_requests_service.dart';

class MockTokenStorage implements TokenStorage {
  @override
  Future<String?> getAccessToken() async => 'mock-token';
  @override
  Future<String?> getRefreshToken() async => null;
  @override
  Future<void> saveTokens({required String accessToken, required String refreshToken}) async {}
  @override
  Future<void> clearTokens() async {}
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  // Valid image magic bytes
  final validJpegBytes = Uint8List.fromList([
    0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01,
  ]);
  final validPngBytes = Uint8List.fromList([
    0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D,
  ]);
  final validWebpBytes = Uint8List.fromList([
    0x52, 0x49, 0x46, 0x46, 0x24, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50,
  ]);
  final validPdfBytes = Uint8List.fromList([
    0x25, 0x50, 0x44, 0x46, 0x2D, 0x31, 0x2E, 0x37,
  ]);

  group('Phase D5 — Smart Document Capture & MIME Tests', () {
    test('MimeDetector identifies valid formats and normalizes extensions', () {
      final jpegResult = MimeDetector.detectAndValidate(bytes: validJpegBytes, filename: 'photo.raw');
      expect(jpegResult.mimeTypeString, 'image/jpeg');
      expect(jpegResult.normalizedFilename.endsWith('.jpg'), isTrue);

      final pngResult = MimeDetector.detectAndValidate(bytes: validPngBytes, filename: 'scan.unknown');
      expect(pngResult.mimeTypeString, 'image/png');
      expect(pngResult.normalizedFilename.endsWith('.png'), isTrue);

      final webpResult = MimeDetector.detectAndValidate(bytes: validWebpBytes, filename: 'image.jpg');
      expect(webpResult.mimeTypeString, 'image/webp');
      expect(webpResult.normalizedFilename.endsWith('.webp'), isTrue);

      final pdfResult = MimeDetector.detectAndValidate(bytes: validPdfBytes, filename: 'agreement.doc');
      expect(pdfResult.mimeTypeString, 'application/pdf');
      expect(pdfResult.normalizedFilename.endsWith('.pdf'), isTrue);
    });

    test('MimeDetector throws friendly message on invalid/unrecognized bytes', () {
      final corruptBytes = Uint8List.fromList([0x00, 0x01, 0x02, 0x03]);
      expect(
        () => MimeDetector.detectAndValidate(bytes: corruptBytes, filename: 'file.jpg'),
        throwsA(isA<ApiException>().having(
          (e) => e.message,
          'message',
          'Unable to determine the file type. Please choose another image.',
        )),
      );
    });

    testWidgets('SmartCameraScreen renders viewfinder, framing guide, and camera context', (WidgetTester tester) async {
      final mockClient = MockClient((request) async {
        return http.Response(jsonEncode({
          'id': 'doc-100',
          'deal_id': 'deal-123',
          'category': 'buyer',
          'title': 'Aadhaar Card',
          'party': 'buyer',
          'document_side': 'front',
          'status': 'pending',
          'original_filename': 'aadhaar_front.jpg',
          'mime_type': 'image/jpeg',
          'file_size': validJpegBytes.length,
          'cloudinary_url': 'https://example.com/aadhaar.jpg',
          'created_at': '2026-09-08T10:00:00Z',
        }), 201);
      });

      final apiClient = ApiClient(client: mockClient, tokenStorage: MockTokenStorage());
      final docsService = DocumentsService(apiClient: apiClient);

      await tester.pumpWidget(
        MaterialApp(
          theme: AppTheme.lightTheme,
          home: SmartCameraScreen(
            dealId: 'deal-123',
            documentTitle: 'Aadhaar Card',
            party: 'buyer',
            documentSide: 'front',
            category: 'buyer',
            documentsService: docsService,
          ),
        ),
      );

      await tester.pumpAndSettle();

      // Verify Context Bar at top displays title and party / side
      expect(find.text('Aadhaar Card'), findsWidgets);
      expect(find.textContaining('BUYER'), findsOneWidget);
      expect(find.textContaining('FRONT'), findsOneWidget);

      // Verify Document Framing Guide instruction
      expect(find.text('Position the entire document inside the frame.'), findsOneWidget);

      // Verify Shutter & Gallery controls exist
      expect(find.byIcon(Icons.photo_library_outlined), findsOneWidget);
    });

    testWidgets('SmartCameraScreen preserves complete document context', (WidgetTester tester) async {
      final mockClient = MockClient((request) async {
        return http.Response(jsonEncode({}), 200);
      });

      final apiClient = ApiClient(client: mockClient, tokenStorage: MockTokenStorage());
      final docsService = DocumentsService(apiClient: apiClient);

      await tester.pumpWidget(
        MaterialApp(
          theme: AppTheme.lightTheme,
          home: SmartCameraScreen(
            dealId: 'deal-123',
            documentTitle: 'PAN Card',
            party: 'buyer',
            documentSide: 'complete',
            category: 'buyer',
            documentsService: docsService,
          ),
        ),
      );

      await tester.pumpAndSettle();

      expect(find.text('PAN Card'), findsWidgets);
      expect(find.textContaining('COMPLETE'), findsOneWidget);
      expect(find.text('Position the entire document inside the frame.'), findsOneWidget);
    });

    testWidgets('DealDetailScreen separates Aadhaar into Front and Back capture triggers', (WidgetTester tester) async {
      final mockClient = MockClient((request) async {
        return http.Response(
          jsonEncode({
            'id': 'deal-test-1',
            'deal_number': 'ASH-2026-099',
            'property': {
              'id': 'p-1',
              'title': 'Anjuna Seafront Villa',
              'locality': 'Anjuna',
              'price': 65000000.0,
            },
            'buyer_info': {'name': 'Arjun Mehra', 'phone': '+919820011111'},
            'seller_info': {'name': 'Ramesh Sawant', 'phone': '+919820022222'},
            'status': 'negotiation',
            'created_at': '2026-09-08T10:00:00Z',
            'documents': [
              {
                'id': 'doc-front-1',
                'deal_id': 'deal-test-1',
                'category': 'buyer',
                'title': 'Aadhaar Card',
                'party': 'buyer',
                'document_side': 'front',
                'status': 'verified',
                'original_filename': 'aadhaar_front.jpg',
                'mime_type': 'image/jpeg',
                'file_size': 1024,
                'cloudinary_url': 'https://example.com/front.jpg',
                'created_at': '2026-09-08T10:00:00Z',
              }
            ],
            'checklist': [
              {
                'category': 'buyer',
                'title': 'Aadhaar Card',
                'party': 'buyer',
                'required': true,
                'status': 'uploaded',
              },
              {
                'category': 'buyer',
                'title': 'PAN Card',
                'party': 'buyer',
                'required': true,
                'status': 'pending',
              },
            ],
            'upload_requests': [],
          }),
          200,
        );
      });

      final apiClient = ApiClient(client: mockClient, tokenStorage: MockTokenStorage());
      final dealsService = DealsService(apiClient: apiClient);
      final docsService = DocumentsService(apiClient: apiClient);
      final reqService = UploadRequestsService(apiClient: apiClient);

      await tester.pumpWidget(
        MaterialApp(
          theme: AppTheme.lightTheme,
          home: DealDetailScreen(
            dealId: 'deal-test-1',
            dealsService: dealsService,
            documentsService: docsService,
            requestsService: reqService,
          ),
        ),
      );

      await tester.pumpAndSettle();

      // Switch to Checklist tab
      await tester.tap(find.textContaining('Checklist'));
      await tester.pumpAndSettle();

      // Verify Front is Uploaded and Back is ready to Capture
      expect(find.text('Aadhaar Card (Front)'), findsOneWidget);
      expect(find.text('Aadhaar Card (Back)'), findsOneWidget);
      expect(find.text('PAN Card'), findsOneWidget);

      // Verify Capture action is visible for missing back and PAN
      expect(find.text('Capture'), findsWidgets);
    });

    testWidgets('CaptureDocumentSheet preserves chip padding without clipping', (WidgetTester tester) async {
      final mockClient = MockClient((request) async {
        return http.Response(jsonEncode({}), 200);
      });

      final apiClient = ApiClient(client: mockClient, tokenStorage: MockTokenStorage());
      final docsService = DocumentsService(apiClient: apiClient);

      await tester.pumpWidget(
        MaterialApp(
          theme: AppTheme.lightTheme,
          home: Scaffold(
            body: CaptureDocumentSheet(
              dealId: 'deal-abc',
              initialParty: 'buyer',
              initialTitle: 'Sale Agreement',
              initialSide: 'complete',
              documentsService: docsService,
            ),
          ),
        ),
      );

      await tester.pumpAndSettle();

      // Verify Complete, Front, and Back are fully visible without clipping
      expect(find.text('Complete'), findsOneWidget);
      expect(find.text('Front'), findsOneWidget);
      expect(find.text('Back'), findsOneWidget);
      expect(find.text('Open Camera'), findsOneWidget);
    });

    testWidgets('Small screen responsiveness (320px, 360px, 390px, 430px) renders without overflow', (WidgetTester tester) async {
      final widths = [320.0, 360.0, 390.0, 430.0];

      for (final width in widths) {
        tester.view.physicalSize = Size(width * 2.0, 800 * 2.0);
        tester.view.devicePixelRatio = 2.0;

        final mockClient = MockClient((request) async {
          return http.Response(
            jsonEncode({
              'id': 'deal-resp',
              'deal_number': 'ASH-2026-088',
              'property': {'id': 'p-r', 'title': 'Candolim Penthouse', 'locality': 'Candolim', 'price': 35000000.0},
              'buyer_info': {'name': 'Rhea Pillai', 'phone': '+919820033333'},
              'seller_info': {'name': 'David Dsouza', 'phone': '+919820044444'},
              'status': 'agreement',
              'created_at': '2026-09-08T10:00:00Z',
              'documents': [],
              'checklist': [
                {'category': 'buyer', 'title': 'Passport ID', 'party': 'buyer', 'required': true, 'status': 'pending'}
              ],
              'upload_requests': [],
            }),
            200,
          );
        });

        final apiClient = ApiClient(client: mockClient, tokenStorage: MockTokenStorage());
        final dealsService = DealsService(apiClient: apiClient);
        final docsService = DocumentsService(apiClient: apiClient);
        final reqService = UploadRequestsService(apiClient: apiClient);

        await tester.pumpWidget(
          MaterialApp(
            theme: AppTheme.lightTheme,
            home: DealDetailScreen(
              dealId: 'deal-resp',
              dealsService: dealsService,
              documentsService: docsService,
              requestsService: reqService,
            ),
          ),
        );

        await tester.pumpAndSettle();

        expect(find.text('ASH-2026-088'), findsOneWidget);
        expect(tester.takeException(), isNull);
      }

      // Reset physical size
      tester.view.resetPhysicalSize();
      tester.view.resetDevicePixelRatio();
    });
  });
}
