import 'package:flutter/material.dart';
import '../../core/theme/app_theme.dart';
import '../../models/deal_model.dart';
import '../../services/deals_service.dart';
import '../../services/documents_service.dart';
import '../../services/upload_requests_service.dart';
import 'deal_detail_screen.dart';

class DealsListScreen extends StatefulWidget {
  final DealsService dealsService;
  final DocumentsService documentsService;
  final UploadRequestsService requestsService;

  const DealsListScreen({
    super.key,
    required this.dealsService,
    required this.documentsService,
    required this.requestsService,
  });

  @override
  State<DealsListScreen> createState() => _DealsListScreenState();
}

class _DealsListScreenState extends State<DealsListScreen> {
  final _searchController = TextEditingController();
  List<Deal> _allDeals = [];
  List<Deal> _filteredDeals = [];
  bool _isLoading = true;
  String? _errorMessage;
  String _selectedStatus = 'all';

  @override
  void initState() {
    super.initState();
    _loadDeals();
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _loadDeals() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final items = await widget.dealsService.getDeals(
        search: _searchController.text.trim(),
      );
      if (mounted) {
        setState(() {
          _allDeals = items;
          _applyFilter();
          _isLoading = false;
        });
      }
    } catch (_) {
      if (mounted) {
        setState(() {
          _errorMessage = 'Unable to load deals list. Please check your connection.';
          _isLoading = false;
        });
      }
    }
  }

  void _applyFilter() {
    switch (_selectedStatus) {
      case 'active':
        _filteredDeals = _allDeals.where((d) => d.status.isActive).toList();
        break;
      case 'negotiation':
        _filteredDeals = _allDeals.where((d) => d.status == DealStatus.negotiation).toList();
        break;
      case 'agreement':
        _filteredDeals = _allDeals.where((d) => d.status == DealStatus.agreement).toList();
        break;
      case 'closed':
        _filteredDeals = _allDeals.where((d) => d.status == DealStatus.completed).toList();
        break;
      case 'cancelled':
        _filteredDeals = _allDeals.where((d) => d.status == DealStatus.cancelled).toList();
        break;
      case 'all':
      default:
        _filteredDeals = List.from(_allDeals);
        break;
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
        title: const Text(
          'Deals Workspace',
          style: TextStyle(fontWeight: FontWeight.w700),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh, size: 20),
            onPressed: _loadDeals,
          ),
        ],
      ),
      body: Column(
        children: [
          // Search Box (Screen 3 in design direction)
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 8),
            child: TextField(
              controller: _searchController,
              decoration: InputDecoration(
                hintText: 'Search by property, buyer or deal no.',
                prefixIcon: const Icon(Icons.search, size: 20, color: AppTheme.textSecondary),
                suffixIcon: _searchController.text.isNotEmpty
                    ? IconButton(
                        icon: const Icon(Icons.clear, size: 18),
                        onPressed: () {
                          _searchController.clear();
                          _loadDeals();
                        },
                      )
                    : null,
              ),
              onSubmitted: (_) => _loadDeals(),
            ),
          ),

          // Horizontally scrollable status filter chips
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            physics: const BouncingScrollPhysics(),
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
            child: Row(
              children: [
                _buildFilterChip('All', 'all'),
                const SizedBox(width: 8),
                _buildFilterChip('Active', 'active'),
                const SizedBox(width: 8),
                _buildFilterChip('Negotiation', 'negotiation'),
                const SizedBox(width: 8),
                _buildFilterChip('Agreement', 'agreement'),
                const SizedBox(width: 8),
                _buildFilterChip('Closed', 'closed'),
                const SizedBox(width: 8),
                _buildFilterChip('Cancelled', 'cancelled'),
              ],
            ),
          ),
          const SizedBox(height: 6),

          // Content
          Expanded(
            child: RefreshIndicator(
              onRefresh: _loadDeals,
              color: AppTheme.primary,
              child: _buildBody(),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildFilterChip(String label, String value) {
    final isSelected = _selectedStatus == value;
    return ChoiceChip(
      label: Text(
        label,
        style: TextStyle(
          fontSize: 12,
          fontWeight: isSelected ? FontWeight.w600 : FontWeight.w500,
        ),
      ),
      selected: isSelected,
      visualDensity: VisualDensity.compact,
      materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
      onSelected: (selected) {
        if (selected) {
          setState(() {
            _selectedStatus = value;
            _applyFilter();
          });
        }
      },
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
              const Icon(Icons.wifi_off_outlined, size: 48, color: AppTheme.textMuted),
              const SizedBox(height: 16),
              Text(
                _errorMessage!,
                textAlign: TextAlign.center,
                style: const TextStyle(fontSize: 14, color: AppTheme.textSecondary),
              ),
              const SizedBox(height: 16),
              ElevatedButton(
                onPressed: _loadDeals,
                child: const Text('Retry'),
              ),
            ],
          ),
        ),
      );
    }

    if (_filteredDeals.isEmpty) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.inventory_2_outlined, size: 48, color: AppTheme.textMuted),
              const SizedBox(height: 16),
              Text(
                _selectedStatus == 'all' ? 'No deals found' : 'No deals matching this filter',
                style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600, color: AppTheme.primary),
              ),
              const SizedBox(height: 6),
              const Text(
                'Deals created on the Broker Portal will appear here.',
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 13, color: AppTheme.textSecondary),
              ),
            ],
          ),
        ),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      itemCount: _filteredDeals.length,
      itemBuilder: (context, idx) {
        final deal = _filteredDeals[idx];
        return Card(
          margin: const EdgeInsets.only(bottom: 10),
          child: InkWell(
            borderRadius: BorderRadius.circular(12),
            onTap: () async {
              await Navigator.of(context).push(
                MaterialPageRoute(
                  builder: (_) => DealDetailScreen(
                    dealId: deal.id,
                    dealsService: widget.dealsService,
                    documentsService: widget.documentsService,
                    requestsService: widget.requestsService,
                  ),
                ),
              );
              _loadDeals();
            },
            child: Padding(
              padding: const EdgeInsets.all(12),
              child: Row(
                children: [
                  // Property Thumbnail
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

                  // Deal Details
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
                                  fontSize: 14,
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
                        const SizedBox(height: 4),
                        Text(
                          deal.documentCountDisplay,
                          style: const TextStyle(fontSize: 11, color: AppTheme.textMuted),
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
      },
    );
  }
}
