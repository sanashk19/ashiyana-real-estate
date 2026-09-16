import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:ashiyana_broker/core/network/api_client.dart';
import 'package:ashiyana_broker/core/storage/token_storage.dart';
import 'package:ashiyana_broker/core/theme/app_theme.dart';
import 'package:ashiyana_broker/features/deals/deals_list_screen.dart';
import 'package:ashiyana_broker/features/deals/deal_detail_screen.dart';
import 'package:ashiyana_broker/models/deal_model.dart';
import 'package:ashiyana_broker/services/deals_service.dart';
import 'package:ashiyana_broker/services/documents_service.dart';
import 'package:ashiyana_broker/services/upload_requests_service.dart';

void main() {
  group('Deals Service & Screen Tests', () {
    test('DealsService fetches and parses deal list with search and canonical status', () async {
      final mockClient = MockClient((request) async {
        expect(request.url.path, '/api/deals');
        expect(request.url.queryParameters['search'], 'Assagao');
        expect(request.url.queryParameters['status'], 'negotiation');
        return http.Response(
          jsonEncode({
            'items': [
              {
                'id': '11111111-1111-1111-1111-111111111111',
                'deal_number': 'ASH-2026-001',
                'property_id': null,
                'property': {
                  'id': 'prop-1',
                  'title': 'Assagao Garden Villa',
                  'locality': 'Assagao',
                  'price': 25000000.0,
                  'property_type': 'villa',
                },
                'buyer_name': 'Aarav Patel',
                'seller_name': 'Maria Souza',
                'status': 'negotiation',
                'document_count': 3,
                'created_at': '2026-09-08T10:00:00Z',
              }
            ],
            'total': 1,
            'limit': 50,
            'offset': 0,
          }),
          200,
        );
      });

      final apiClient = ApiClient(client: mockClient, tokenStorage: InMemoryTokenStorage());
      final dealsService = DealsService(apiClient: apiClient);

      final deals = await dealsService.getDeals(search: 'Assagao', status: 'negotiation');
      expect(deals.length, 1);
      expect(deals.first.dealNumber, 'ASH-2026-001');
      expect(deals.first.status, DealStatus.negotiation);
      expect(deals.first.propertyTitle, 'Assagao Garden Villa');
      expect(deals.first.effectiveBuyerName, 'Aarav Patel');
    });

    testWidgets('DealsListScreen renders deal card with status and document count', (WidgetTester tester) async {
      final mockClient = MockClient((request) async {
        return http.Response(
          jsonEncode({
            'items': [
              {
                'id': '11111111-1111-1111-1111-111111111111',
                'deal_number': 'ASH-2026-015',
                'property': {
                  'id': 'prop-2',
                  'title': 'Sea Facing Penthouse',
                  'locality': 'Candolim',
                  'price': 40000000.0,
                  'property_type': 'apartment',
                },
                'buyer_name': 'Kavita Roy',
                'seller_name': 'Luis Braganza',
                'status': 'negotiation',
                'document_count': 4,
                'created_at': '2026-09-08T10:00:00Z',
              }
            ],
          }),
          200,
        );
      });

      final apiClient = ApiClient(client: mockClient, tokenStorage: InMemoryTokenStorage());
      final dealsService = DealsService(apiClient: apiClient);
      final docsService = DocumentsService(apiClient: apiClient);
      final reqService = UploadRequestsService(apiClient: apiClient);

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

      expect(find.text('ASH-2026-015'), findsOneWidget);
      expect(find.text('Sea Facing Penthouse'), findsOneWidget);
      expect(find.text('Negotiation'), findsWidgets);
      expect(find.text('4 documents'), findsOneWidget);
      expect(find.textContaining('Kavita Roy'), findsOneWidget);
    });

    testWidgets('DealDetailScreen renders tabs, checklist items, and contact actions', (WidgetTester tester) async {
      final mockClient = MockClient((request) async {
        return http.Response(
          jsonEncode({
            'id': '11111111-1111-1111-1111-111111111111',
            'deal_number': 'ASH-2026-015',
            'property': {
              'id': 'prop-2',
              'title': 'Sea Facing Penthouse',
              'locality': 'Candolim',
              'price': 40000000.0,
              'property_type': 'apartment',
            },
            'buyer': {
              'name': 'Kavita Roy',
              'phone': '+91 98221 99999',
              'email': 'kavita@example.com',
              'address': 'Candolim, Goa',
            },
            'seller': {
              'name': 'Luis Braganza',
              'phone': '+91 98221 88888',
              'email': 'luis@example.com',
            },
            'status': 'negotiation',
            'created_at': '2026-09-08T10:00:00Z',
            'documents': [],
            'checklist': [
              {
                'category': 'buyer',
                'title': 'Buyer PAN Card',
                'party': 'buyer',
                'required': true,
                'status': 'verified',
              },
              {
                'category': 'buyer',
                'title': 'Buyer Aadhaar / Passport ID',
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

      final apiClient = ApiClient(client: mockClient, tokenStorage: InMemoryTokenStorage());
      final dealsService = DealsService(apiClient: apiClient);
      final docsService = DocumentsService(apiClient: apiClient);
      final reqService = UploadRequestsService(apiClient: apiClient);

      await tester.pumpWidget(
        MaterialApp(
          theme: AppTheme.lightTheme,
          home: DealDetailScreen(
            dealId: '11111111-1111-1111-1111-111111111111',
            dealsService: dealsService,
            documentsService: docsService,
            requestsService: reqService,
          ),
        ),
      );

      await tester.pumpAndSettle();

      expect(find.text('ASH-2026-015'), findsWidgets);
      expect(find.text('Sea Facing Penthouse'), findsWidgets);
      expect(find.text('BUYER'), findsWidgets);
      expect(find.text('SELLER'), findsWidgets);
      expect(find.text('Call'), findsWidgets);
      expect(find.text('WhatsApp'), findsWidgets);

      // Switch to Checklist tab
      await tester.tap(find.textContaining('Checklist'));
      await tester.pumpAndSettle();

      expect(find.text('Buyer PAN Card'), findsOneWidget);
      expect(find.textContaining('Buyer Aadhaar / Passport ID'), findsWidgets);
      expect(find.text('Verified'), findsOneWidget);
    });
  });
}
