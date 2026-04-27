/// widgets/history_table.dart
///
/// Table of the 20 most recent battery readings.
library;

import 'package:flutter/material.dart';

import '../models/battery_reading.dart';
import 'app_theme.dart';

class HistoryTable extends StatelessWidget {
  const HistoryTable({super.key, required this.readings});

  final List<BatteryReading> readings;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('🕒 Recent Readings', style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 8),
            if (readings.isEmpty)
              const Text('No readings yet.', style: TextStyle(color: SolinaColors.pale))
            else
              SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                child: DataTable(
                  headingRowColor: WidgetStateProperty.all(SolinaColors.cardHi),
                  dataRowColor: WidgetStateProperty.all(SolinaColors.card),
                  columns: const [
                    DataColumn(label: Text('Timestamp', style: TextStyle(color: SolinaColors.textCol))),
                    DataColumn(label: Text('%', style: TextStyle(color: SolinaColors.textCol))),
                    DataColumn(label: Text('Status', style: TextStyle(color: SolinaColors.textCol))),
                    DataColumn(label: Text('Δ Wh', style: TextStyle(color: SolinaColors.textCol))),
                  ],
                  rows: readings.map(_buildRow).toList(),
                ),
              ),
          ],
        ),
      ),
    );
  }

  DataRow _buildRow(BatteryReading r) {
    final ts = r.timestamp.toLocal().toString().substring(0, 19);
    final pct = '${r.batteryPercent.toStringAsFixed(1)}%';
    final status = r.isPlugged ? '⚡ Charging' : '🔋 Discharging';
    final wh = r.energyDeltaWh.toStringAsFixed(3);
    return DataRow(cells: [
      DataCell(Text(ts, style: const TextStyle(color: SolinaColors.pale, fontSize: 12))),
      DataCell(Text(pct, style: const TextStyle(color: SolinaColors.textCol))),
      DataCell(Text(status, style: const TextStyle(color: SolinaColors.pale))),
      DataCell(Text(wh, style: const TextStyle(color: SolinaColors.textCol))),
    ]);
  }
}
