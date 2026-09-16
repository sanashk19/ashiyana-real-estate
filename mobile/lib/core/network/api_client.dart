import 'dart:async';
import 'dart:convert';
import 'dart:typed_data';
import 'package:http/http.dart' as http;
import 'package:http_parser/http_parser.dart';
import '../config/env_config.dart';
import '../storage/token_storage.dart';
import '../utils/mime_detector.dart';

class ApiException implements Exception {
  final int statusCode;
  final String message;
  final dynamic details;

  ApiException({
    required this.statusCode,
    required this.message,
    this.details,
  });

  @override
  String toString() => message;
}

class ApiClient {
  final http.Client _client;
  final TokenStorage _tokenStorage;
  bool _isRefreshing = false;
  Completer<bool>? _refreshCompleter;
  void Function()? onSessionExpired;

  ApiClient({
    http.Client? client,
    TokenStorage? tokenStorage,
    this.onSessionExpired,
  })  : _client = client ?? http.Client(),
        _tokenStorage = tokenStorage ?? SecureTokenStorage();

  TokenStorage get tokenStorage => _tokenStorage;

  String _buildUrl(String path) {
    final base = EnvConfig.apiBaseUrl;
    final cleanPath = path.startsWith('/') ? path : '/$path';
    return '$base$cleanPath';
  }

  Map<String, String> _buildHeaders(String? token, {Map<String, String>? extra}) {
    final headers = <String, String>{
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
    if (token != null && token.isNotEmpty) {
      headers['Authorization'] = 'Bearer $token';
    }
    if (extra != null) {
      headers.addAll(extra);
    }
    return headers;
  }

  Future<dynamic> get(String path, {Map<String, String>? headers, bool retryOnAuth = true}) async {
    return _sendWithAuth((token) async {
      final uri = Uri.parse(_buildUrl(path));
      final resp = await _client.get(uri, headers: _buildHeaders(token, extra: headers));
      return _processResponse(resp);
    }, retryOnAuth: retryOnAuth);
  }

  Future<dynamic> post(String path, {dynamic body, Map<String, String>? headers, bool retryOnAuth = true}) async {
    return _sendWithAuth((token) async {
      final uri = Uri.parse(_buildUrl(path));
      final resp = await _client.post(
        uri,
        headers: _buildHeaders(token, extra: headers),
        body: body != null ? jsonEncode(body) : null,
      );
      return _processResponse(resp);
    }, retryOnAuth: retryOnAuth);
  }

  Future<dynamic> put(String path, {dynamic body, Map<String, String>? headers, bool retryOnAuth = true}) async {
    return _sendWithAuth((token) async {
      final uri = Uri.parse(_buildUrl(path));
      final resp = await _client.put(
        uri,
        headers: _buildHeaders(token, extra: headers),
        body: body != null ? jsonEncode(body) : null,
      );
      return _processResponse(resp);
    }, retryOnAuth: retryOnAuth);
  }

  Future<dynamic> patch(String path, {dynamic body, Map<String, String>? headers, bool retryOnAuth = true}) async {
    return _sendWithAuth((token) async {
      final uri = Uri.parse(_buildUrl(path));
      final resp = await _client.patch(
        uri,
        headers: _buildHeaders(token, extra: headers),
        body: body != null ? jsonEncode(body) : null,
      );
      return _processResponse(resp);
    }, retryOnAuth: retryOnAuth);
  }

  Future<dynamic> delete(String path, {Map<String, String>? headers, bool retryOnAuth = true}) async {
    return _sendWithAuth((token) async {
      final uri = Uri.parse(_buildUrl(path));
      final resp = await _client.delete(uri, headers: _buildHeaders(token, extra: headers));
      return _processResponse(resp);
    }, retryOnAuth: retryOnAuth);
  }

  Future<dynamic> uploadFile({
    required String path,
    required Uint8List fileBytes,
    required String filename,
    required Map<String, String> fields,
    MediaType? contentType,
    bool retryOnAuth = true,
  }) async {
    final detection = MimeDetector.detectAndValidate(
      bytes: fileBytes,
      filename: filename,
    );

    final resolvedMediaType = contentType ?? detection.mediaType;
    final resolvedFilename = detection.normalizedFilename;

    return _sendWithAuth((token) async {
      final uri = Uri.parse(_buildUrl(path));
      final request = http.MultipartRequest('POST', uri);

      if (token != null && token.isNotEmpty) {
        request.headers['Authorization'] = 'Bearer $token';
      }
      request.headers['Accept'] = 'application/json';

      request.fields.addAll(fields);
      request.files.add(http.MultipartFile.fromBytes(
        'file',
        fileBytes,
        filename: resolvedFilename,
        contentType: resolvedMediaType,
      ));

      final streamedResponse = await _client.send(request);
      final resp = await http.Response.fromStream(streamedResponse);
      return _processResponse(resp);
    }, retryOnAuth: retryOnAuth);
  }

  Future<dynamic> _sendWithAuth(
    Future<dynamic> Function(String? token) requestFn, {
    bool retryOnAuth = true,
  }) async {
    String? token = await _tokenStorage.getAccessToken();

    try {
      return await requestFn(token);
    } on ApiException catch (e) {
      if (e.statusCode == 401 && retryOnAuth) {
        final refreshed = await _refreshToken();
        if (refreshed) {
          token = await _tokenStorage.getAccessToken();
          return await requestFn(token);
        } else {
          await _tokenStorage.clearTokens();
          onSessionExpired?.call();
          throw ApiException(
            statusCode: 401,
            message: 'Your session has expired. Please sign in again.',
          );
        }
      }
      rethrow;
    }
  }

  Future<bool> _refreshToken() async {
    if (_isRefreshing) {
      return await _refreshCompleter?.future ?? false;
    }

    _isRefreshing = true;
    _refreshCompleter = Completer<bool>();

    try {
      final refreshToken = await _tokenStorage.getRefreshToken();
      if (refreshToken == null || refreshToken.isEmpty) {
        _isRefreshing = false;
        _refreshCompleter?.complete(false);
        return false;
      }

      final uri = Uri.parse(_buildUrl('/auth/refresh'));
      final resp = await _client.post(
        uri,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: jsonEncode({'refresh_token': refreshToken}),
      );

      if (resp.statusCode == 200) {
        final data = jsonDecode(resp.body);
        final newAccess = data['access_token'] as String?;
        final newRefresh = data['refresh_token'] as String?;

        if (newAccess != null && newRefresh != null) {
          await _tokenStorage.saveTokens(
            accessToken: newAccess,
            refreshToken: newRefresh,
          );
          _isRefreshing = false;
          _refreshCompleter?.complete(true);
          return true;
        }
      }

      _isRefreshing = false;
      _refreshCompleter?.complete(false);
      return false;
    } catch (_) {
      _isRefreshing = false;
      _refreshCompleter?.complete(false);
      return false;
    }
  }

  dynamic _processResponse(http.Response response) {
    final statusCode = response.statusCode;

    if (statusCode >= 200 && statusCode < 300) {
      if (response.body.isEmpty) return null;
      try {
        return jsonDecode(response.body);
      } catch (_) {
        return response.body;
      }
    }

    String message = 'An unexpected error occurred.';
    dynamic errorDetail;

    try {
      final body = jsonDecode(response.body);
      if (body is Map<String, dynamic>) {
        if (body.containsKey('detail')) {
          final detail = body['detail'];
          if (detail is String) {
            message = detail;
          } else if (detail is List) {
            message = detail.map((e) => e['msg'] ?? e.toString()).join(', ');
          }
          errorDetail = detail;
        } else if (body.containsKey('message')) {
          message = body['message'].toString();
        }
      }
    } catch (_) {
      if (response.body.isNotEmpty) {
        message = response.body;
      }
    }

    switch (statusCode) {
      case 400:
        message = message.isNotEmpty ? message : 'Invalid request details.';
        break;
      case 401:
        message = message.isNotEmpty ? message : 'Authentication required or session expired.';
        break;
      case 403:
        message = message.isNotEmpty ? message : 'You do not have permission to perform this action.';
        break;
      case 404:
        message = message.isNotEmpty ? message : 'Requested resource was not found.';
        break;
      case 409:
        message = message.isNotEmpty ? message : 'Conflict detected. Please try again.';
        break;
      case 413:
        message = 'File size is too large (maximum 15 MB).';
        break;
      case 422:
        message = message.isNotEmpty ? message : 'Invalid submission parameters.';
        break;
      case 500:
      case 502:
      case 503:
        message = 'Server temporarily unavailable. Please try again shortly.';
        break;
    }

    throw ApiException(
      statusCode: statusCode,
      message: message,
      details: errorDetail,
    );
  }
}
