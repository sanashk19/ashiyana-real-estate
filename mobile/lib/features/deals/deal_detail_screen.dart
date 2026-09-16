import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../core/network/api_client.dart';
import '../../core/theme/app_theme.dart';
import '../../models/deal_model.dart';
import '../../models/checklist_model.dart';
import '../../services/deals_service.dart';
import '../../services/documents_service.dart';
import '../../services/upload_requests_service.dart';
import '../documents/smart_camera_screen.dart';
import '../documents/capture_document_sheet.dart';
import '../requests/request_documents_sheet.dart';

class DealDetailScreen extends StatefulWidget {
  final String dealId;
  final DealsService dealsService;
  final DocumentsService documentsService;
  final UploadRequestsService requestsService;

  const DealDetailScreen({
    super.key,
    required this.dealId,
    required this.dealsService,
    required this.documentsService,
    required this.requestsService,
  });

  @override
  State<DealDetailScreen> createState() => _DealDetailScreenState();
}

class _DealDetailScreenState extends State<DealDetailScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;
  Deal? _deal;
  bool _isLoading = true;
  String? _errorMessage;
  String _selectedDocFilter = 'all';

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    _loadDeal();
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _loadDeal() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final item = await widget.dealsService.getDealById(widget.dealId);
      if (mounted) {
        setState(() {
          _deal = item;
          _isLoading = false;
        });
      }
    } on ApiException catch (e) {
      if (mounted) {
        setState(() {
          _errorMessage = e.message;
          _isLoading = false;
        });
      }
    } catch (_) {
      if (mounted) {
        setState(() {
          _errorMessage = 'Unable to load deal details. Check your connection.';
          _isLoading = false;
        });
      }
    }
  }

  Future<void> _openSmartCameraDirect({
    required String title,
    required String party,
    required String side,
    required String category,
  }) async {
    if (_deal == null) return;
    final uploaded = await Navigator.of(context).push<bool>(
      MaterialPageRoute(
        builder: (_) => SmartCameraScreen(
          dealId: _deal!.id,
          documentTitle: title,
          party: party,
          documentSide: side,
          category: category,
          documentsService: widget.documentsService,
        ),
      ),
    );

    if (uploaded == true && mounted) {
      _loadDeal();
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('$title ($side) uploaded successfully.'),
          backgroundColor: AppTheme.success,
          behavior: SnackBarBehavior.floating,
        ),
      );
    }
  }

  void _openCaptureSheet({String? party, String? title, String? category, String? side}) {
    if (_deal == null) return;
    showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => CaptureDocumentSheet(
        dealId: _deal!.id,
        initialParty: party,
        initialTitle: title,
        initialCategory: category,
        initialSide: side,
        documentsService: widget.documentsService,
        onDocumentUploaded: (_) => _loadDeal(),
      ),
    );
  }

  void _openRequestSheet() {
    if (_deal == null) return;
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => RequestDocumentsSheet(
        deal: _deal!,
        requestsService: widget.requestsService,
        onRequestCreated: (_) => _loadDeal(),
      ),
    );
  }

  Future<void> _makeCall(String? phone) async {
    if (phone == null || phone.isEmpty) return;
    final uri = Uri.parse('tel:${phone.replaceAll(RegExp(r'[^0-9+]'), '')}');
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri);
    }
  }

  Future<void> _openWhatsApp(String? phone, String name) async {
    if (phone == null || phone.isEmpty) return;
    final clean = phone.replaceAll(RegExp(r'[^0-9]'), '');
    final text = 'Hello $name, this is Kassim Shaikh regarding your Ashiyana property deal (${_deal?.dealNumber ?? ''}).';
    final uri = Uri.parse('https://wa.me/$clean?text=${Uri.encodeComponent(text)}');
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    }
  }

  Color _getStatusColor(DealStatus status) {
    switch (status) {
      case DealStatus.inquiry:
        return AppTheme.primary;
      case DealStatus.negotiation:
        return AppTheme.info;
      case DealStatus.agreement:
        return AppTheme.accent;
      case DealStatus.completed:
        return AppTheme.success;
      case DealStatus.cancelled:
        return AppTheme.error;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(
        title: Text(
          _deal?.dealNumber ?? 'Deal Details',
          style: const TextStyle(fontWeight: FontWeight.w700),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh, size: 20),
            onPressed: _loadDeal,
          ),
          IconButton(
            icon: const Icon(Icons.share_outlined, size: 20),
            tooltip: 'Request Documents',
            onPressed: _openRequestSheet,
          ),
        ],
        bottom: TabBar(
          controller: _tabController,
          indicatorColor: AppTheme.accent,
          labelColor: AppTheme.primary,
          unselectedLabelColor: AppTheme.textSecondary,
          labelStyle: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700),
          unselectedLabelStyle: const TextStyle(fontSize: 13, fontWeight: FontWeight.w500),
          tabs: [
            const Tab(text: 'Overview'),
            Tab(text: 'Checklist (${_deal?.receivedDocsCount ?? 0}/${_deal?.totalChecklistCount ?? 0})'),
            Tab(text: 'Documents (${_deal?.documents.length ?? 0})'),
          ],
        ),
      ),
      floatingActionButton: _tabController.index == 2
          ? FloatingActionButton(
              backgroundColor: AppTheme.accent,
              foregroundColor: Colors.white,
              onPressed: () => _openCaptureSheet(),
              child: const Icon(Icons.add),
            )
          : null,
      body: _buildBody(),
    );
  }

  Widget _buildBody() {
    if (_isLoading) {
      return const Center(
        child: CircularProgressIndicator(strokeWidth: 2, color: AppTheme.primary),
      );
    }

    if (_errorMessage != null) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.error_outline, size: 48, color: AppTheme.textMuted),
              const SizedBox(height: 16),
              Text(
                _errorMessage!,
                textAlign: TextAlign.center,
                style: const TextStyle(fontSize: 14, color: AppTheme.textSecondary),
              ),
              const SizedBox(height: 16),
              ElevatedButton(
                onPressed: _loadDeal,
                child: const Text('Retry'),
              ),
            ],
          ),
        ),
      );
    }

    if (_deal == null) return const SizedBox.shrink();

    final d = _deal!;

    return TabBarView(
      controller: _tabController,
      children: [
        _buildOverviewTab(d),
        _buildChecklistTab(d),
        _buildDocumentsTab(d),
      ],
    );
  }

  // 1. Overview Tab (Screen 4 in design direction)
  Widget _buildOverviewTab(Deal d) {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        // Property Hero Card
        Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: _getStatusColor(d.status).withAlpha(25),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Text(
                        d.status.label.toUpperCase(),
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w700,
                          color: _getStatusColor(d.status),
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Flexible(
                      child: Text(
                        '${d.receivedDocsCount} / ${d.totalChecklistCount} Docs Received',
                        style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: AppTheme.textSecondary),
                        overflow: TextOverflow.ellipsis,
                        textAlign: TextAlign.end,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                Text(
                  d.propertyTitle,
                  style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: AppTheme.primary),
                ),
                if (d.propertyLocation.isNotEmpty) ...[
                  const SizedBox(height: 4),
                  Row(
                    children: [
                      const Icon(Icons.location_on_outlined, size: 14, color: AppTheme.textSecondary),
                      const SizedBox(width: 4),
                      Expanded(
                        child: Text(
                          d.propertyLocation,
                          style: const TextStyle(fontSize: 13, color: AppTheme.textSecondary),
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    ],
                  ),
                ],

                // Property Specs Row
                if (d.property != null) ...[
                  const SizedBox(height: 14),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 10),
                    decoration: BoxDecoration(
                      color: AppTheme.accentSubtle,
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceAround,
                      children: [
                        if (d.property!.price > 0)
                          Expanded(
                            child: Column(
                              children: [
                                const Text('PRICE', style: TextStyle(fontSize: 10, color: AppTheme.textMuted, fontWeight: FontWeight.w600)),
                                const SizedBox(height: 2),
                                Text(
                                  'Rs ${(d.property!.price / 10000000).toStringAsFixed(1)} Cr',
                                  style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: AppTheme.primary),
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ],
                            ),
                          ),
                        Expanded(
                          child: Column(
                            children: [
                              const Text('TYPE', style: TextStyle(fontSize: 10, color: AppTheme.textMuted, fontWeight: FontWeight.w600)),
                              const SizedBox(height: 2),
                              Text(
                                d.property!.propertyType.toUpperCase(),
                                style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: AppTheme.primary),
                                overflow: TextOverflow.ellipsis,
                              ),
                            ],
                          ),
                        ),
                        Expanded(
                          child: Column(
                            children: [
                              const Text('DOCS', style: TextStyle(fontSize: 10, color: AppTheme.textMuted, fontWeight: FontWeight.w600)),
                              const SizedBox(height: 2),
                              Text(
                                '${d.documentCount}',
                                style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: AppTheme.primary),
                                overflow: TextOverflow.ellipsis,
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ],
            ),
          ),
        ),
        const SizedBox(height: 12),

        // Buyer Party Card
        _buildPartyCard(
          title: 'Buyer',
          party: d.buyer,
          fallbackName: d.buyerName,
          onCapture: () => _openSmartCameraDirect(
            title: 'Buyer Document',
            party: 'buyer',
            side: 'complete',
            category: 'buyer',
          ),
        ),
        const SizedBox(height: 12),

        // Seller Party Card
        _buildPartyCard(
          title: 'Seller',
          party: d.seller,
          fallbackName: d.sellerName,
          onCapture: () => _openSmartCameraDirect(
            title: 'Seller Document',
            party: 'seller',
            side: 'complete',
            category: 'seller',
          ),
        ),
        const SizedBox(height: 24),
      ],
    );
  }

  Widget _buildPartyCard({
    required String title,
    required DealParty? party,
    required String? fallbackName,
    required VoidCallback onCapture,
  }) {
    final name = party?.name ?? fallbackName ?? 'Not Assigned';
    final phone = party?.phone;
    final email = party?.email;
    final address = party?.address;

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  title.toUpperCase(),
                  style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: AppTheme.accent),
                ),
                InkWell(
                  onTap: onCapture,
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                    child: Row(
                      children: const [
                        Icon(Icons.add_a_photo_outlined, size: 14, color: AppTheme.primary),
                        SizedBox(width: 4),
                        Text('Capture', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
                      ],
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Text(
              name,
              style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700, color: AppTheme.primary),
            ),
            if (phone != null && phone.isNotEmpty) ...[
              const SizedBox(height: 6),
              Row(
                children: [
                  const Icon(Icons.phone_outlined, size: 14, color: AppTheme.textSecondary),
                  const SizedBox(width: 6),
                  Text(phone, style: const TextStyle(fontSize: 13, color: AppTheme.textSecondary)),
                ],
              ),
            ],
            if (email != null && email.isNotEmpty) ...[
              const SizedBox(height: 4),
              Row(
                children: [
                  const Icon(Icons.mail_outline, size: 14, color: AppTheme.textSecondary),
                  const SizedBox(width: 6),
                  Expanded(
                    child: Text(
                      email,
                      style: const TextStyle(fontSize: 13, color: AppTheme.textSecondary),
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                ],
              ),
            ],
            if (address != null && address.isNotEmpty) ...[
              const SizedBox(height: 4),
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Icon(Icons.home_outlined, size: 14, color: AppTheme.textSecondary),
                  const SizedBox(width: 6),
                  Expanded(
                    child: Text(
                      address,
                      style: const TextStyle(fontSize: 13, color: AppTheme.textSecondary),
                    ),
                  ),
                ],
              ),
            ],
            if (phone != null && phone.isNotEmpty) ...[
              const SizedBox(height: 14),
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton.icon(
                      icon: const Icon(Icons.call, size: 14),
                      label: const Text('Call'),
                      onPressed: () => _makeCall(phone),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: ElevatedButton.icon(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF1B5E20),
                      ),
                      icon: const Icon(Icons.chat_bubble_outline, size: 14),
                      label: const Text('WhatsApp'),
                      onPressed: () => _openWhatsApp(phone, name),
                    ),
                  ),
                ],
              ),
            ],
          ],
        ),
      ),
    );
  }

  // 2. Checklist Tab (Screen 5 in design direction)
  Widget _buildChecklistTab(Deal d) {
    final buyerItems = d.checklist.where((i) => i.party.toLowerCase() == 'buyer').toList();
    final sellerItems = d.checklist.where((i) => i.party.toLowerCase() == 'seller').toList();
    final legalItems = d.checklist.where((i) => i.party.toLowerCase() == 'legal').toList();

    return ListView(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      children: [
        if (buyerItems.isNotEmpty) ...[
          _buildChecklistSection('Buyer Documents', buyerItems, 'buyer', d),
          const SizedBox(height: 16),
        ],
        if (sellerItems.isNotEmpty) ...[
          _buildChecklistSection('Seller Documents', sellerItems, 'seller', d),
          const SizedBox(height: 16),
        ],
        if (legalItems.isNotEmpty) ...[
          _buildChecklistSection('Legal & Execution', legalItems, 'legal', d),
          const SizedBox(height: 16),
        ],
      ],
    );
  }

  Widget _buildChecklistSection(
    String sectionTitle,
    List<DealChecklistItem> items,
    String party,
    Deal d,
  ) {
    final completedCount = items.where((i) => i.isReceived).length;

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  sectionTitle,
                  style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: AppTheme.primary),
                ),
                Text(
                  '$completedCount / ${items.length}',
                  style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: AppTheme.accent),
                ),
              ],
            ),
            const SizedBox(height: 10),
            const Divider(height: 1),
            const SizedBox(height: 6),

            ...items.map((item) {
              final titleLower = item.title.toLowerCase();
              final isTwoSided = titleLower.contains('aadhaar') || titleLower.contains('passport') || titleLower.contains('id');

              if (isTwoSided) {
                // Find existing front/back uploads in deal documents
                final docsForParty = d.documents.where((doc) =>
                    doc.party?.toLowerCase() == party.toLowerCase() &&
                    (doc.title.toLowerCase().contains('aadhaar') ||
                        doc.title.toLowerCase().contains('passport') ||
                        doc.title.toLowerCase() == titleLower)).toList();

                final hasFront = docsForParty.any((doc) => doc.documentSide?.toLowerCase() == 'front');
                final hasBack = docsForParty.any((doc) => doc.documentSide?.toLowerCase() == 'back');

                return Column(
                  children: [
                    _buildChecklistRow(
                      title: '${item.title} (Front)',
                      isUploaded: hasFront || item.isReceived,
                      isRequired: item.required,
                      statusLabel: (hasFront || item.isReceived)
                          ? (item.isVerified ? 'Verified' : 'Uploaded')
                          : null,
                      onCapture: () => _openSmartCameraDirect(
                        title: item.title,
                        party: party,
                        side: 'front',
                        category: item.category,
                      ),
                    ),
                    _buildChecklistRow(
                      title: '${item.title} (Back)',
                      isUploaded: hasBack,
                      isRequired: item.required,
                      statusLabel: hasBack ? 'Uploaded' : null,
                      onCapture: () => _openSmartCameraDirect(
                        title: item.title,
                        party: party,
                        side: 'back',
                        category: item.category,
                      ),
                    ),
                  ],
                );
              }

              return _buildChecklistRow(
                title: item.title,
                statusLabel: item.isVerified ? 'Verified' : null,
                isUploaded: item.isReceived,
                isRequired: item.required,
                onCapture: () => _openSmartCameraDirect(
                  title: item.title,
                  party: party,
                  side: 'complete',
                  category: item.category,
                ),
              );
            }),
          ],
        ),
      ),
    );
  }

  Widget _buildChecklistRow({
    required String title,
    required bool isUploaded,
    required bool isRequired,
    required VoidCallback onCapture,
    String? statusLabel,
  }) {
    final displayStatus = statusLabel ?? (isUploaded ? 'Uploaded' : (isRequired ? 'Required' : 'Optional'));
    final isSuccessColor = displayStatus == 'Verified' || displayStatus == 'Uploaded';

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        children: [
          Icon(
            isUploaded ? Icons.check_circle : Icons.radio_button_unchecked,
            color: isUploaded ? AppTheme.success : AppTheme.textMuted,
            size: 20,
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
                ),
                Text(
                  displayStatus,
                  style: TextStyle(
                    fontSize: 11,
                    color: isSuccessColor ? AppTheme.success : AppTheme.textSecondary,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ],
            ),
          ),
          if (!isUploaded)
            TextButton.icon(
              icon: const Icon(Icons.camera_alt_outlined, size: 14),
              label: const Text('Capture', style: TextStyle(fontSize: 11)),
              style: TextButton.styleFrom(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                visualDensity: VisualDensity.compact,
              ),
              onPressed: onCapture,
            ),
        ],
      ),
    );
  }

  // 3. Documents Tab (Screen 6 in design direction)
  Widget _buildDocumentsTab(Deal d) {
    if (d.documents.isEmpty) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.folder_open_outlined, size: 48, color: AppTheme.textMuted),
              const SizedBox(height: 12),
              const Text(
                'No documents in deal vault',
                style: TextStyle(fontSize: 15, fontWeight: FontWeight.w600, color: AppTheme.primary),
              ),
              const SizedBox(height: 6),
              const Text(
                'Capture photos with your camera or request files from client.',
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 13, color: AppTheme.textSecondary),
              ),
              const SizedBox(height: 16),
              ElevatedButton.icon(
                icon: const Icon(Icons.camera_alt_outlined, size: 16),
                label: const Text('Capture Document'),
                onPressed: () => _openSmartCameraDirect(
                  title: 'Deal Document',
                  party: 'buyer',
                  side: 'complete',
                  category: 'buyer',
                ),
              ),
            ],
          ),
        ),
      );
    }

    final filteredDocs = d.documents.where((doc) {
      if (_selectedDocFilter == 'all') return true;
      if (_selectedDocFilter == 'buyer') return doc.party?.toLowerCase() == 'buyer';
      if (_selectedDocFilter == 'seller') return doc.party?.toLowerCase() == 'seller';
      if (_selectedDocFilter == 'legal') return doc.category.toLowerCase() == 'legal';
      return true;
    }).toList();

    return Column(
      children: [
        // Category Filter Pills (Screen 6)
        SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          child: Row(
            children: [
              _buildDocFilterChip('All', 'all'),
              const SizedBox(width: 8),
              _buildDocFilterChip('Buyer', 'buyer'),
              const SizedBox(width: 8),
              _buildDocFilterChip('Seller', 'seller'),
              const SizedBox(width: 8),
              _buildDocFilterChip('Legal', 'legal'),
            ],
          ),
        ),

        Expanded(
          child: ListView.builder(
            padding: const EdgeInsets.fromLTRB(16, 4, 16, 80),
            itemCount: filteredDocs.length,
            itemBuilder: (context, idx) {
              final doc = filteredDocs[idx];
              return Card(
                margin: const EdgeInsets.only(bottom: 8),
                child: ListTile(
                  contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                  leading: Container(
                    width: 44,
                    height: 44,
                    decoration: BoxDecoration(
                      color: doc.isVerified ? AppTheme.successBg : AppTheme.accentSubtle,
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Icon(
                      doc.mimeType.contains('pdf') ? Icons.picture_as_pdf_outlined : Icons.image_outlined,
                      color: doc.isVerified ? AppTheme.success : AppTheme.accent,
                      size: 22,
                    ),
                  ),
                  title: Text(
                    doc.title,
                    style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600),
                  ),
                  subtitle: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const SizedBox(height: 4),
                      Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                            decoration: BoxDecoration(
                              color: AppTheme.borderSubtle,
                              borderRadius: BorderRadius.circular(4),
                            ),
                            child: Text(
                              '${doc.party?.toUpperCase() ?? "GENERAL"} • ${doc.sideDisplay}',
                              style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w600),
                            ),
                          ),
                          const SizedBox(width: 8),
                          Text(
                            doc.formattedSize,
                            style: const TextStyle(fontSize: 11, color: AppTheme.textMuted),
                          ),
                        ],
                      ),
                    ],
                  ),
                  trailing: doc.isVerified
                      ? const Icon(Icons.verified, size: 18, color: AppTheme.success)
                      : Container(
                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                          decoration: BoxDecoration(
                            color: AppTheme.infoBg,
                            borderRadius: BorderRadius.circular(4),
                          ),
                          child: const Text(
                            'Uploaded',
                            style: TextStyle(fontSize: 10, fontWeight: FontWeight.w600, color: AppTheme.info),
                          ),
                        ),
                ),
              );
            },
          ),
        ),
      ],
    );
  }

  Widget _buildDocFilterChip(String label, String value) {
    final isSelected = _selectedDocFilter == value;
    return ChoiceChip(
      label: Text(label, style: const TextStyle(fontSize: 12)),
      selected: isSelected,
      visualDensity: VisualDensity.compact,
      materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
      onSelected: (selected) {
        if (selected) {
          setState(() {
            _selectedDocFilter = value;
          });
        }
      },
    );
  }
}
