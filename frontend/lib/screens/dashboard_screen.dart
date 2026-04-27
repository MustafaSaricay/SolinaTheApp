/// screens/dashboard_screen.dart
///
/// Main dashboard — replicates the Electron single-page UI with:
///   • Battery card
///   • kWh + CO₂ metric cards
///   • Hourly bar chart
///   • Recent readings table
///   • Toolbar: Pause/Resume, Read Now, Settings
library;

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../providers/battery_provider.dart';
import '../providers/monitoring_provider.dart';
import '../providers/readings_provider.dart';
import '../providers/settings_provider.dart';
import '../widgets/app_theme.dart';
import '../widgets/battery_card.dart';
import '../widgets/history_table.dart';
import '../widgets/hourly_chart.dart';
import '../widgets/kwh_co2_cards.dart';
import 'settings_screen.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  @override
  void initState() {
    super.initState();
    // Load initial data after the first frame
    WidgetsBinding.instance.addPostFrameCallback((_) => _initialLoad());
  }

  Future<void> _initialLoad() async {
    final settings    = context.read<SettingsProvider>();
    final readings    = context.read<ReadingsProvider>();
    final battery     = context.read<BatteryProvider>();
    await Future.wait([settings.load(), readings.refresh(), battery.readNow()]);
  }

  Future<void> _readNow() async {
    final battery  = context.read<BatteryProvider>();
    final readings = context.read<ReadingsProvider>();
    await battery.readNow();
    await readings.refresh();
  }

  @override
  Widget build(BuildContext context) {
    final monitoring = context.watch<MonitoringProvider>().monitoring;
    final battery    = context.watch<BatteryProvider>();
    final readings   = context.watch<ReadingsProvider>();
    final settings   = context.watch<SettingsProvider>().settings;

    return Scaffold(
      appBar: AppBar(
        title: const Text('🌱 Solina Power Tracker'),
        actions: [
          // Monitoring status indicator
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 8),
            child: Row(
              children: [
                Icon(
                  Icons.circle,
                  size: 10,
                  color: monitoring ? SolinaColors.accent : SolinaColors.warn,
                ),
                const SizedBox(width: 4),
                Text(
                  monitoring ? 'Monitoring active' : 'Monitoring paused',
                  style: const TextStyle(fontSize: 12, color: SolinaColors.pale),
                ),
              ],
            ),
          ),
        ],
      ),
      body: RefreshIndicator(
        color: SolinaColors.accent,
        onRefresh: () async {
          await Future.wait([
            context.read<ReadingsProvider>().refresh(),
            context.read<BatteryProvider>().readNow(),
          ]);
        },
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.all(12),
          child: Column(
            children: [
              // Battery + kWh/CO₂ row
              LayoutBuilder(
                builder: (context, constraints) {
                  final wide = constraints.maxWidth > 600;
                  if (wide) {
                    return Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Expanded(child: BatteryCard(info: battery.info, loading: battery.loading)),
                        const SizedBox(width: 8),
                        Expanded(child: KwhCard(kwh: readings.dailyKwh)),
                        const SizedBox(width: 8),
                        Expanded(child: Co2Card(kwh: readings.dailyKwh, gramsPerKwh: settings.co2GramsPerKwh)),
                      ],
                    );
                  }
                  return Column(
                    children: [
                      BatteryCard(info: battery.info, loading: battery.loading),
                      const SizedBox(height: 8),
                      KwhCard(kwh: readings.dailyKwh),
                      const SizedBox(height: 8),
                      Co2Card(kwh: readings.dailyKwh, gramsPerKwh: settings.co2GramsPerKwh),
                    ],
                  );
                },
              ),
              const SizedBox(height: 8),
              HourlyChart(data: readings.hourlyBreakdown),
              const SizedBox(height: 8),
              HistoryTable(readings: readings.recentReadings),
              const SizedBox(height: 8),
              // Error banner
              if (battery.error != null || readings.error != null)
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: SolinaColors.danger.withAlpha(50),
                    borderRadius: BorderRadius.circular(4),
                  ),
                  child: Text(
                    battery.error ?? readings.error ?? '',
                    style: const TextStyle(color: SolinaColors.danger),
                  ),
                ),
            ],
          ),
        ),
      ),
      bottomNavigationBar: _Toolbar(
        monitoring: monitoring,
        onToggle: () => context.read<MonitoringProvider>().toggle(),
        onReadNow: _readNow,
        onSettings: () => SettingsScreen.show(context),
      ),
    );
  }
}

class _Toolbar extends StatelessWidget {
  const _Toolbar({
    required this.monitoring,
    required this.onToggle,
    required this.onReadNow,
    required this.onSettings,
  });

  final bool monitoring;
  final VoidCallback onToggle;
  final VoidCallback onReadNow;
  final VoidCallback onSettings;

  @override
  Widget build(BuildContext context) {
    return Container(
      color: SolinaColors.card,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceEvenly,
        children: [
          ElevatedButton.icon(
            onPressed: onToggle,
            icon: Icon(monitoring ? Icons.pause : Icons.play_arrow),
            label: Text(monitoring ? 'Pause' : 'Resume'),
          ),
          ElevatedButton.icon(
            onPressed: onReadNow,
            icon: const Icon(Icons.bolt),
            label: const Text('Read Now'),
          ),
          ElevatedButton.icon(
            onPressed: onSettings,
            icon: const Icon(Icons.settings),
            label: const Text('Settings'),
          ),
        ],
      ),
    );
  }
}
