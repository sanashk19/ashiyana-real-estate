class DealDocument {
  final String id;
  final String dealId;
  final String category;
  final String title;
  final String originalFilename;
  final String resourceType;
  final String mimeType;
  final int fileSize;
  final String? party;
  final String? documentSide;
  final bool isVerified;
  final DateTime? verifiedAt;
  final String? verifiedBy;
  final DateTime createdAt;
  final String downloadUrl;

  DealDocument({
    required this.id,
    required this.dealId,
    required this.category,
    required this.title,
    required this.originalFilename,
    required this.resourceType,
    required this.mimeType,
    required this.fileSize,
    this.party,
    this.documentSide,
    this.isVerified = false,
    this.verifiedAt,
    this.verifiedBy,
    required this.createdAt,
    required this.downloadUrl,
  });

  String get formattedSize {
    if (fileSize < 1024) return '$fileSize B';
    if (fileSize < 1024 * 1024) return '${(fileSize / 1024).toStringAsFixed(1)} KB';
    return '${(fileSize / (1024 * 1024)).toStringAsFixed(1)} MB';
  }

  String get sideDisplay {
    if (documentSide == null || documentSide!.isEmpty || documentSide == 'complete') {
      return 'Complete';
    }
    return documentSide![0].toUpperCase() + documentSide!.substring(1);
  }

  factory DealDocument.fromJson(Map<String, dynamic> json) {
    return DealDocument(
      id: json['id'] as String,
      dealId: json['deal_id'] as String,
      category: json['category'] as String? ?? 'general',
      title: json['title'] as String? ?? '',
      originalFilename: json['original_filename'] as String? ?? '',
      resourceType: json['resource_type'] as String? ?? 'raw',
      mimeType: json['mime_type'] as String? ?? 'application/octet-stream',
      fileSize: (json['file_size'] as num?)?.toInt() ?? 0,
      party: json['party'] as String?,
      documentSide: json['document_side'] as String?,
      isVerified: json['is_verified'] as bool? ?? false,
      verifiedAt: json['verified_at'] != null ? DateTime.tryParse(json['verified_at'] as String) : null,
      verifiedBy: json['verified_by'] as String?,
      createdAt: DateTime.tryParse(json['created_at'] as String? ?? '') ?? DateTime.now(),
      downloadUrl: json['download_url'] as String? ?? '',
    );
  }
}
