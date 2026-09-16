import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'core/config/env_config.dart';
import 'core/theme/app_theme.dart';
import 'models/user_model.dart';
import 'services/auth_service.dart';
import 'features/auth/login_screen.dart';
import 'features/navigation/main_scaffold.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await EnvConfig.init();

  // Set system navigation and status bar style
  SystemChrome.setSystemUIOverlayStyle(
    const SystemUiOverlayStyle(
      statusBarColor: Colors.transparent,
      statusBarIconBrightness: Brightness.dark,
      systemNavigationBarColor: AppTheme.surface,
      systemNavigationBarIconBrightness: Brightness.dark,
    ),
  );

  final authService = AuthService();
  runApp(AshiyanaBrokerApp(authService: authService));
}

class AshiyanaBrokerApp extends StatelessWidget {
  final AuthService authService;

  const AshiyanaBrokerApp({super.key, required this.authService});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Ashiyana Broker',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.lightTheme,
      home: AuthGate(authService: authService),
    );
  }
}

class AuthGate extends StatefulWidget {
  final AuthService authService;

  const AuthGate({super.key, required this.authService});

  @override
  State<AuthGate> createState() => _AuthGateState();
}

class _AuthGateState extends State<AuthGate> {
  late Future<_AuthCheckResult> _authFuture;

  @override
  void initState() {
    super.initState();
    _authFuture = _checkAuth();
  }

  Future<_AuthCheckResult> _checkAuth() async {
    try {
      final isAuth = await widget.authService.isAuthenticated();
      if (!isAuth) {
        return _AuthCheckResult(isAuthenticated: false);
      }
      final user = await widget.authService.getMe();
      if (!user.isBroker) {
        await widget.authService.logout();
        return _AuthCheckResult(isAuthenticated: false);
      }
      return _AuthCheckResult(isAuthenticated: true, user: user);
    } catch (_) {
      return _AuthCheckResult(isAuthenticated: false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<_AuthCheckResult>(
      future: _authFuture,
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const Scaffold(
            backgroundColor: AppTheme.background,
            body: Center(
              child: CircularProgressIndicator(
                strokeWidth: 2,
                color: AppTheme.primary,
              ),
            ),
          );
        }

        final result = snapshot.data;
        if (result != null && result.isAuthenticated && result.user != null) {
          return MainScaffold(
            authService: widget.authService,
            initialUser: result.user!,
          );
        }

        return LoginScreen(authService: widget.authService);
      },
    );
  }
}

class _AuthCheckResult {
  final bool isAuthenticated;
  final BrokerUser? user;

  _AuthCheckResult({required this.isAuthenticated, this.user});
}
