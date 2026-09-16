import 'document_model.dart';
import 'checklist_model.dart';
import 'upload_request_model.dart';

enum DealStatus {
  inquiry('inquiry', 'Inquiry'),
  negotiation('negotiation', 'Negotiation'),
  agreement('agreement', 'Agreement'),
  completed('completed', 'Completed'),
  cancelled('cancelled', 'Cancelled');

  final String value;
  final String label;

  const DealStatus(this.value, this.label);

  static DealStatus fromString(String? raw) {
    if (raw == null) return DealStatus.inquiry;
    final normalized = raw.trim().toLowerCase();
    for (final s in DealStatus.values) {
      if (s.value == normalized) return s;
    }
    return DealStatus.inquiry;
  }

  bool get isActive =>
      this == DealStatus.inquiry ||
      this == DealStatus.negotiation ||
      this == DealStatus.agreement;

  bool get isClosed =>
      this == DealStatus.completed ||
      this == DealStatus.cancelled;
}

class DealProperty {
  final String id;
  final String title;
  final String locality;
  final double price;
  final String propertyType;
  final String? thumbnailUrl;

  DealProperty({
    required this.id,
    required this.title,
    required this.locality,
    required this.price,
    required this.propertyType,
    this.thumbnailUrl,
  });

  factory DealProperty.fromJson(Map<String, dynamic> json) {
    return DealProperty(
      id: json['id']?.toString() ?? '',
      title: json['title'] as String? ?? 'Goa Property',
      locality: json['locality'] as String? ?? '',
      price: (json['price'] as num?)?.toDouble() ?? 0.0,
      propertyType: json['property_type'] as String? ?? 'residential',
      thumbnailUrl: json['thumbnail_url'] as String?,
    );
  }
}

class DealParty {
  final String? name;
  final String? phone;
  final String? email;
  final String? address;
  final String? notes;

  DealParty({
    this.name,
    this.phone,
    this.email,
    this.address,
    this.notes,
  });

  factory DealParty.fromJson(Map<String, dynamic> json) {
    return DealParty(
      name: json['name'] as String?,
      phone: json['phone'] as String?,
      email: json['email'] as String?,
      address: json['address'] as String?,
      notes: json['notes'] as String?,
    );
  }
}

class Deal {
  final String id;
  final String dealNumber;
  final String? propertyId;
  final DealProperty? property;
  final String? buyerName;
  final String? sellerName;
  final DealParty? buyer;
  final DealParty? seller;
  final DealStatus status;
  final String? notes;
  final int documentCount;
  final DateTime createdAt;
  final DateTime? updatedAt;
  final DateTime? closedAt;

  // Detail fields
  final List<DealDocument> documents;
  final List<DealChecklistItem> checklist;
  final List<DealUploadRequest> uploadRequests;

  Deal({
    required this.id,
    required this.dealNumber,
    this.propertyId,
    this.property,
    this.buyerName,
    this.sellerName,
    this.buyer,
    this.seller,
    required this.status,
    this.notes,
    this.documentCount = 0,
    required this.createdAt,
    this.updatedAt,
    this.closedAt,
    this.documents = const [],
    this.checklist = const [],
    this.uploadRequests = const [],
  });

  String get effectiveBuyerName => buyer?.name ?? buyerName ?? 'Unassigned Buyer';
  String get effectiveSellerName => seller?.name ?? sellerName ?? 'Unassigned Seller';
  String get propertyTitle => property?.title ?? 'Direct Property Deal';
  String get propertyLocation => property?.locality ?? 'Goa';

  String get statusValue => status.value;
  String get statusLabel => status.label;
  bool get isActive => status.isActive;
  bool get isClosed => status.isClosed;

  String get documentCountDisplay =>
      '$documentCount ${documentCount == 1 ? 'document' : 'documents'}';

  int get receivedDocsCount => checklist.where((item) => item.isReceived).length;
  int get totalChecklistCount => checklist.length;

  factory Deal.fromJson(Map<String, dynamic> json) {
    return Deal(
      id: json['id']?.toString() ?? '',
      dealNumber: json['deal_number']?.toString() ?? 'DEAL',
      propertyId: json['property_id'] as String?,
      property: json['property'] != null && json['property'] is Map<String, dynamic>
          ? DealProperty.fromJson(json['property'] as Map<String, dynamic>)
          : null,
      buyerName: json['buyer_name'] as String?,
      sellerName: json['seller_name'] as String?,
      buyer: json['buyer'] != null && json['buyer'] is Map<String, dynamic>
          ? DealParty.fromJson(json['buyer'] as Map<String, dynamic>)
          : null,
      seller: json['seller'] != null && json['seller'] is Map<String, dynamic>
          ? DealParty.fromJson(json['seller'] as Map<String, dynamic>)
          : null,
      status: DealStatus.fromString(json['status'] as String?),
      notes: json['notes'] as String?,
      documentCount: (json['document_count'] as num?)?.toInt() ?? 0,
      createdAt: DateTime.tryParse(json['created_at'] as String? ?? '') ?? DateTime.now(),
      updatedAt: json['updated_at'] != null ? DateTime.tryParse(json['updated_at'] as String) : null,
      closedAt: json['closed_at'] != null ? DateTime.tryParse(json['closed_at'] as String) : null,
      documents: (json['documents'] as List<dynamic>?)
              ?.whereType<Map<String, dynamic>>()
              .map((e) => DealDocument.fromJson(e))
              .toList() ??
          const [],
      checklist: (json['checklist'] as List<dynamic>?)
              ?.whereType<Map<String, dynamic>>()
              .map((e) => DealChecklistItem.fromJson(e))
              .toList() ??
          const [],
      uploadRequests: (json['upload_requests'] as List<dynamic>?)
              ?.whereType<Map<String, dynamic>>()
              .map((e) => DealUploadRequest.fromJson(e))
              .toList() ??
          const [],
    );
  }
}
