import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import '../../core/network/api_client.dart';
import '../../core/theme/app_theme.dart';
import '../../models/document_model.dart';
import '../../services/documents_service.dart';

class SmartCameraScreen extends StatefulWidget {
  final String dealId;
  final String documentTitle;
  final String party;
  final String documentSide; // 'front', 'back', 'complete'
  final String category;
  final DocumentsService documentsService;
  final void Function(DealDocument doc)? onDocumentUploaded;

  const SmartCameraScreen({
    super.key,
    required this.dealId,
    required this.documentTitle,
    required this.party,
    required this.documentSide,
    required this.category,
    required this.documentsService,
    this.onDocumentUploaded,
  });

  @override
  State<SmartCameraScreen> createState() => _SmartCameraScreenState();
}

class _SmartCameraScreenState extends State<SmartCameraScreen> {
  final ImagePicker _picker = ImagePicker();

  Uint8List? _capturedBytes;
  String? _capturedFilename;
  bool _isUploading = false;
  String? _errorMessage;

  String get _sideLabel {
    switch (widget.documentSide.toLowerCase()) {
      case 'front':
        return 'Front Side';
      case 'back':
        return 'Back Side';
      case 'complete':
      default:
        return 'Complete';
    }
  }

  Future<void> _capturePhoto() async {
    setState(() {
      _errorMessage = null;
    });

    try {
      final photo = await _picker.pickImage(
        source: ImageSource.camera,
        maxWidth: 2400,
        maxHeight: 2400,
        imageQuality: 92,
      );

      if (photo == null) return;

      final bytes = await photo.readAsBytes();
      final filename = photo.name.isNotEmpty ? photo.name : 'captured_document.jpg';

      setState(() {
        _capturedBytes = bytes;
        _capturedFilename = filename;
      });
    } catch (_) {
      setState(() {
        _errorMessage = 'Unable to access device camera. Please check app permissions.';
      });
    }
  }

  Future<void> _pickFromGallery() async {
    setState(() {
      _errorMessage = null;
    });

    try {
      final image = await _picker.pickImage(
        source: ImageSource.gallery,
        maxWidth: 2400,
        maxHeight: 2400,
        imageQuality: 92,
      );

      if (image == null) return;

      final bytes = await image.readAsBytes();
      final filename = image.name.isNotEmpty ? image.name : 'gallery_document.jpg';

      setState(() {
        _capturedBytes = bytes;
        _capturedFilename = filename;
      });
    } catch (_) {
      setState(() {
        _errorMessage = 'Unable to access photo gallery. Please check app permissions.';
      });
    }
  }

  void _retakePhoto() {
    setState(() {
      _capturedBytes = null;
      _capturedFilename = null;
      _errorMessage = null;
    });
  }

  Future<void> _uploadDocument() async {
    if (_capturedBytes == null || _capturedFilename == null) return;

    setState(() {
      _isUploading = true;
      _errorMessage = null;
    });

    try {
      final doc = await widget.documentsService.uploadDocument(
        dealId: widget.dealId,
        title: widget.documentTitle,
        category: widget.category,
        party: widget.party,
        documentSide: widget.documentSide,
        fileBytes: _capturedBytes!,
        filename: _capturedFilename!,
      );

      if (!mounted) return;

      widget.onDocumentUploaded?.call(doc);
      Navigator.of(context).pop(true);
    } on ApiException catch (e) {
      if (mounted) {
        setState(() {
          _errorMessage = e.message;
          _isUploading = false;
        });
      }
    } catch (_) {
      if (mounted) {
        setState(() {
          _errorMessage = 'Upload failed. Please check your connection and retry.';
          _isUploading = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      body: SafeArea(
        child: _capturedBytes != null ? _buildPreviewView() : _buildCameraView(),
      ),
    );
  }

  Widget _buildCameraView() {
    return Column(
      children: [
        // Top Bar
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              IconButton(
                icon: const Icon(Icons.close, color: Colors.white, size: 24),
                onPressed: () => Navigator.of(context).pop(),
              ),
              Column(
                children: [
                  Text(
                    widget.documentTitle,
                    style: const TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w700,
                      color: Colors.white,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    '${widget.party.toUpperCase()} • $_sideLabel',
                    style: const TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                      color: AppTheme.accentLight,
                    ),
                  ),
                ],
              ),
              const SizedBox(width: 48), // Balances close icon
            ],
          ),
        ),

        if (_errorMessage != null)
          Container(
            margin: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
            decoration: BoxDecoration(
              color: AppTheme.errorBg,
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: AppTheme.error),
            ),
            child: Row(
              children: [
                const Icon(Icons.error_outline, size: 18, color: AppTheme.error),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    _errorMessage!,
                    style: const TextStyle(fontSize: 12, color: AppTheme.error),
                  ),
                ),
              ],
            ),
          ),

        // Center Viewfinder with Rectangular Document Frame
        Expanded(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Expanded(
                  child: Center(
                    child: AspectRatio(
                      aspectRatio: 1.58, // Standard ID Card ratio
                  child: Container(
                    decoration: BoxDecoration(
                      color: const Color(0xFF181D26),
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: Colors.white.withAlpha(200), width: 2),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withAlpha(120),
                          blurRadius: 20,
                        ),
                      ],
                    ),
                    child: Stack(
                      children: [
                        // Corner Guides
                        Positioned(
                          top: 12,
                          left: 12,
                          child: _buildCornerGuide(isTop: true, isLeft: true),
                        ),
                        Positioned(
                          top: 12,
                          right: 12,
                          child: _buildCornerGuide(isTop: true, isLeft: false),
                        ),
                        Positioned(
                          bottom: 12,
                          left: 12,
                          child: _buildCornerGuide(isTop: false, isLeft: true),
                        ),
                        Positioned(
                          bottom: 12,
                          right: 12,
                          child: _buildCornerGuide(isTop: false, isLeft: false),
                        ),

                        // Center Icon & Prompt
                        Center(
                          child: Column(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(
                                Icons.document_scanner_outlined,
                                size: 48,
                                color: Colors.white.withAlpha(160),
                              ),
                              const SizedBox(height: 10),
                              Text(
                                widget.documentTitle,
                                style: const TextStyle(
                                  fontSize: 14,
                                  fontWeight: FontWeight.w600,
                                  color: Colors.white,
                                ),
                              ),
                              const SizedBox(height: 4),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                                decoration: BoxDecoration(
                                  color: AppTheme.accent.withAlpha(60),
                                  borderRadius: BorderRadius.circular(4),
                                ),
                                child: Text(
                                  _sideLabel.toUpperCase(),
                                  style: const TextStyle(
                                    fontSize: 11,
                                    fontWeight: FontWeight.w700,
                                    color: AppTheme.accentLight,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
            const SizedBox(height: 16),
            const Text(
                  'Position the entire document inside the frame.',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontSize: 13,
                    color: Color(0xFF9CA3AF),
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ],
            ),
          ),
        ),

        // Bottom Controls
        Padding(
          padding: const EdgeInsets.fromLTRB(32, 12, 32, 28),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              // Gallery button
              IconButton(
                icon: const Icon(Icons.photo_library_outlined, color: Colors.white, size: 28),
                tooltip: 'From Gallery',
                onPressed: _pickFromGallery,
              ),

              // Large Capture Button
              GestureDetector(
                onTap: _capturePhoto,
                child: Container(
                  width: 72,
                  height: 72,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    border: Border.all(color: Colors.white, width: 4),
                  ),
                  child: Center(
                    child: Container(
                      width: 58,
                      height: 58,
                      decoration: const BoxDecoration(
                        color: Colors.white,
                        shape: BoxShape.circle,
                      ),
                    ),
                  ),
                ),
              ),

              // Alternate action / spacer
              IconButton(
                icon: const Icon(Icons.camera_alt_outlined, color: Colors.white70, size: 26),
                tooltip: 'Take Photo',
                onPressed: _capturePhoto,
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildPreviewView() {
    return Column(
      children: [
        // Top Bar
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              IconButton(
                icon: const Icon(Icons.arrow_back, color: Colors.white, size: 24),
                onPressed: _isUploading ? null : _retakePhoto,
              ),
              Column(
                children: [
                  const Text(
                    'Preview & Upload',
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w700,
                      color: Colors.white,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    '${widget.documentTitle} • $_sideLabel',
                    style: const TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w500,
                      color: Color(0xFFD1D5DB),
                    ),
                  ),
                ],
              ),
              const SizedBox(width: 48),
            ],
          ),
        ),

        if (_errorMessage != null)
          Container(
            margin: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
            decoration: BoxDecoration(
              color: AppTheme.errorBg,
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: AppTheme.error),
            ),
            child: Row(
              children: [
                const Icon(Icons.error_outline, size: 18, color: AppTheme.error),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    _errorMessage!,
                    style: const TextStyle(fontSize: 12, color: AppTheme.error),
                  ),
                ),
              ],
            ),
          ),

        // Document Preview
        Expanded(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
            child: Center(
              child: AspectRatio(
                aspectRatio: 1.58,
                child: Container(
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: AppTheme.accent, width: 2),
                  ),
                  clipBehavior: Clip.antiAlias,
                  child: Image.memory(
                    _capturedBytes!,
                    fit: BoxFit.cover,
                  ),
                ),
              ),
            ),
          ),
        ),

        // Action Buttons: Retake vs Upload
        Padding(
          padding: const EdgeInsets.fromLTRB(24, 12, 24, 28),
          child: Row(
            children: [
              Expanded(
                child: OutlinedButton(
                  onPressed: _isUploading ? null : _retakePhoto,
                  style: OutlinedButton.styleFrom(
                    foregroundColor: Colors.white,
                    side: const BorderSide(color: Colors.white38),
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  ),
                  child: const Text(
                    'Retake',
                    style: TextStyle(fontSize: 15, fontWeight: FontWeight.w600),
                  ),
                ),
              ),
              const SizedBox(width: 14),
              Expanded(
                flex: 2,
                child: ElevatedButton(
                  onPressed: _isUploading ? null : _uploadDocument,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppTheme.accent,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  ),
                  child: _isUploading
                      ? const SizedBox(
                          height: 20,
                          width: 20,
                          child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                        )
                      : const Text(
                          'Upload',
                          style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700),
                        ),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildCornerGuide({required bool isTop, required bool isLeft}) {
    return Container(
      width: 24,
      height: 24,
      decoration: BoxDecoration(
        border: Border(
          top: isTop ? const BorderSide(color: Colors.white, width: 3) : BorderSide.none,
          bottom: !isTop ? const BorderSide(color: Colors.white, width: 3) : BorderSide.none,
          left: isLeft ? const BorderSide(color: Colors.white, width: 3) : BorderSide.none,
          right: !isLeft ? const BorderSide(color: Colors.white, width: 3) : BorderSide.none,
        ),
      ),
    );
  }
}
