import 'dart:typed_data';
import 'package:http_parser/http_parser.dart';
import '../core/network/api_client.dart';
import '../models/document_model.dart';

class DocumentsService {
  final ApiClient _apiClient;

  DocumentsService({ApiClient? apiClient}) : _apiClient = apiClient ?? ApiClient();

  Future<List<DealDocument>> getDocuments(String dealId) async {
    final response = await _apiClient.get('/deals/$dealId/documents');
    if (response is List) {
      return response.map((e) => DealDocument.fromJson(e as Map<String, dynamic>)).toList();
    }
    return [];
  }

  Future<DealDocument> uploadDocument({
    required String dealId,
    required String title,
    required String category,
    String? party,
    String? documentSide,
    required Uint8List fileBytes,
    required String filename,
    MediaType? contentType,
  }) async {
    final fields = <String, String>{
      'title': title.trim(),
      'category': category.toLowerCase().trim(),
    };
    if (party != null && party.isNotEmpty) {
      fields['party'] = party.toLowerCase().trim();
    }
    if (documentSide != null && documentSide.isNotEmpty) {
      fields['document_side'] = documentSide.toLowerCase().trim();
    }

    final response = await _apiClient.uploadFile(
      path: '/deals/$dealId/documents',
      fileBytes: fileBytes,
      filename: filename,
      fields: fields,
      contentType: contentType,
    );

    if (response is Map<String, dynamic> && response.containsKey('document')) {
      return DealDocument.fromJson(response['document'] as Map<String, dynamic>);
    } else if (response is Map<String, dynamic>) {
      return DealDocument.fromJson(response);
    }

    throw ApiException(
      statusCode: 500,
      message: 'Failed to process uploaded document response.',
    );
  }
}
