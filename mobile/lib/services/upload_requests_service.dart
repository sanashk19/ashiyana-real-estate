import '../core/network/api_client.dart';
import '../models/upload_request_model.dart';

class UploadRequestsService {
  final ApiClient _apiClient;

  UploadRequestsService({ApiClient? apiClient}) : _apiClient = apiClient ?? ApiClient();

  Future<DealUploadRequest> createUploadRequest({
    required String dealId,
    required String party,
    required List<String> requestedDocs,
    String? message,
    int expiresInHours = 48,
  }) async {
    final response = await _apiClient.post(
      '/deals/$dealId/upload-requests',
      body: {
        'party': party.toLowerCase().trim(),
        'requested_docs': requestedDocs,
        'message': message?.trim(),
        'expires_in_hours': expiresInHours,
      },
    );

    if (response is! Map<String, dynamic>) {
      throw ApiException(statusCode: 500, message: 'Invalid upload request response.');
    }

    return DealUploadRequest.fromJson(response);
  }

  Future<void> revokeUploadRequest({
    required String dealId,
    required String requestId,
  }) async {
    await _apiClient.post('/deals/$dealId/upload-requests/$requestId/revoke');
  }
}
