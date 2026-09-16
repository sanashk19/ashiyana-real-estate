import '../core/network/api_client.dart';
import '../models/user_model.dart';

class AuthService {
  final ApiClient _apiClient;
  BrokerUser? _currentUser;

  AuthService({ApiClient? apiClient}) : _apiClient = apiClient ?? ApiClient();

  ApiClient get apiClient => _apiClient;
  BrokerUser? get currentUser => _currentUser;

  Future<BrokerUser> login({required String email, required String password}) async {
    final response = await _apiClient.post(
      '/auth/login',
      body: {
        'email': email.trim(),
        'password': password,
      },
      retryOnAuth: false,
    );

    if (response is! Map<String, dynamic>) {
      throw ApiException(statusCode: 500, message: 'Malformed server response.');
    }

    final accessToken = response['access_token'] as String?;
    final refreshToken = response['refresh_token'] as String?;

    if (accessToken == null || refreshToken == null) {
      throw ApiException(statusCode: 500, message: 'Missing authentication credentials in response.');
    }

    await _apiClient.tokenStorage.saveTokens(
      accessToken: accessToken,
      refreshToken: refreshToken,
    );

    // Fetch user profile to enforce broker-only access
    final user = await getMe();
    if (!user.isBroker) {
      await _apiClient.tokenStorage.clearTokens();
      _currentUser = null;
      throw ApiException(
        statusCode: 403,
        message: 'Access restricted to authorized Ashiyana brokers only.',
      );
    }

    _currentUser = user;
    return user;
  }

  Future<BrokerUser> getMe() async {
    final response = await _apiClient.get('/auth/me');
    if (response is! Map<String, dynamic>) {
      throw ApiException(statusCode: 500, message: 'Malformed profile response.');
    }
    final user = BrokerUser.fromJson(response);
    _currentUser = user;
    return user;
  }

  Future<void> logout() async {
    try {
      await _apiClient.post('/auth/logout', retryOnAuth: false);
    } catch (_) {
      // Best effort server-side logout
    } finally {
      await _apiClient.tokenStorage.clearTokens();
      _currentUser = null;
    }
  }

  Future<bool> isAuthenticated() async {
    final token = await _apiClient.tokenStorage.getAccessToken();
    final refresh = await _apiClient.tokenStorage.getRefreshToken();
    return (token != null && token.isNotEmpty) || (refresh != null && refresh.isNotEmpty);
  }
}
