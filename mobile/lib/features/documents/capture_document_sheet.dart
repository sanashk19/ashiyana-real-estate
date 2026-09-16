import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import '../../core/network/api_client.dart';
import '../../core/theme/app_theme.dart';
import '../../models/document_model.dart';
import '../../services/documents_service.dart';
import 'smart_camera_screen.dart';

class CaptureDocumentSheet extends StatefulWidget {
  final String dealId;
  final DocumentsService documentsService;
  final String? initialCategory;
  final String? initialParty;
  final String? initialTitle;
  final String? initialSide;
  final void Function(DealDocument doc)? onDocumentUploaded;

  const CaptureDocumentSheet({
    super.key,
    required this.dealId,
    required this.documentsService,
    this.initialCategory,
    this.initialParty,
    this.initialTitle,
    this.initialSide,
    this.onDocumentUploaded,
  });

  @override
  State<CaptureDocumentSheet> createState() => _CaptureDocumentSheetState();
}

class _CaptureDocumentSheetState extends State<CaptureDocumentSheet> {
  final _formKey = GlobalKey<FormState>();
  final _picker = ImagePicker();

  late TextEditingController _titleController;
  late String _selectedParty;
  late String _selectedCategory;
  late String _selectedSide;

  Uint8List? _selectedBytes;
  String? _selectedFilename;
  bool _isUploading = false;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    _titleController = TextEditingController(text: widget.initialTitle ?? '');
    _selectedParty = widget.initialParty ?? 'buyer';
    _selectedCategory = widget.initialCategory ?? 'buyer';
    _selectedSide = widget.initialSide ?? 'complete';
  }

  @override
  void dispose() {
    _titleController.dispose();
    super.dispose();
  }

  Future<void> _pickImage(ImageSource source) async {
    setState(() {
      _errorMessage = null;
    });

    try {
      final picked = await _picker.pickImage(
        source: source,
        maxWidth: 2400,
        maxHeight: 2400,
        imageQuality: 92,
      );

      if (picked == null) return;

      final bytes = await picked.readAsBytes();
      final filename = picked.name.isNotEmpty ? picked.name : 'captured_document.jpg';

      setState(() {
        _selectedBytes = bytes;
        _selectedFilename = filename;
      });
    } catch (_) {
      setState(() {
        _errorMessage = 'Unable to access camera or gallery. Please grant device permissions in Settings.';
      });
    }
  }

  Future<void> _openSmartCamera() async {
    final title = _titleController.text.trim().isNotEmpty
        ? _titleController.text.trim()
        : 'Deal Document';

    final uploaded = await Navigator.of(context).push<bool>(
      MaterialPageRoute(
        builder: (_) => SmartCameraScreen(
          dealId: widget.dealId,
          documentTitle: title,
          party: _selectedParty,
          documentSide: _selectedSide,
          category: _selectedCategory,
          documentsService: widget.documentsService,
          onDocumentUploaded: widget.onDocumentUploaded,
        ),
      ),
    );

    if (uploaded == true && mounted) {
      Navigator.of(context).pop(true);
    }
  }

  Future<void> _handleUpload() async {
    if (!_formKey.currentState!.validate()) return;
    if (_selectedBytes == null || _selectedFilename == null) {
      setState(() {
        _errorMessage = 'Please capture a photo or choose an image from your gallery first.';
      });
      return;
    }

    setState(() {
      _isUploading = true;
      _errorMessage = null;
    });

    try {
      final doc = await widget.documentsService.uploadDocument(
        dealId: widget.dealId,
        title: _titleController.text.trim(),
        category: _selectedCategory,
        party: _selectedParty,
        documentSide: _selectedSide,
        fileBytes: _selectedBytes!,
        filename: _selectedFilename!,
      );

      if (!mounted) return;

      widget.onDocumentUploaded?.call(doc);
      Navigator.of(context).pop(true);
    } on ApiException catch (e) {
      setState(() {
        _errorMessage = e.message;
      });
    } catch (_) {
      setState(() {
        _errorMessage = 'Failed to upload document. Please check your network and retry.';
      });
    } finally {
      if (mounted) {
        setState(() {
          _isUploading = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        color: AppTheme.surface,
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      padding: EdgeInsets.only(
        bottom: MediaQuery.of(context).viewInsets.bottom + 20,
        top: 16,
        left: 20,
        right: 20,
      ),
      child: SingleChildScrollView(
        child: Form(
          key: _formKey,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Handle Bar
              Center(
                child: Container(
                  width: 36,
                  height: 4,
                  decoration: BoxDecoration(
                    color: AppTheme.border,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
              const SizedBox(height: 16),

              // Title
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text(
                    'Capture & Upload Document',
                    style: TextStyle(
                      fontSize: 17,
                      fontWeight: FontWeight.w700,
                      color: AppTheme.primary,
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.close, size: 20, color: AppTheme.textSecondary),
                    onPressed: () => Navigator.of(context).pop(),
                  ),
                ],
              ),
              const SizedBox(height: 8),

              if (_errorMessage != null) ...[
                Container(
                  padding: const EdgeInsets.all(12),
                  margin: const EdgeInsets.only(bottom: 16),
                  decoration: BoxDecoration(
                    color: AppTheme.errorBg,
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: AppTheme.error.withAlpha(75)),
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
              ],

              // Document Title
              const Text(
                'Document Title',
                style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: AppTheme.textPrimary),
              ),
              const SizedBox(height: 6),
              TextFormField(
                controller: _titleController,
                decoration: const InputDecoration(
                  hintText: 'e.g. Buyer Aadhaar / Passport ID',
                ),
                validator: (v) => (v == null || v.trim().isEmpty) ? 'Please enter a document title' : null,
              ),
              const SizedBox(height: 16),

              // Party Selection
              const Text(
                'Party',
                style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: AppTheme.textPrimary),
              ),
              const SizedBox(height: 6),
              Row(
                children: [
                  Expanded(
                    child: ChoiceChip(
                      label: const Center(child: Text('Buyer')),
                      selected: _selectedParty == 'buyer',
                      visualDensity: VisualDensity.compact,
                      materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
                      onSelected: (val) {
                        if (val) setState(() => _selectedParty = 'buyer');
                      },
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: ChoiceChip(
                      label: const Center(child: Text('Seller')),
                      selected: _selectedParty == 'seller',
                      visualDensity: VisualDensity.compact,
                      materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
                      onSelected: (val) {
                        if (val) setState(() => _selectedParty = 'seller');
                      },
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),

              // Side Selection
              const Text(
                'Document Side',
                style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: AppTheme.textPrimary),
              ),
              const SizedBox(height: 6),
              Row(
                children: [
                  Expanded(
                    child: ChoiceChip(
                      label: const Center(
                        child: Text(
                          'Complete',
                          style: TextStyle(fontSize: 12),
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      selected: _selectedSide == 'complete',
                      visualDensity: VisualDensity.compact,
                      materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
                      padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 2),
                      onSelected: (val) {
                        if (val) setState(() => _selectedSide = 'complete');
                      },
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: ChoiceChip(
                      label: const Center(
                        child: Text(
                          'Front',
                          style: TextStyle(fontSize: 12),
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      selected: _selectedSide == 'front',
                      visualDensity: VisualDensity.compact,
                      materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
                      padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 2),
                      onSelected: (val) {
                        if (val) setState(() => _selectedSide = 'front');
                      },
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: ChoiceChip(
                      label: const Center(
                        child: Text(
                          'Back',
                          style: TextStyle(fontSize: 12),
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      selected: _selectedSide == 'back',
                      visualDensity: VisualDensity.compact,
                      materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
                      padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 2),
                      onSelected: (val) {
                        if (val) setState(() => _selectedSide = 'back');
                      },
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 20),

              // Image Capture / Choice Buttons
              if (_selectedBytes == null) ...[
                Row(
                  children: [
                    Expanded(
                      child: ElevatedButton.icon(
                        icon: const Icon(Icons.document_scanner_outlined, size: 18),
                        label: const Text('Open Camera'),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppTheme.primary,
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(vertical: 12),
                        ),
                        onPressed: _openSmartCamera,
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: OutlinedButton.icon(
                        icon: const Icon(Icons.photo_library_outlined, size: 18),
                        label: const Text('From Gallery'),
                        style: OutlinedButton.styleFrom(
                          padding: const EdgeInsets.symmetric(vertical: 12),
                        ),
                        onPressed: _isUploading ? null : () => _pickImage(ImageSource.gallery),
                      ),
                    ),
                  ],
                ),
              ] else ...[
                // Image Preview Container
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: AppTheme.accentSubtle,
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: AppTheme.border),
                  ),
                  child: Row(
                    children: [
                      Container(
                        width: 54,
                        height: 54,
                        decoration: BoxDecoration(
                          borderRadius: BorderRadius.circular(6),
                          border: Border.all(color: AppTheme.border),
                        ),
                        clipBehavior: Clip.antiAlias,
                        child: Image.memory(_selectedBytes!, fit: BoxFit.cover),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              _selectedFilename ?? 'Selected Document',
                              style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                            const SizedBox(height: 4),
                            Text(
                              '${(_selectedBytes!.lengthInBytes / 1024).toStringAsFixed(1)} KB • Ready to upload',
                              style: const TextStyle(fontSize: 12, color: AppTheme.textSecondary),
                            ),
                          ],
                        ),
                      ),
                      IconButton(
                        icon: const Icon(Icons.refresh, size: 20, color: AppTheme.primary),
                        tooltip: 'Retake',
                        onPressed: _isUploading ? null : () => _pickImage(ImageSource.camera),
                      ),
                    ],
                  ),
                ),
              ],
              const SizedBox(height: 24),

              // Upload Action Button
              SizedBox(
                height: 48,
                child: ElevatedButton(
                  onPressed: (_isUploading || _selectedBytes == null) ? null : _handleUpload,
                  child: _isUploading
                      ? Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: const [
                            SizedBox(
                              width: 18,
                              height: 18,
                              child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                            ),
                            SizedBox(width: 12),
                            Text('Uploading Document...'),
                          ],
                        )
                      : const Text('Upload to Deal Vault'),
                ),
              ),
              const SizedBox(height: 12),
            ],
          ),
        ),
      ),
    );
  }
}
