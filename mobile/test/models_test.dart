import 'package:flutter_test/flutter_test.dart';
import 'package:ashiyana_broker/models/user_model.dart';
import 'package:ashiyana_broker/models/deal_model.dart';
import 'package:ashiyana_broker/models/document_model.dart';
import 'package:ashiyana_broker/models/checklist_model.dart';
import 'package:ashiyana_broker/models/upload_request_model.dart';

void main() {
  group('Data Models Tests', () {
    test('BrokerUser parses JSON and verifies broker role', () {
      final json = {
        'id': '11111111-1111-1111-1111-111111111111',
        'email': 'kassim@ashiyana.com',
        'full_name': 'Kassim Shaikh',
        'phone': '+91 98221 23456',
        'role': 'broker',
        'is_active': true,
      };

      final user = BrokerUser.fromJson(json);
      expect(user.id, '11111111-1111-1111-1111-111111111111');
      expect(user.fullName, 'Kassim Shaikh');
      expect(user.isBroker, isTrue);

      final nonBroker = BrokerUser.fromJson({...json, 'role': 'user'});
      expect(nonBroker.isBroker, isFalse);

      final seller = BrokerUser.fromJson({...json, 'role': 'seller'});
      expect(seller.isBroker, isFalse);
    });

    test('Deal parses nested property and parties properly', () {
      final json = {
        'id': '22222222-2222-2222-2222-222222222222',
        'deal_number': 'ASH-2026-001',
        'property_id': '33333333-3333-3333-3333-333333333333',
        'property': {
          'id': '33333333-3333-3333-3333-333333333333',
          'title': '3 BHK Luxury Villa',
          'locality': 'Assagao, North Goa',
          'price': 35000000.0,
          'property_type': 'villa',
          'thumbnail_url': 'https://example.com/thumb.jpg',
        },
        'buyer_name': 'Rohan Mehta',
        'seller_name': 'Savio Fernandes',
        'buyer': {
          'name': 'Rohan Mehta',
          'phone': '+91 98230 11111',
          'email': 'rohan@example.com',
          'address': 'Mumbai, Maharashtra',
          'notes': 'Pre-approved loan from HDFC',
        },
        'seller': {
          'name': 'Savio Fernandes',
          'phone': '+91 98230 22222',
          'email': 'savio@example.com',
          'address': 'Assagao, Goa',
          'notes': 'Clear title deeds',
        },
        'status': 'negotiation',
        'notes': 'Token amount paid',
        'document_count': 5,
        'created_at': '2026-09-08T10:00:00Z',
      };

      final deal = Deal.fromJson(json);
      expect(deal.dealNumber, 'ASH-2026-001');
      expect(deal.propertyTitle, '3 BHK Luxury Villa');
      expect(deal.propertyLocation, 'Assagao, North Goa');
      expect(deal.effectiveBuyerName, 'Rohan Mehta');
      expect(deal.effectiveSellerName, 'Savio Fernandes');
      expect(deal.buyer?.phone, '+91 98230 11111');
      expect(deal.seller?.phone, '+91 98230 22222');
      expect(deal.documentCount, 5);
      expect(deal.documentCountDisplay, '5 documents');
      expect(deal.status, DealStatus.negotiation);
      expect(deal.statusValue, 'negotiation');
      expect(deal.statusLabel, 'Negotiation');
      expect(deal.isActive, isTrue);
    });

    test('DealDocument formats size and handles side metadata', () {
      final json = {
        'id': '44444444-4444-4444-4444-444444444444',
        'deal_id': '22222222-2222-2222-2222-222222222222',
        'category': 'buyer',
        'title': 'Buyer Aadhaar / Passport ID (Front)',
        'original_filename': 'aadhaar_front.jpg',
        'resource_type': 'image',
        'mime_type': 'image/jpeg',
        'file_size': 204800,
        'party': 'buyer',
        'document_side': 'front',
        'is_verified': true,
        'created_at': '2026-09-08T11:00:00Z',
        'download_url': '/api/documents/44444444-4444-4444-4444-444444444444/download',
      };

      final doc = DealDocument.fromJson(json);
      expect(doc.title, 'Buyer Aadhaar / Passport ID (Front)');
      expect(doc.sideDisplay, 'Front');
      expect(doc.formattedSize, '200.0 KB');
      expect(doc.isVerified, isTrue);
    });

    test('DealChecklistItem computes status getters properly', () {
      final pendingItem = DealChecklistItem(
        category: 'buyer',
        title: 'Buyer PAN Card',
        party: 'buyer',
        required: true,
        status: 'pending',
      );
      expect(pendingItem.isPending, isTrue);
      expect(pendingItem.isReceived, isFalse);

      final uploadedItem = DealChecklistItem(
        category: 'buyer',
        title: 'Buyer PAN Card',
        party: 'buyer',
        required: true,
        status: 'uploaded',
      );
      expect(uploadedItem.isUploaded, isTrue);
      expect(uploadedItem.isReceived, isTrue);

      final verifiedItem = DealChecklistItem(
        category: 'buyer',
        title: 'Buyer PAN Card',
        party: 'buyer',
        required: true,
        status: 'verified',
      );
      expect(verifiedItem.isVerified, isTrue);
      expect(verifiedItem.isReceived, isTrue);
    });

    test('DealUploadRequest checks active and expiry states', () {
      final activeReq = DealUploadRequest(
        id: '55555555-5555-5555-5555-555555555555',
        dealId: '22222222-2222-2222-2222-222222222222',
        party: 'buyer',
        requestedDocs: ['Buyer PAN Card', 'Buyer Photograph'],
        expiresAt: DateTime.now().add(const Duration(hours: 24)),
        isRevoked: false,
        createdAt: DateTime.now(),
        uploadUrl: 'http://localhost:5173/upload-documents?token=test',
      );
      expect(activeReq.isActive, isTrue);
      expect(activeReq.isExpired, isFalse);

      final expiredReq = DealUploadRequest(
        id: '66666666-6666-6666-6666-666666666666',
        dealId: '22222222-2222-2222-2222-222222222222',
        party: 'buyer',
        requestedDocs: ['Buyer PAN Card'],
        expiresAt: DateTime.now().subtract(const Duration(hours: 2)),
        isRevoked: false,
        createdAt: DateTime.now().subtract(const Duration(hours: 48)),
      );
      expect(expiredReq.isExpired, isTrue);
      expect(expiredReq.isActive, isFalse);
    });
  });
}
