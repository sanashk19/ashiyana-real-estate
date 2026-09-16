import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:ashiyana_broker/core/network/api_client.dart';
import 'package:ashiyana_broker/core/storage/token_storage.dart';
import 'package:ashiyana_broker/core/theme/app_theme.dart';
import 'package:ashiyana_broker/features/auth/login_screen.dart';
import 'package:ashiyana_broker/features/home/home_screen.dart';
import 'package:ashiyana_broker/models/user_model.dart';
import 'package:ashiyana_broker/services/auth_service.dart';
import 'package:ashiyana_broker/services/deals_service.dart';
import 'package:ashiyana_broker/services/documents_service.dart';
import 'package:ashiyana_broker/services/upload_requests_service.dart';

void main() {
  group('Widget Tests', () {
    testWidgets('LoginScreen renders Ashiyana branding and input fields', (WidgetTester tester) async {
      final mockClient = MockClient((request) async => http.Response('Not Found', 404));
      final apiClient = ApiClient(client: mockClient, tokenStorage: InMemoryTokenStorage());
      final authService = AuthService(apiClient: apiClient);

      await tester.pumpWidget(
        MaterialApp(
          theme: AppTheme.lightTheme,
          home: LoginScreen(authService: authService),
        ),
      );

      expect(find.text('ASHIYANA'), findsOneWidget);
      expect(find.text('Broker Field Companion'), findsOneWidget);
      expect(find.text('Sign In as Broker'), findsOneWidget);
      expect(find.byType(TextFormField), findsNWidgets(2));
    });

    testWidgets('HomeScreen renders greeting and quick access cards', (WidgetTester tester) async {
      final user = BrokerUser(
        id: '11111111-1111-1111-1111-111111111111',
        email: 'kassim@ashiyana.com',
        fullName: 'Kassim Shaikh',
        role: 'broker',
      );

      final mockClient = MockClient((request) async {
        return http.Response('{"items": []}', 200);
      });
      final apiClient = ApiClient(client: mockClient, tokenStorage: InMemoryTokenStorage());

      await tester.pumpWidget(
        MaterialApp(
          theme: AppTheme.lightTheme,
          home: HomeScreen(
            user: user,
            dealsService: DealsService(apiClient: apiClient),
            documentsService: DocumentsService(apiClient: apiClient),
            requestsService: UploadRequestsService(apiClient: apiClient),
          ),
        ),
      );

      await tester.pumpAndSettle();

      expect(find.textContaining('Good'), findsOneWidget);
      expect(find.textContaining('Kassim'), findsOneWidget);
      expect(find.text('Deals'), findsOneWidget);
      expect(find.text('Documents'), findsOneWidget);
    });
  });
}
