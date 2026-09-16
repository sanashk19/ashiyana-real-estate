import 'package:flutter/material.dart';
import '../../core/theme/app_theme.dart';
import '../../models/user_model.dart';
import '../../services/auth_service.dart';
import '../../services/deals_service.dart';
import '../../services/documents_service.dart';
import '../../services/upload_requests_service.dart';
import '../auth/login_screen.dart';
import '../home/home_screen.dart';
import '../deals/deals_list_screen.dart';
import '../profile/profile_screen.dart';

class MainScaffold extends StatefulWidget {
  final AuthService authService;
  final BrokerUser initialUser;

  const MainScaffold({
    super.key,
    required this.authService,
    required this.initialUser,
  });

  @override
  State<MainScaffold> createState() => _MainScaffoldState();
}

class _MainScaffoldState extends State<MainScaffold> {
  int _currentIndex = 0;
  late final DealsService _dealsService;
  late final DocumentsService _documentsService;
  late final UploadRequestsService _requestsService;

  @override
  void initState() {
    super.initState();
    final client = widget.authService.apiClient;
    client.onSessionExpired = _handleSessionExpired;

    _dealsService = DealsService(apiClient: client);
    _documentsService = DocumentsService(apiClient: client);
    _requestsService = UploadRequestsService(apiClient: client);
  }

  void _handleSessionExpired() {
    if (!mounted) return;
    Navigator.of(context).pushAndRemoveUntil(
      MaterialPageRoute(
        builder: (_) => LoginScreen(authService: widget.authService),
      ),
      (route) => false,
    );
  }

  @override
  Widget build(BuildContext context) {
    final screens = [
      HomeScreen(
        user: widget.initialUser,
        dealsService: _dealsService,
        documentsService: _documentsService,
        requestsService: _requestsService,
        onNavigateTab: (idx) => setState(() => _currentIndex = idx),
      ),
      DealsListScreen(
        dealsService: _dealsService,
        documentsService: _documentsService,
        requestsService: _requestsService,
      ),
      ProfileScreen(
        user: widget.initialUser,
        authService: widget.authService,
      ),
    ];

    return Scaffold(
      body: IndexedStack(
        index: _currentIndex,
        children: screens,
      ),
      bottomNavigationBar: Container(
        decoration: const BoxDecoration(
          color: AppTheme.surface,
          border: Border(top: BorderSide(color: AppTheme.border, width: 1)),
        ),
        child: BottomNavigationBar(
          currentIndex: _currentIndex,
          onTap: (idx) => setState(() => _currentIndex = idx),
          backgroundColor: AppTheme.surface,
          elevation: 0,
          selectedItemColor: AppTheme.primary,
          unselectedItemColor: AppTheme.textSecondary,
          selectedLabelStyle: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600),
          unselectedLabelStyle: const TextStyle(fontSize: 12),
          type: BottomNavigationBarType.fixed,
          items: const [
            BottomNavigationBarItem(
              icon: Icon(Icons.home_outlined),
              activeIcon: Icon(Icons.home),
              label: 'Home',
            ),
            BottomNavigationBarItem(
              icon: Icon(Icons.business_center_outlined),
              activeIcon: Icon(Icons.business_center),
              label: 'Deals',
            ),
            BottomNavigationBarItem(
              icon: Icon(Icons.person_outline),
              activeIcon: Icon(Icons.person),
              label: 'Profile',
            ),
          ],
        ),
      ),
    );
  }
}
