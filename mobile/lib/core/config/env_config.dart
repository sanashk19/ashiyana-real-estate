import 'package:flutter/foundation.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

enum Environment { development, staging, production }

class EnvConfig {
  static const String _defaultLanUrl = 'http://192.168.0.101:8000/api';
  static const String _defaultLocalhostUrl = 'http://127.0.0.1:8000/api';
  static const String _storageKey = 'custom_api_base_url';

  static const _storage = FlutterSecureStorage();
  static String _customBaseUrl = '';

  static Future<void> init() async {
    try {
      final saved = await _storage.read(key: _storageKey);
      if (saved != null && saved.trim().isNotEmpty) {
        _customBaseUrl = saved.trim().replaceAll(RegExp(r'/+$'), '');
      }
    } catch (_) {
      // Storage read fallback
    }
  }

  static Environment get currentEnvironment {
    const env = String.fromEnvironment('ENV', defaultValue: 'development');
    switch (env.toLowerCase()) {
      case 'production':
        return Environment.production;
      case 'staging':
        return Environment.staging;
      default:
        return Environment.development;
    }
  }

  static String get defaultBaseUrl {
    const fromEnv = String.fromEnvironment('API_BASE_URL', defaultValue: '');
    if (fromEnv.isNotEmpty) {
      return fromEnv;
    }

    if (kIsWeb) {
      return _defaultLocalhostUrl;
    }

    if (defaultTargetPlatform == TargetPlatform.android) {
      return _defaultLanUrl;
    }

    return _defaultLocalhostUrl;
  }

  static String get apiBaseUrl {
    if (_customBaseUrl.isNotEmpty) {
      return _customBaseUrl;
    }
    return defaultBaseUrl;
  }

  static Future<void> setCustomBaseUrl(String url) async {
    final cleaned = url.trim().replaceAll(RegExp(r'/+$'), '');
    _customBaseUrl = cleaned;
    try {
      await _storage.write(key: _storageKey, value: cleaned);
    } catch (_) {
      // Storage write fallback
    }
  }

  static Future<void> resetBaseUrl() async {
    _customBaseUrl = '';
    try {
      await _storage.delete(key: _storageKey);
    } catch (_) {
      // Storage delete fallback
    }
  }
}
