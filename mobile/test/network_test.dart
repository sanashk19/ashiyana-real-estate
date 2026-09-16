import 'dart:convert';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:ashiyana_broker/core/network/api_client.dart';
import 'package:ashiyana_broker/core/storage/token_storage.dart';

void main() {
  group('Network & ApiClient Tests', () {
    test('attaches Authorization header when access token is present', () async {
      final storage = InMemoryTokenStorage();
      await storage.saveTokens(
        accessToken: 'initial_access_token',
        refreshToken: 'initial_refresh_token',
      );

      String? capturedAuthHeader;
      final mockClient = MockClient((request) async {
        capturedAuthHeader = request.headers['Authorization'];
        return http.Response(jsonEncode({'items': []}), 200);
      });

      final apiClient = ApiClient(client: mockClient, tokenStorage: storage);
      await apiClient.get('/deals');

      expect(capturedAuthHeader, 'Bearer initial_access_token');
    });

    test('intercepts 401, refreshes tokens, and retries request successfully', () async {
      final storage = InMemoryTokenStorage();
      await storage.saveTokens(
        accessToken: 'expired_access_token',
        refreshToken: 'valid_refresh_token',
      );

      int requestCount = 0;
      final mockClient = MockClient((request) async {
        requestCount++;
        if (request.url.path.endsWith('/auth/refresh')) {
          return http.Response(
            jsonEncode({
              'access_token': 'new_rotated_access_token',
              'refresh_token': 'new_rotated_refresh_token',
            }),
            200,
          );
        }

        // On first attempt, reject with 401
        if (request.headers['Authorization'] == 'Bearer expired_access_token') {
          return http.Response(
            jsonEncode({'detail': 'Token has expired'}),
            401,
          );
        }

        // On retry with new token, succeed
        if (request.headers['Authorization'] == 'Bearer new_rotated_access_token') {
          return http.Response(
            jsonEncode({'status': 'ok', 'deal_number': 'ASH-2026-001'}),
            200,
          );
        }

        return http.Response('Unauthorized', 401);
      });

      final apiClient = ApiClient(client: mockClient, tokenStorage: storage);
      final response = await apiClient.get('/deals/1');

      expect(response['status'], 'ok');
      expect(response['deal_number'], 'ASH-2026-001');
      expect(await storage.getAccessToken(), 'new_rotated_access_token');
      expect(await storage.getRefreshToken(), 'new_rotated_refresh_token');
      expect(requestCount, 3); // initial request (401) -> refresh request (200) -> retried request (200)
    });

    test('maps 403 Forbidden to friendly ApiException', () async {
      final mockClient = MockClient((request) async {
        return http.Response(jsonEncode({'detail': 'You do not have permission.'}), 403);
      });

      final apiClient = ApiClient(client: mockClient, tokenStorage: InMemoryTokenStorage());

      expect(
        () async => await apiClient.get('/deals/1'),
        throwsA(isA<ApiException>().having(
          (e) => e.statusCode,
          'statusCode',
          403,
        )),
      );
    });

    test('maps 413 Payload Too Large with 15MB limit message', () async {
      final mockClient = MockClient((request) async {
        return http.Response('Payload too large', 413);
      });

      final apiClient = ApiClient(client: mockClient, tokenStorage: InMemoryTokenStorage());

      try {
        await apiClient.get('/deals/1');
        fail('Should throw ApiException');
      } on ApiException catch (e) {
        expect(e.statusCode, 413);
        expect(e.message, contains('15 MB'));
      }
    });
  });
}
