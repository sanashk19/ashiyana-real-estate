import 'dart:convert';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:ashiyana_broker/core/network/api_client.dart';
import 'package:ashiyana_broker/core/storage/token_storage.dart';
import 'package:ashiyana_broker/services/auth_service.dart';

void main() {
  group('AuthService Tests', () {
    test('successful login for broker stores tokens and returns BrokerUser', () async {
      final storage = InMemoryTokenStorage();

      final mockClient = MockClient((request) async {
        if (request.url.path.endsWith('/auth/login')) {
          return http.Response(
            jsonEncode({
              'access_token': 'test_access_jwt',
              'refresh_token': 'test_refresh_jwt',
            }),
            200,
          );
        }
        if (request.url.path.endsWith('/auth/me')) {
          return http.Response(
            jsonEncode({
              'id': '11111111-1111-1111-1111-111111111111',
              'email': 'kassim@ashiyana.com',
              'full_name': 'Kassim Shaikh',
              'phone': '+91 98221 23456',
              'role': 'broker',
              'is_active': true,
            }),
            200,
          );
        }
        return http.Response('Not Found', 404);
      });

      final apiClient = ApiClient(client: mockClient, tokenStorage: storage);
      final authService = AuthService(apiClient: apiClient);

      final user = await authService.login(
        email: 'kassim@ashiyana.com',
        password: 'correct_password',
      );

      expect(user.fullName, 'Kassim Shaikh');
      expect(user.isBroker, isTrue);
      expect(await storage.getAccessToken(), 'test_access_jwt');
      expect(await storage.getRefreshToken(), 'test_refresh_jwt');
      expect(await authService.isAuthenticated(), isTrue);
    });

    test('rejects non-broker role and wipes tokens', () async {
      final storage = InMemoryTokenStorage();

      final mockClient = MockClient((request) async {
        if (request.url.path.endsWith('/auth/login')) {
          return http.Response(
            jsonEncode({
              'access_token': 'non_broker_access',
              'refresh_token': 'non_broker_refresh',
            }),
            200,
          );
        }
        if (request.url.path.endsWith('/auth/me')) {
          return http.Response(
            jsonEncode({
              'id': '22222222-2222-2222-2222-222222222222',
              'email': 'buyer@example.com',
              'full_name': 'Jane Doe',
              'role': 'user',
              'is_active': true,
            }),
            200,
          );
        }
        return http.Response('Not Found', 404);
      });

      final apiClient = ApiClient(client: mockClient, tokenStorage: storage);
      final authService = AuthService(apiClient: apiClient);

      try {
        await authService.login(email: 'buyer@example.com', password: 'password');
        fail('Should reject non-broker account');
      } on ApiException catch (e) {
        expect(e.statusCode, 403);
        expect(e.message, contains('Access restricted to authorized Ashiyana brokers only'));
      }

      // Tokens must be wiped
      expect(await storage.getAccessToken(), isNull);
      expect(await storage.getRefreshToken(), isNull);
      expect(await authService.isAuthenticated(), isFalse);
    });

    test('logout clears tokens and current user', () async {
      final storage = InMemoryTokenStorage();
      await storage.saveTokens(
        accessToken: 'some_access_token',
        refreshToken: 'some_refresh_token',
      );

      final mockClient = MockClient((request) async {
        if (request.url.path.endsWith('/auth/logout')) {
          return http.Response(jsonEncode({'message': 'Logged out successfully'}), 200);
        }
        return http.Response('Not Found', 404);
      });

      final apiClient = ApiClient(client: mockClient, tokenStorage: storage);
      final authService = AuthService(apiClient: apiClient);

      await authService.logout();

      expect(await storage.getAccessToken(), isNull);
      expect(await storage.getRefreshToken(), isNull);
      expect(authService.currentUser, isNull);
    });
  });
}
