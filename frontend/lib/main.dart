/// lib/main.dart
///
/// Solina Power Tracker — Flutter entry point.
///
/// Wires up providers (ApiService, ReadingsProvider, BatteryProvider,
/// SettingsProvider, MonitoringProvider) and launches the app.
library;

import 'package:flutter/material.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:provider/provider.dart';

import 'providers/battery_provider.dart';
import 'providers/monitoring_provider.dart';
import 'providers/readings_provider.dart';
import 'providers/settings_provider.dart';
import 'screens/dashboard_screen.dart';
import 'services/api_service.dart';
import 'widgets/app_theme.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await dotenv.load(fileName: '.env');
  runApp(const SolinaApp());
}

class SolinaApp extends StatelessWidget {
  const SolinaApp({super.key});

  @override
  Widget build(BuildContext context) {
    final api = ApiService();

    return MultiProvider(
      providers: [
        // Shared services
        Provider<ApiService>.value(value: api),

        // State providers
        ChangeNotifierProvider(create: (_) => ReadingsProvider(api)),
        ChangeNotifierProvider(create: (_) => BatteryProvider(api)),
        ChangeNotifierProvider(create: (_) => SettingsProvider(api)),

        // MonitoringProvider depends on Battery + Readings providers.
        // Use ChangeNotifierProxyProvider to receive them after creation.
        ChangeNotifierProxyProvider2<BatteryProvider, ReadingsProvider, MonitoringProvider>(
          create: (ctx) => MonitoringProvider(
            api,
            ctx.read<BatteryProvider>(),
            ctx.read<ReadingsProvider>(),
          ),
          update: (_, battery, readings, previous) =>
              previous ?? MonitoringProvider(api, battery, readings),
        ),
      ],
      child: MaterialApp(
        title: 'Solina Power Tracker',
        debugShowCheckedModeBanner: false,
        theme: buildTheme(),
        home: const DashboardScreen(),
      ),
    );
  }
}
