class DealChecklistItem {
  final String category;
  final String title;
  final String party;
  final bool required;
  final String status;
  final String? documentId;

  DealChecklistItem({
    required this.category,
    required this.title,
    required this.party,
    required this.required,
    required this.status,
    this.documentId,
  });

  bool get isVerified => status.toLowerCase() == 'verified';
  bool get isUploaded => status.toLowerCase() == 'uploaded';
  bool get isPending => status.toLowerCase() == 'pending';
  bool get isReceived => isVerified || isUploaded;

  factory DealChecklistItem.fromJson(Map<String, dynamic> json) {
    return DealChecklistItem(
      category: json['category'] as String? ?? 'general',
      title: json['title'] as String? ?? '',
      party: json['party'] as String? ?? 'buyer',
      required: json['required'] as bool? ?? false,
      status: json['status'] as String? ?? 'pending',
      documentId: json['document_id'] as String?,
    );
  }
}
