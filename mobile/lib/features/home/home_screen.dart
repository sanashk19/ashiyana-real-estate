import 'package:flutter/material.dart';
import '../../core/theme/app_theme.dart';
import '../../models/user_model.dart';
import '../../models/deal_model.dart';
import '../../services/deals_service.dart';
import '../../services/documents_service.dart';
import '../../services/upload_requests_service.dart';
import '../deals/deal_detail_screen.dart';

class HomeScreen extends StatefulWidget {
  final BrokerUser user;
  final DealsService dealsService;
  final DocumentsService documentsService;
  final UploadRequestsService requestsService;
  final void Function(int tabIndex)? onNavigateTab;

  const HomeScreen({
    super.key,
    required this.user,
    required this.dealsService,
    required this.documentsService,
    required this.requestsService,
    this.onNavigateTab,
  });

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  List<Deal> _allDeals = [];
  List<Deal> _recentDeals = [];
  bool _isLoading = true;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    _loadRecentDeals();
  }

  String _getGreeting() {
    final hour = DateTime.now().hour;
    if (hour < 12) return 'Good morning,';
    if (hour < 17) return 'Good afternoon,';
    return 'Good evening,';
  }

  Future<void> _loadRecentDeals() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      // Fetch deals without invalid query parameters; filter active deals locally
      final items = await widget.dealsService.getDeals();
      final activeDeals = items.where((deal) => deal.status.isActive).toList();
      if (mounted) {
        setState(() {
          _allDeals = items;
          _recentDeals = activeDeals.take(6).toList();
          _isLoading = false;
        });
      }
    } catch (_) {
      if (mounted) {
        setState(() {
          _errorMessage = 'Unable to load active deals. Check your connection.';
          _isLoading = false;
        });
      }
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
    final firstName = widget.user.fullName.split(' ').first;
    final activeCount = _allDeals.where((d) => d.status.isActive).length;
    final totalDocsCount = _allDeals.fold<int>(0, (sum, d) => sum + d.documentCount);

    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(
        titleSpacing: 16,
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              _getGreeting(),
              style: const TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w500,
                color: AppTheme.textSecondary,
              ),
            ),
            Text(
              firstName,
              style: const TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.w800,
                color: AppTheme.primary,
                letterSpacing: -0.5,
              ),
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh, size: 20),
            onPressed: _loadRecentDeals,
          ),
          Padding(
            padding: const EdgeInsets.only(right: 16, left: 4),
            child: InkWell(
              onTap: () => widget.onNavigateTab?.call(3), // Navigate to Profile
              borderRadius: BorderRadius.circular(18),
              child: Container(
                width: 36,
                height: 36,
                decoration: BoxDecoration(
                  color: AppTheme.primary,
                  shape: BoxShape.circle,
                  border: Border.all(color: AppTheme.accent, width: 1.5),
                ),
                alignment: Alignment.center,
                child: Text(
                  firstName.isNotEmpty ? firstName[0].toUpperCase() : 'K',
                  style: const TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w700,
                    color: Colors.white,
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: _loadRecentDeals,
        color: AppTheme.primary,
        child: ListView(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          children: [
            // Summary Cards Row (Screen 2 in design direction)
            Row(
              children: [
                Expanded(
                  child: _buildSummaryCard(
                    icon: Icons.assignment_outlined,
                    title: 'Deals',
                    subtitle: '$activeCount active',
                    onTap: () => widget.onNavigateTab?.call(1),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: _buildSummaryCard(
                    icon: Icons.folder_outlined,
                    title: 'Documents',
                    subtitle: '$totalDocsCount attached',
                    onTap: () => widget.onNavigateTab?.call(1),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 20),

            // Section Header: Recent Deals
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text(
                  'Recent Deals',
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w700,
                    color: AppTheme.primary,
                  ),
                ),
                TextButton(
                  onPressed: () => widget.onNavigateTab?.call(1),
                  child: const Text('View all', style: TextStyle(fontSize: 13)),
                ),
              ],
            ),
            const SizedBox(height: 8),

            // Deals List
            if (_isLoading) ...[
              const SizedBox(height: 40),
              const Center(
                child: CircularProgressIndicator(strokeWidth: 2, color: AppTheme.primary),
              ),
            ] else if (_errorMessage != null) ...[
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: AppTheme.surface,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: AppTheme.border),
                ),
                child: Column(
                  children: [
                    const Icon(Icons.wifi_off_outlined, size: 32, color: AppTheme.textMuted),
                    const SizedBox(height: 8),
                    Text(
                      _errorMessage!,
                      textAlign: TextAlign.center,
                      style: const TextStyle(fontSize: 13, color: AppTheme.textSecondary),
                    ),
                    const SizedBox(height: 12),
                    ElevatedButton(
                      onPressed: _loadRecentDeals,
                      child: const Text('Retry'),
                    ),
                  ],
                ),
              ),
            ] else if (_recentDeals.isEmpty) ...[
              Container(
                padding: const EdgeInsets.all(24),
                decoration: BoxDecoration(
                  color: AppTheme.surface,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: AppTheme.border),
                ),
                child: Column(
                  children: const [
                    Icon(Icons.inventory_2_outlined, size: 36, color: AppTheme.textMuted),
                    SizedBox(height: 12),
                    Text(
                      'No active deals',
                      style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: AppTheme.primary),
                    ),
                    SizedBox(height: 4),
                    Text(
                      'Active transaction pipelines will appear here.',
                      style: TextStyle(fontSize: 12, color: AppTheme.textSecondary),
                    ),
                  ],
                ),
              ),
            ] else ...[
              ..._recentDeals.map((deal) {
                return Card(
                  margin: const EdgeInsets.only(bottom: 10),
                  child: InkWell(
                    borderRadius: BorderRadius.circular(12),
                    onTap: () {
                      Navigator.of(context).push(
                        MaterialPageRoute(
                          builder: (_) => DealDetailScreen(
                            dealId: deal.id,
                            dealsService: widget.dealsService,
                            documentsService: widget.documentsService,
                            requestsService: widget.requestsService,
                          ),
                        ),
                      );
                    },
                    child: Padding(
                      padding: const EdgeInsets.all(12),
                      child: Row(
                        children: [
                          // Property Thumbnail / Icon
                          Container(
                            width: 60,
                            height: 60,
                            decoration: BoxDecoration(
                              color: AppTheme.accentSubtle,
                              borderRadius: BorderRadius.circular(8),
                              border: Border.all(color: AppTheme.border),
                            ),
                            clipBehavior: Clip.antiAlias,
                            child: deal.property?.thumbnailUrl != null && deal.property!.thumbnailUrl!.isNotEmpty
                                ? Image.network(
                                    deal.property!.thumbnailUrl!,
                                    fit: BoxFit.cover,
                                    errorBuilder: (context, error, stackTrace) => const Center(
                                      child: Icon(Icons.villa_outlined, size: 24, color: AppTheme.accent),
                                    ),
                                  )
                                : const Center(
                                    child: Icon(Icons.villa_outlined, size: 24, color: AppTheme.accent),
                                  ),
                          ),
                          const SizedBox(width: 12),

                          // Deal Information
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  children: [
                                    Expanded(
                                      child: Text(
                                        deal.dealNumber,
                                        style: const TextStyle(
                                          fontSize: 13,
                                          fontWeight: FontWeight.w700,
                                          color: AppTheme.primary,
                                        ),
                                        overflow: TextOverflow.ellipsis,
                                      ),
                                    ),
                                    const SizedBox(width: 6),
                                    Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                      decoration: BoxDecoration(
                                        color: _getStatusColor(deal.status).withAlpha(20),
                                        borderRadius: BorderRadius.circular(4),
                                      ),
                                      child: Text(
                                        deal.status.label,
                                        style: TextStyle(
                                          fontSize: 10,
                                          fontWeight: FontWeight.w700,
                                          color: _getStatusColor(deal.status),
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 4),
                                Text(
                                  deal.propertyTitle,
                                  style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                ),
                                const SizedBox(height: 2),
                                Text(
                                  'Buyer: ${deal.effectiveBuyerName}',
                                  style: const TextStyle(fontSize: 12, color: AppTheme.textSecondary),
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(width: 6),
                          const Icon(Icons.chevron_right, size: 18, color: AppTheme.textMuted),
                        ],
                      ),
                    ),
                  ),
                );
              }),
            ],
            const SizedBox(height: 20),
          ],
        ),
      ),
    );
  }

  Widget _buildSummaryCard({
    required IconData icon,
    required String title,
    required String subtitle,
    required VoidCallback onTap,
  }) {
    return Card(
      child: InkWell(
        borderRadius: BorderRadius.circular(12),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            children: [
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: AppTheme.accentSubtle,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Icon(icon, color: AppTheme.primary, size: 22),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title,
                      style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700, color: AppTheme.primary),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      subtitle,
                      style: const TextStyle(fontSize: 12, color: AppTheme.textSecondary, fontWeight: FontWeight.w500),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
