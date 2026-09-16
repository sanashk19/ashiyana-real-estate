import 'package:flutter/material.dart';
import '../../core/config/env_config.dart';
import '../../core/theme/app_theme.dart';
import '../../models/user_model.dart';
import '../../services/auth_service.dart';
import '../auth/login_screen.dart';

class ProfileScreen extends StatefulWidget {
  final BrokerUser user;
  final AuthService authService;

  const ProfileScreen({
    super.key,
    required this.user,
    required this.authService,
  });

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  late BrokerUser _user;
  bool _isLoading = false;

  @override
  void initState() {
    super.initState();
    _user = widget.user;
    _refreshProfile();
  }

  Future<void> _refreshProfile() async {
    try {
      final updated = await widget.authService.getMe();
      if (mounted) {
        setState(() {
          _user = updated;
        });
      }
    } catch (_) {}
  }

  Future<void> _handleLogout() async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Sign Out'),
        content: const Text('Are you sure you want to sign out of the Ashiyana Broker field companion?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(false),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: AppTheme.error),
            onPressed: () => Navigator.of(ctx).pop(true),
            child: const Text('Sign Out'),
          ),
        ],
      ),
    );

    if (confirm != true) return;

    setState(() => _isLoading = true);
    await widget.authService.logout();

    if (!mounted) return;

    Navigator.of(context).pushAndRemoveUntil(
      MaterialPageRoute(
        builder: (_) => LoginScreen(authService: widget.authService),
      ),
      (route) => false,
    );
  }

  void _showApiConfigDialog() {
    final controller = TextEditingController(text: EnvConfig.apiBaseUrl);

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('API Connection Settings'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Configure the FastAPI backend server URL for local device testing or production:',
              style: TextStyle(fontSize: 13, color: AppTheme.textSecondary),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: controller,
              decoration: const InputDecoration(
                labelText: 'Backend API URL',
                hintText: 'http://10.0.2.2:8000/api',
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () {
              EnvConfig.resetBaseUrl();
              Navigator.of(ctx).pop();
              setState(() {});
            },
            child: const Text('Reset Default'),
          ),
          ElevatedButton(
            onPressed: () {
              if (controller.text.trim().isNotEmpty) {
                EnvConfig.setCustomBaseUrl(controller.text.trim());
              }
              Navigator.of(ctx).pop();
              setState(() {});
            },
            child: const Text('Save URL'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(
        title: const Text('Broker Profile'),
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // Profile Card
          Card(
            child: Padding(
              padding: const EdgeInsets.all(20),
              child: Column(
                children: [
                  Container(
                    width: 72,
                    height: 72,
                    decoration: BoxDecoration(
                      color: AppTheme.primary,
                      borderRadius: BorderRadius.circular(36),
                      border: Border.all(color: AppTheme.accent, width: 2),
                    ),
                    alignment: Alignment.center,
                    child: Text(
                      _user.fullName.isNotEmpty ? _user.fullName[0].toUpperCase() : 'K',
                      style: const TextStyle(fontSize: 28, fontWeight: FontWeight.bold, color: Colors.white),
                    ),
                  ),
                  const SizedBox(height: 14),
                  Text(
                    _user.fullName,
                    style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700, color: AppTheme.primary),
                  ),
                  const SizedBox(height: 4),
                  const Text(
                    'Lead Broker & Founder',
                    style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: AppTheme.accent),
                  ),
                  const SizedBox(height: 2),
                  const Text(
                    'Ashiyana Real Estate • Goa',
                    style: TextStyle(fontSize: 12, color: AppTheme.textSecondary),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),

          // Contact Details Card
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'ACCOUNT INFORMATION',
                    style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: AppTheme.accent),
                  ),
                  const SizedBox(height: 12),
                  _buildInfoRow(Icons.mail_outline, 'Email', _user.email),
                  const Divider(height: 16),
                  _buildInfoRow(Icons.phone_outlined, 'Phone', _user.phone ?? '+91 98221 23456'),
                  const Divider(height: 16),
                  _buildInfoRow(Icons.badge_outlined, 'Role Authorization', _user.role.toUpperCase()),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),

          // System / Connection Card
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'CONNECTIVITY & ENVIRONMENT',
                    style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: AppTheme.accent),
                  ),
                  const SizedBox(height: 12),
                  ListTile(
                    contentPadding: EdgeInsets.zero,
                    dense: true,
                    leading: const Icon(Icons.dns_outlined, size: 20, color: AppTheme.textSecondary),
                    title: const Text('Backend API URL', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
                    subtitle: Text(
                      EnvConfig.apiBaseUrl,
                      style: const TextStyle(fontSize: 11, fontFamily: 'monospace'),
                    ),
                    trailing: const Icon(Icons.edit_outlined, size: 16, color: AppTheme.textSecondary),
                    onTap: _showApiConfigDialog,
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 24),

          // Sign Out Button
          SizedBox(
            height: 46,
            child: OutlinedButton.icon(
              style: OutlinedButton.styleFrom(
                foregroundColor: AppTheme.error,
                side: const BorderSide(color: AppTheme.error, width: 1.2),
              ),
              icon: const Icon(Icons.logout, size: 18),
              label: _isLoading
                  ? const SizedBox(
                      width: 18,
                      height: 18,
                      child: CircularProgressIndicator(strokeWidth: 2, color: AppTheme.error),
                    )
                  : const Text('Sign Out from Mobile'),
              onPressed: _isLoading ? null : _handleLogout,
            ),
          ),
          const SizedBox(height: 24),
        ],
      ),
    );
  }

  Widget _buildInfoRow(IconData icon, String label, String value) {
    return Row(
      children: [
        Icon(icon, size: 18, color: AppTheme.textSecondary),
        const SizedBox(width: 12),
        Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(label, style: const TextStyle(fontSize: 11, color: AppTheme.textMuted)),
            const SizedBox(height: 2),
            Text(value, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w500, color: AppTheme.primary)),
          ],
        ),
      ],
    );
  }
}
