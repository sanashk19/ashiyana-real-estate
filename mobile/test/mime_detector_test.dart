import 'dart:convert';
import 'dart:typed_data';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:ashiyana_broker/core/network/api_client.dart';
import 'package:ashiyana_broker/core/storage/token_storage.dart';
import 'package:ashiyana_broker/core/utils/mime_detector.dart';

void main() {
  group('MimeDetector Tests', () {
    test('detects JPEG from binary magic bytes', () {
      final jpegBytes = Uint8List.fromList([
        0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46,
      ]);
      final result = MimeDetector.detectAndValidate(
        bytes: jpegBytes,
        filename: 'scan_001.jpg',
      );
      expect(result.mediaType.type, 'image');
      expect(result.mediaType.subtype, 'jpeg');
      expect(result.mimeTypeString, 'image/jpeg');
      expect(result.extension, '.jpg');
      expect(result.normalizedFilename, 'scan_001.jpg');
    });

    test('detects PNG from binary magic bytes', () {
      final pngBytes = Uint8List.fromList([
        0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00,
      ]);
      final result = MimeDetector.detectAndValidate(
        bytes: pngBytes,
        filename: 'id_front.png',
      );
      expect(result.mediaType.type, 'image');
      expect(result.mediaType.subtype, 'png');
      expect(result.mimeTypeString, 'image/png');
      expect(result.extension, '.png');
      expect(result.normalizedFilename, 'id_front.png');
    });

    test('detects WebP from binary magic bytes', () {
      final webpBytes = Uint8List.fromList([
        0x52, 0x49, 0x46, 0x46, // RIFF
        0x20, 0x00, 0x00, 0x00,
        0x57, 0x45, 0x42, 0x50, // WEBP
      ]);
      final result = MimeDetector.detectAndValidate(
        bytes: webpBytes,
        filename: 'photo.webp',
      );
      expect(result.mediaType.type, 'image');
      expect(result.mediaType.subtype, 'webp');
      expect(result.mimeTypeString, 'image/webp');
      expect(result.extension, '.webp');
    });

    test('detects PDF from binary magic bytes', () {
      final pdfBytes = Uint8List.fromList([
        0x25, 0x50, 0x44, 0x46, 0x2D, 0x31, 0x2E, 0x35, // %PDF-1.5
      ]);
      final result = MimeDetector.detectAndValidate(
        bytes: pdfBytes,
        filename: 'sale_deed.pdf',
      );
      expect(result.mediaType.type, 'application');
      expect(result.mediaType.subtype, 'pdf');
      expect(result.mimeTypeString, 'application/pdf');
      expect(result.extension, '.pdf');
    });

    test('normalizes missing or mismatched extension based on detected magic bytes', () {
      final jpegBytes = Uint8List.fromList([
        0xFF, 0xD8, 0xFF, 0xE1, 0x00, 0x18,
      ]);
      // Android camera output without extension
      final result1 = MimeDetector.detectAndValidate(
        bytes: jpegBytes,
        filename: 'scaled_57721e7b-f061-44',
      );
      expect(result1.normalizedFilename, 'scaled_57721e7b-f061-44.jpg');
      expect(result1.mimeTypeString, 'image/jpeg');

      // .jpeg to canonical .jpg
      final result2 = MimeDetector.detectAndValidate(
        bytes: jpegBytes,
        filename: 'pan_card.jpeg',
      );
      expect(result2.normalizedFilename, 'pan_card.jpg');
    });

    test('rejects unrecognized text or data even if named .jpg', () {
      final textBytes = Uint8List.fromList(utf8.encode('some text content'));
      expect(
        () => MimeDetector.detectAndValidate(
          bytes: textBytes,
          filename: 'document.jpg',
        ),
        throwsA(isA<ApiException>().having(
          (e) => e.message,
          'message',
          'Unable to determine the file type. Please choose another image.',
        )),
      );
    });

    test('rejects empty file bytes', () {
      expect(
        () => MimeDetector.detectAndValidate(
          bytes: Uint8List(0),
          filename: 'empty.jpg',
        ),
        throwsA(isA<ApiException>().having(
          (e) => e.message,
          'message',
          'Cannot upload an empty file.',
        )),
      );
    });

    test('rejects completely unknown file type with friendly error', () {
      final randomBytes = Uint8List.fromList([0x01, 0x02, 0x03, 0x04]);
      expect(
        () => MimeDetector.detectAndValidate(
          bytes: randomBytes,
          filename: 'corrupted_file.xyz',
        ),
        throwsA(isA<ApiException>().having(
          (e) => e.message,
          'message',
          'Unable to determine the file type. Please choose another image.',
        )),
      );
    });

    test('ApiClient.uploadFile sends explicit Content-Type and NEVER octet-stream for images', () async {
      http.Request? capturedRequest;
      final mockClient = MockClient((request) async {
        capturedRequest = request;
        return http.Response(
          jsonEncode({
            'document': {
              'id': 'doc-101',
              'title': 'Aadhaar Front',
              'category': 'buyer',
              'party': 'buyer',
              'document_side': 'front',
              'file_size': 1024,
              'original_filename': 'aadhaar_front.jpg',
              'mime_type': 'image/jpeg',
              'download_url': '/api/documents/doc-101/download',
              'created_at': '2026-09-08T12:00:00Z',
            }
          }),
          200,
        );
      });

      final storage = InMemoryTokenStorage();
      await storage.saveTokens(accessToken: 'mock_token', refreshToken: 'mock_refresh');
      final apiClient = ApiClient(
        client: mockClient,
        tokenStorage: storage,
      );

      final jpegBytes = Uint8List.fromList([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10]);
      await apiClient.uploadFile(
        path: '/deals/deal-1/documents',
        fileBytes: jpegBytes,
        filename: 'scaled_capture.jpg',
        fields: {
          'title': 'Aadhaar Front',
          'category': 'buyer',
        },
      );

      expect(capturedRequest, isNotNull);
      final rawBody = latin1.decode(capturedRequest!.bodyBytes);
      expect(
        rawBody.toLowerCase().contains('content-type: image/jpeg'),
        isTrue,
      );
      expect(
        rawBody.toLowerCase().contains('application/octet-stream'),
        isFalse,
      );
      expect(
        rawBody.contains('filename="scaled_capture.jpg"'),
        isTrue,
      );
    });
  });
}
