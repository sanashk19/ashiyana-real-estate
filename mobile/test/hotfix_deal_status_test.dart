import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:ashiyana_broker/core/network/api_client.dart';
import 'package:ashiyana_broker/core/storage/token_storage.dart';
import 'package:ashiyana_broker/core/theme/app_theme.dart';
import 'package:ashiyana_broker/models/user_model.dart';
import 'package:ashiyana_broker/models/deal_model.dart';
import 'package:ashiyana_broker/services/deals_service.dart';
import 'package:ashiyana_broker/services/documents_service.dart';
import 'package:ashiyana_broker/services/upload_requests_service.dart';
import 'package:ashiyana_broker/features/home/home_screen.dart';
import 'package:ashiyana_broker/features/deals/deals_list_screen.dart';

void main() {
  group('D4 Hotfix — Deal Status & Active Deals Tests', () {
    // 1. Deal status "inquiry" parses correctly
    test('1. Deal status "inquiry" parses correctly', () {
      final json = {
        'id': 'deal-1',
        'deal_number': 'ASH-2026-101',
        'status': 'inquiry',
        'created_at': '2026-09-08T10:00:00Z',
      };
      final deal = Deal.fromJson(json);
      expect(deal.status, DealStatus.inquiry);
      expect(deal.status.value, 'inquiry');
      expect(deal.status.label, 'Inquiry');
    });

    // 2. Deal status "negotiation" parses correctly
    test('2. Deal status "negotiation" parses correctly', () {
      final json = {
        'id': 'deal-2',
        'deal_number': 'ASH-2026-102',
        'status': 'negotiation',
        'created_at': '2026-09-08T10:00:00Z',
      };
      final deal = Deal.fromJson(json);
      expect(deal.status, DealStatus.negotiation);
      expect(deal.status.value, 'negotiation');
      expect(deal.status.label, 'Negotiation');
    });

    // 3. Deal status "agreement" parses correctly
    test('3. Deal status "agreement" parses correctly', () {
      final json = {
        'id': 'deal-3',
        'deal_number': 'ASH-2026-103',
        'status': 'agreement',
        'created_at': '2026-09-08T10:00:00Z',
      };
      final deal = Deal.fromJson(json);
      expect(deal.status, DealStatus.agreement);
      expect(deal.status.value, 'agreement');
      expect(deal.status.label, 'Agreement');
    });

    // 4. Deal status "completed" parses correctly
    test('4. Deal status "completed" parses correctly', () {
      final json = {
        'id': 'deal-4',
        'deal_number': 'ASH-2026-104',
        'status': 'completed',
        'created_at': '2026-09-08T10:00:00Z',
      };
      final deal = Deal.fromJson(json);
      expect(deal.status, DealStatus.completed);
      expect(deal.status.value, 'completed');
      expect(deal.status.label, 'Completed');
    });

    // 5. Deal status "cancelled" parses correctly
    test('5. Deal status "cancelled" parses correctly', () {
      final json = {
        'id': 'deal-5',
        'deal_number': 'ASH-2026-105',
        'status': 'cancelled',
        'created_at': '2026-09-08T10:00:00Z',
      };
      final deal = Deal.fromJson(json);
      expect(deal.status, DealStatus.cancelled);
      expect(deal.status.value, 'cancelled');
      expect(deal.status.label, 'Cancelled');
    });

    // Safe fallback on unrecognized status
    test('Safe fallback on unrecognized status to inquiry without crashing', () {
      final json = {
        'id': 'deal-unknown',
        'deal_number': 'ASH-2026-999',
        'status': 'non_existent_status',
        'created_at': '2026-09-08T10:00:00Z',
      };
      final deal = Deal.fromJson(json);
      expect(deal.status, DealStatus.inquiry);
    });

    // 6. Active filter includes inquiry, negotiation, agreement
    test('6. Active filter includes inquiry, negotiation, agreement', () {
      expect(DealStatus.inquiry.isActive, isTrue);
      expect(DealStatus.negotiation.isActive, isTrue);
      expect(DealStatus.agreement.isActive, isTrue);
    });

    // 7. Active filter excludes completed, cancelled
    test('7. Active filter excludes completed, cancelled', () {
      expect(DealStatus.completed.isActive, isFalse);
      expect(DealStatus.cancelled.isActive, isFalse);

      expect(DealStatus.completed.isClosed, isTrue);
      expect(DealStatus.cancelled.isClosed, isTrue);
      expect(DealStatus.inquiry.isClosed, isFalse);
    });

    // 8. No code sends status=active to backend
    test('8. DealsService never sends status=active or other invalid status to backend', () async {
      final recordedRequests = <http.BaseRequest>[];
      final mockClient = MockClient((request) async {
        recordedRequests.add(request);
        return http.Response(
          jsonEncode({
            'deals': [],
            'total': 0,
          }),
          200,
        );
      });

      final apiClient = ApiClient(client: mockClient, tokenStorage: InMemoryTokenStorage());
      final service = DealsService(apiClient: apiClient);

      // Attempt with 'active'
      await service.getDeals(status: 'active');
      expect(recordedRequests.last.url.queryParameters.containsKey('status'), isFalse);

      // Attempt with 'closed'
      await service.getDeals(status: 'closed');
      expect(recordedRequests.last.url.queryParameters.containsKey('status'), isFalse);

      // Attempt with 'all'
      await service.getDeals(status: 'all');
      expect(recordedRequests.last.url.queryParameters.containsKey('status'), isFalse);

      // Valid canonical backend status DOES get sent
      await service.getDeals(status: 'negotiation');
      expect(recordedRequests.last.url.queryParameters['status'], 'negotiation');

      await service.getDeals(status: 'agreement');
      expect(recordedRequests.last.url.queryParameters['status'], 'agreement');
    });

    // 9. Home screen renders valid deals without error
    testWidgets('9. Home screen renders valid deals without error', (WidgetTester tester) async {
      final mockClient = MockClient((request) async {
        // Home screen must NOT send status=active
        expect(request.url.queryParameters.containsKey('status'), isFalse);
        return http.Response(
          jsonEncode({
            'deals': [
              {
                'id': 'deal-active-1',
                'deal_number': 'ASH-2026-001',
                'property': {
                  'id': 'p1',
                  'title': 'Anjuna Sea Villa',
                  'locality': 'Anjuna',
                  'price': 45000000.0,
                  'property_type': 'villa',
                },
                'buyer_name': 'Aarav Patel',
                'seller_name': 'Maria Souza',
                'status': 'negotiation',
                'document_count': 1,
                'created_at': '2026-09-08T10:00:00Z',
              },
              {
                'id': 'deal-closed-1',
                'deal_number': 'ASH-2026-002',
                'property': {
                  'id': 'p2',
                  'title': 'Panjim Commercial Office',
                  'locality': 'Panjim',
                  'price': 20000000.0,
                  'property_type': 'office',
                },
                'buyer_name': 'Rohan Mehta',
                'seller_name': 'Sunil Naik',
                'status': 'completed',
                'document_count': 4,
                'created_at': '2026-09-08T09:00:00Z',
              }
            ],
            'total': 2,
          }),
          200,
        );
      });

      final apiClient = ApiClient(client: mockClient, tokenStorage: InMemoryTokenStorage());
      final dealsService = DealsService(apiClient: apiClient);
      final docsService = DocumentsService(apiClient: apiClient);
      final reqService = UploadRequestsService(apiClient: apiClient);

      final user = BrokerUser(
        id: 'u-1',
        email: 'ashiyanarentbuysell@gmail.com',
        fullName: 'Kassim Shaikh',
        role: 'broker',
        isActive: true,
      );

      await tester.pumpWidget(
        MaterialApp(
          theme: AppTheme.lightTheme,
          home: HomeScreen(
            user: user,
            dealsService: dealsService,
            documentsService: docsService,
            requestsService: reqService,
          ),
        ),
      );

      await tester.pumpAndSettle();

      // Only active deal should appear in ACTIVE DEALS
      expect(find.text('ASH-2026-001'), findsOneWidget);
      expect(find.text('Anjuna Sea Villa'), findsOneWidget);
      expect(find.text('Negotiation'), findsOneWidget);

      // Completed deal must NOT appear in Active Deals list
      expect(find.text('ASH-2026-002'), findsNothing);
      expect(find.text('Panjim Commercial Office'), findsNothing);
    });

    // 10. Home screen handles API failure gracefully
    testWidgets('10. Home screen handles API failure gracefully', (WidgetTester tester) async {
      final mockClient = MockClient((request) async {
        return http.Response(
          jsonEncode({
            'detail': [
              {
                'type': 'enum',
                'loc': ['query', 'status'],
                'msg': "Input should be 'inquiry', 'negotiation', 'agreement', 'completed' or 'cancelled'",
              }
            ]
          }),
          422,
        );
      });

      final apiClient = ApiClient(client: mockClient, tokenStorage: InMemoryTokenStorage());
      final dealsService = DealsService(apiClient: apiClient);
      final docsService = DocumentsService(apiClient: apiClient);
      final reqService = UploadRequestsService(apiClient: apiClient);

      final user = BrokerUser(
        id: 'u-1',
        email: 'ashiyanarentbuysell@gmail.com',
        fullName: 'Kassim Shaikh',
        role: 'broker',
        isActive: true,
      );

      await tester.pumpWidget(
        MaterialApp(
          theme: AppTheme.lightTheme,
          home: HomeScreen(
            user: user,
            dealsService: dealsService,
            documentsService: docsService,
            requestsService: reqService,
          ),
        ),
      );

      await tester.pumpAndSettle();

      // Must NOT display raw Pydantic message
      expect(find.textContaining('Input should be'), findsNothing);

      // Must display friendly error and retry button
      expect(find.text('Unable to load active deals. Check your connection.'), findsOneWidget);
      expect(find.widgetWithText(ElevatedButton, 'Retry'), findsOneWidget);
    });

    // 11. One document uses singular grammar
    test('11. One document uses singular grammar and multiple use plural', () {
      final singleDocDeal = Deal(
        id: 'd-1',
        dealNumber: 'ASH-001',
        status: DealStatus.inquiry,
        documentCount: 1,
        createdAt: DateTime.now(),
      );
      expect(singleDocDeal.documentCountDisplay, '1 document');

      final multiDocDeal = Deal(
        id: 'd-2',
        dealNumber: 'ASH-002',
        status: DealStatus.agreement,
        documentCount: 4,
        createdAt: DateTime.now(),
      );
      expect(multiDocDeal.documentCountDisplay, '4 documents');

      final zeroDocDeal = Deal(
        id: 'd-3',
        dealNumber: 'ASH-003',
        status: DealStatus.inquiry,
        documentCount: 0,
        createdAt: DateTime.now(),
      );
      expect(zeroDocDeal.documentCountDisplay, '0 documents');
    });

    // 12. Filter row remains usable on small widths
    testWidgets('12. Filter row remains usable on small screen widths (320px)', (WidgetTester tester) async {
      final mockClient = MockClient((request) async {
        return http.Response(
          jsonEncode({
            'deals': [
              {
                'id': 'd-1',
                'deal_number': 'ASH-2026-001',
                'status': 'inquiry',
                'document_count': 1,
                'created_at': '2026-09-08T10:00:00Z',
              },
              {
                'id': 'd-2',
                'deal_number': 'ASH-2026-002',
                'status': 'completed',
                'document_count': 2,
                'created_at': '2026-09-08T10:00:00Z',
              },
            ],
            'total': 2,
          }),
          200,
        );
      });

      final apiClient = ApiClient(client: mockClient, tokenStorage: InMemoryTokenStorage());
      final dealsService = DealsService(apiClient: apiClient);
      final docsService = DocumentsService(apiClient: apiClient);
      final reqService = UploadRequestsService(apiClient: apiClient);

      // Set narrow phone screen dimensions: 320 width x 640 height
      tester.view.physicalSize = const Size(320, 640);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(() => tester.view.resetPhysicalSize());

      await tester.pumpWidget(
        MaterialApp(
          theme: AppTheme.lightTheme,
          home: DealsListScreen(
            dealsService: dealsService,
            documentsService: docsService,
            requestsService: reqService,
          ),
        ),
      );

      await tester.pumpAndSettle();

      // Verify filter chips exist and can be scrolled horizontally
      expect(find.text('All'), findsOneWidget);
      expect(find.text('Active'), findsOneWidget);
      expect(find.text('Negotiation'), findsOneWidget);

      // Verify clicking Active filters locally without errors
      await tester.tap(find.text('Active'));
      await tester.pumpAndSettle();

      // Only d-1 (inquiry) should remain, d-2 (completed) excluded
      expect(find.text('ASH-2026-001'), findsOneWidget);
      expect(find.text('ASH-2026-002'), findsNothing);

      // Singular document count verified on rendered deal card
      expect(find.text('1 document'), findsOneWidget);
    });
  });
}
