class DealUploadRequest {
  final String id;
  final String dealId;
  final String party;
  final List<String> requestedDocs;
  final String? message;
  final DateTime expiresAt;
  final bool isRevoked;
  final DateTime createdAt;
  final String? uploadUrl;

  DealUploadRequest({
    required this.id,
    required this.dealId,
    required this.party,
    required this.requestedDocs,
    this.message,
    required this.expiresAt,
    required this.isRevoked,
    required this.createdAt,
    this.uploadUrl,
  });

  bool get isExpired => DateTime.now().isAfter(expiresAt);
  bool get isActive => !isRevoked && !isExpired;

  factory DealUploadRequest.fromJson(Map<String, dynamic> json) {
    return DealUploadRequest(
      id: json['id'] as String,
      dealId: json['deal_id'] as String,
      party: json['party'] as String? ?? 'buyer',
      requestedDocs: (json['requested_docs'] as List<dynamic>?)
              ?.map((e) => e.toString())
              .toList() ??
          const [],
      message: json['message'] as String?,
      expiresAt: DateTime.tryParse(json['expires_at'] as String? ?? '') ?? DateTime.now(),
      isRevoked: json['is_revoked'] as bool? ?? false,
      createdAt: DateTime.tryParse(json['created_at'] as String? ?? '') ?? DateTime.now(),
      uploadUrl: json['upload_url'] as String?,
    );
  }
}
