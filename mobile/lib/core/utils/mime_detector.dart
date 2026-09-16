import 'dart:typed_data';
import 'package:http_parser/http_parser.dart';
import '../network/api_client.dart';

class MimeDetectionResult {
  final MediaType mediaType;
  final String extension;
  final String normalizedFilename;

  const MimeDetectionResult({
    required this.mediaType,
    required this.extension,
    required this.normalizedFilename,
  });

  String get mimeTypeString => mediaType.mimeType;
}

class MimeDetector {
  static const String unsupportedFileMessage =
      'Unable to determine the file type. Please choose another image.';

  static bool isJpeg(Uint8List bytes) {
    return bytes.length >= 3 &&
        bytes[0] == 0xFF &&
        bytes[1] == 0xD8 &&
        bytes[2] == 0xFF;
  }

  static bool isPng(Uint8List bytes) {
    return bytes.length >= 8 &&
        bytes[0] == 0x89 &&
        bytes[1] == 0x50 &&
        bytes[2] == 0x4E &&
        bytes[3] == 0x47;
  }

  static bool isWebp(Uint8List bytes) {
    if (bytes.length < 12) return false;
    final isRiff = bytes[0] == 0x52 &&
        bytes[1] == 0x49 &&
        bytes[2] == 0x46 &&
        bytes[3] == 0x46; // RIFF
    final isWebp = bytes[8] == 0x57 &&
        bytes[9] == 0x45 &&
        bytes[10] == 0x42 &&
        bytes[11] == 0x50; // WEBP
    return isRiff && isWebp;
  }

  static bool isPdf(Uint8List bytes) {
    return bytes.length >= 4 &&
        bytes[0] == 0x25 &&
        bytes[1] == 0x50 &&
        bytes[2] == 0x44 &&
        bytes[3] == 0x46; // %PDF
  }

  static MimeDetectionResult detectAndValidate({
    required Uint8List bytes,
    required String filename,
  }) {
    if (bytes.isEmpty) {
      throw ApiException(
        statusCode: 400,
        message: 'Cannot upload an empty file.',
      );
    }

    MediaType? resolvedMediaType;
    String? resolvedExtension;

    // 1. Authoritative check: binary magic bytes inspection
    if (isJpeg(bytes)) {
      resolvedMediaType = MediaType('image', 'jpeg');
      resolvedExtension = '.jpg';
    } else if (isPng(bytes)) {
      resolvedMediaType = MediaType('image', 'png');
      resolvedExtension = '.png';
    } else if (isWebp(bytes)) {
      resolvedMediaType = MediaType('image', 'webp');
      resolvedExtension = '.webp';
    } else if (isPdf(bytes)) {
      resolvedMediaType = MediaType('application', 'pdf');
      resolvedExtension = '.pdf';
    } else {
      throw ApiException(
        statusCode: 400,
        message: unsupportedFileMessage,
      );
    }

    // 2. Normalize filename so extension strictly matches detected MIME type
    final cleanFilename = filename.trim();
    String normalized = cleanFilename;
    final dotIndex = cleanFilename.lastIndexOf('.');
    if (dotIndex != -1) {
      final base = cleanFilename.substring(0, dotIndex);
      normalized = '$base$resolvedExtension';
    } else {
      normalized = '$cleanFilename$resolvedExtension';
    }

    return MimeDetectionResult(
      mediaType: resolvedMediaType,
      extension: resolvedExtension,
      normalizedFilename: normalized,
    );
  }
}
