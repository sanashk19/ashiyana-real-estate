import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../core/network/api_client.dart';
import '../../core/theme/app_theme.dart';
import '../../models/deal_model.dart';
import '../../models/upload_request_model.dart';
import '../../services/upload_requests_service.dart';

class RequestDocumentsSheet extends StatefulWidget {
  final Deal deal;
  final UploadRequestsService requestsService;
  final void Function(DealUploadRequest request)? onRequestCreated;

  const RequestDocumentsSheet({
    super.key,
    required this.deal,
    required this.requestsService,
    this.onRequestCreated,
  });

  @override
  State<RequestDocumentsSheet> createState() => _RequestDocumentsSheetState();
}

class _RequestDocumentsSheetState extends State<RequestDocumentsSheet> {
  late String _selectedParty;
  final Set<String> _selectedDocs = {};
  final _messageController = TextEditingController();
  bool _isGenerating = false;
  String? _errorMessage;
  DealUploadRequest? _generatedRequest;

  static const List<String> _buyerOptions = [
    'Buyer PAN Card',
    'Buyer Aadhaar / Passport ID',
    'Buyer Photograph',
    'Buyer Address Proof',
  ];

  static const List<String> _sellerOptions = [
    'Seller PAN Card',
    'Seller Aadhaar / Passport ID',
    'Title Search Report / Parent Deeds',
    'Nil Encumbrance / Tax Receipts',
  ];

  @override
  void initState() {
    super.initState();
    _selectedParty = 'buyer';
    _autoSelectMissingDocs();
  }

  void _autoSelectMissingDocs() {
    _selectedDocs.clear();
    final options = _selectedParty == 'buyer' ? _buyerOptions : _sellerOptions;
    final missingInChecklist = widget.deal.checklist
        .where((item) => item.party == _selectedParty && item.isPending)
        .map((item) => item.title)
        .toSet();

    for (final opt in options) {
      if (missingInChecklist.contains(opt)) {
        _selectedDocs.add(opt);
      }
    }

    if (_selectedDocs.isEmpty && options.isNotEmpty) {
      _selectedDocs.add(options.first);
    }
  }

  @override
  void dispose() {
    _messageController.dispose();
    super.dispose();
  }

  Future<void> _handleGenerateLink() async {
    if (_selectedDocs.isEmpty) {
      setState(() {
        _errorMessage = 'Please select at least one document to request.';
      });
      return;
    }

    setState(() {
      _isGenerating = true;
      _errorMessage = null;
    });

    try {
      final req = await widget.requestsService.createUploadRequest(
        dealId: widget.deal.id,
        party: _selectedParty,
        requestedDocs: _selectedDocs.toList(),
        message: _messageController.text.trim().isNotEmpty ? _messageController.text.trim() : null,
      );

      if (!mounted) return;

      setState(() {
        _generatedRequest = req;
      });

      widget.onRequestCreated?.call(req);
    } on ApiException catch (e) {
      setState(() {
        _errorMessage = e.message;
      });
    } catch (_) {
      setState(() {
        _errorMessage = 'Failed to generate secure upload request. Please try again.';
      });
    } finally {
      if (mounted) {
        setState(() {
          _isGenerating = false;
        });
      }
    }
  }

  String _getUploadUrl(DealUploadRequest req) {
    if (req.uploadUrl != null && req.uploadUrl!.isNotEmpty) {
      return req.uploadUrl!;
    }
    return 'http://localhost:5173/upload-documents';
  }

  Future<void> _copyLink(String url) async {
    await Clipboard.setData(ClipboardData(text: url));
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('Secure upload link copied to clipboard.'),
        duration: Duration(seconds: 2),
      ),
    );
  }

  Future<void> _shareOnWhatsApp(String url) async {
    final partyName = _selectedParty == 'buyer'
        ? (widget.deal.buyer?.name ?? 'Client')
        : (widget.deal.seller?.name ?? 'Client');

    final message = 'Hello $partyName, please upload the requested documents for your Ashiyana property deal '
        '(${widget.deal.dealNumber}) using this secure link: $url\n\n'
        'Regards,\nKassim Shaikh\nAshiyana Real Estate';

    final targetPhone = _selectedParty == 'buyer' ? widget.deal.buyer?.phone : widget.deal.seller?.phone;
    final cleanPhone = targetPhone?.replaceAll(RegExp(r'[^0-9]'), '') ?? '';

    final whatsappUri = cleanPhone.isNotEmpty
        ? Uri.parse('https://wa.me/$cleanPhone?text=${Uri.encodeComponent(message)}')
        : Uri.parse('https://wa.me/?text=${Uri.encodeComponent(message)}');

    if (await canLaunchUrl(whatsappUri)) {
      await launchUrl(whatsappUri, mode: LaunchMode.externalApplication);
    } else {
      await _copyLink(url);
    }
  }

  @override
  Widget build(BuildContext context) {
    final options = _selectedParty == 'buyer' ? _buyerOptions : _sellerOptions;

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

            // Header
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text(
                  'Request Client Documents',
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
            const SizedBox(height: 12),

            if (_errorMessage != null) ...[
              Container(
                padding: const EdgeInsets.all(12),
                margin: const EdgeInsets.only(bottom: 16),
                decoration: BoxDecoration(
                  color: AppTheme.errorBg,
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: AppTheme.error.withAlpha(75)),
                ),
                child: Text(
                  _errorMessage!,
                  style: const TextStyle(fontSize: 12, color: AppTheme.error),
                ),
              ),
            ],

            if (_generatedRequest == null) ...[
              // Party Selector
              const Text(
                'Select Party',
                style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: AppTheme.textPrimary),
              ),
              const SizedBox(height: 6),
              Row(
                children: [
                  Expanded(
                    child: ChoiceChip(
                      label: Center(
                        child: Text(
                          'Buyer (${widget.deal.effectiveBuyerName})',
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      selected: _selectedParty == 'buyer',
                      onSelected: (val) {
                        if (val) {
                          setState(() {
                            _selectedParty = 'buyer';
                            _autoSelectMissingDocs();
                          });
                        }
                      },
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: ChoiceChip(
                      label: Center(
                        child: Text(
                          'Seller (${widget.deal.effectiveSellerName})',
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      selected: _selectedParty == 'seller',
                      onSelected: (val) {
                        if (val) {
                          setState(() {
                            _selectedParty = 'seller';
                            _autoSelectMissingDocs();
                          });
                        }
                      },
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),

              // Checklist Checkboxes
              const Text(
                'Requested Documents',
                style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: AppTheme.textPrimary),
              ),
              const SizedBox(height: 6),
              ...options.map((docTitle) {
                final isChecked = _selectedDocs.contains(docTitle);
                return CheckboxListTile(
                  contentPadding: EdgeInsets.zero,
                  dense: true,
                  title: Text(docTitle, style: const TextStyle(fontSize: 13)),
                  value: isChecked,
                  activeColor: AppTheme.primary,
                  onChanged: (val) {
                    setState(() {
                      if (val == true) {
                        _selectedDocs.add(docTitle);
                      } else {
                        _selectedDocs.remove(docTitle);
                      }
                    });
                  },
                );
              }),
              const SizedBox(height: 12),

              // Message field
              const Text(
                'Note to Client (Optional)',
                style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: AppTheme.textPrimary),
              ),
              const SizedBox(height: 6),
              TextFormField(
                controller: _messageController,
                decoration: const InputDecoration(
                  hintText: 'e.g. Please provide clear photos of both sides',
                ),
                maxLines: 2,
              ),
              const SizedBox(height: 20),

              // Generate Action
              SizedBox(
                height: 48,
                child: ElevatedButton(
                  onPressed: _isGenerating ? null : _handleGenerateLink,
                  child: _isGenerating
                      ? const SizedBox(
                          width: 18,
                          height: 18,
                          child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                        )
                      : const Text('Generate Secure Upload Link'),
                ),
              ),
            ] else ...[
              // Generated Link Success Display
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: AppTheme.successBg,
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: AppTheme.success.withAlpha(75)),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: const [
                        Icon(Icons.check_circle_outline, size: 20, color: AppTheme.success),
                        SizedBox(width: 8),
                        Text(
                          'Secure Upload Link Active',
                          style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: AppTheme.success),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'Requested ${_generatedRequest!.requestedDocs.length} items from '
                      '${_generatedRequest!.party.toUpperCase()} • Valid for 48 hours',
                      style: const TextStyle(fontSize: 12, color: AppTheme.textSecondary),
                    ),
                    const SizedBox(height: 12),
                    Container(
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: AppTheme.surface,
                        borderRadius: BorderRadius.circular(6),
                        border: Border.all(color: AppTheme.border),
                      ),
                      child: SelectableText(
                        _getUploadUrl(_generatedRequest!),
                        style: const TextStyle(fontSize: 12, fontFamily: 'monospace', color: AppTheme.textPrimary),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 20),

              // Action Buttons: Copy Link & WhatsApp
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton.icon(
                      icon: const Icon(Icons.copy, size: 16),
                      label: const Text('Copy Link'),
                      onPressed: () => _copyLink(_getUploadUrl(_generatedRequest!)),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: ElevatedButton.icon(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF1B5E20),
                      ),
                      icon: const Icon(Icons.send, size: 16),
                      label: const Text('WhatsApp'),
                      onPressed: () => _shareOnWhatsApp(_getUploadUrl(_generatedRequest!)),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              Center(
                child: TextButton(
                  onPressed: () => Navigator.of(context).pop(),
                  child: const Text('Done'),
                ),
              ),
            ],
            const SizedBox(height: 12),
          ],
        ),
      ),
    );
  }
}
