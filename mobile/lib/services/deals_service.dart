import '../core/network/api_client.dart';
import '../models/deal_model.dart';

class DealsService {
  final ApiClient _apiClient;

  DealsService({ApiClient? apiClient}) : _apiClient = apiClient ?? ApiClient();

  // Canonical backend statuses allowed by FastAPI DealStatus enum:
  static const Set<String> validBackendStatuses = {
    'inquiry',
    'negotiation',
    'agreement',
    'completed',
    'cancelled',
  };

  Future<List<Deal>> getDeals({
    String? search,
    String? status,
    DealStatus? dealStatus,
  }) async {
    final queryParams = <String, String>{};
    if (search != null && search.trim().isNotEmpty) {
      queryParams['search'] = search.trim();
    }

    // Determine status query param strictly from canonical backend statuses
    String? resolvedStatus;
    if (dealStatus != null) {
      resolvedStatus = dealStatus.value;
    } else if (status != null && status.trim().isNotEmpty) {
      final normalized = status.trim().toLowerCase();
      if (validBackendStatuses.contains(normalized)) {
        resolvedStatus = normalized;
      }
      // Note: 'active', 'closed', 'all', etc. are UI concepts and must never be sent to backend
    }

    if (resolvedStatus != null) {
      queryParams['status'] = resolvedStatus;
    }

    String path = '/deals';
    if (queryParams.isNotEmpty) {
      final queryString = queryParams.entries
          .map((e) => '${Uri.encodeComponent(e.key)}=${Uri.encodeComponent(e.value)}')
          .join('&');
      path = '$path?$queryString';
    }

    final response = await _apiClient.get(path);

    List<dynamic> rawList = [];
    if (response is Map<String, dynamic>) {
      if (response.containsKey('deals') && response['deals'] is List) {
        rawList = response['deals'] as List<dynamic>;
      } else if (response.containsKey('items') && response['items'] is List) {
        rawList = response['items'] as List<dynamic>;
      }
    } else if (response is List) {
      rawList = response;
    }

    final deals = <Deal>[];
    for (final item in rawList) {
      if (item is Map<String, dynamic>) {
        try {
          deals.add(Deal.fromJson(item));
        } catch (_) {
          // Skip malformed item defensively to prevent crashing the screen
        }
      }
    }

    return deals;
  }

  Future<Deal> getDealById(String dealId) async {
    final response = await _apiClient.get('/deals/$dealId');
    if (response is! Map<String, dynamic>) {
      throw ApiException(statusCode: 500, message: 'Invalid deal response structure.');
    }
    return Deal.fromJson(response);
  }
}
