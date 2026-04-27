/// widgets/hourly_chart.dart
///
/// Bar chart of hourly kWh consumption using fl_chart.
library;

import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';

import '../models/hourly_point.dart';
import 'app_theme.dart';

class HourlyChart extends StatelessWidget {
  const HourlyChart({super.key, required this.data});

  final List<HourlyPoint> data;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('📊 Hourly Breakdown', style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 12),
            SizedBox(
              height: 140,
              child: data.isEmpty ? _emptyState() : _chart(),
            ),
          ],
        ),
      ),
    );
  }

  Widget _emptyState() => const Center(
        child: Text(
          'No readings yet today',
          style: TextStyle(color: SolinaColors.pale),
        ),
      );

  Widget _chart() {
    final maxKwh = data.map((e) => e.kwh).reduce((a, b) => a > b ? a : b);
    final kwhMap = {for (final p in data) p.hour: p.kwh};

    return BarChart(
      BarChartData(
        maxY: maxKwh == 0 ? 0.001 : maxKwh * 1.15,
        barGroups: List.generate(24, (hour) {
          final kwh = kwhMap[hour] ?? 0;
          return BarChartGroupData(
            x: hour,
            barRods: [
              BarChartRodData(
                toY: kwh,
                color: SolinaColors.accent,
                width: 8,
                borderRadius: const BorderRadius.vertical(top: Radius.circular(2)),
              ),
            ],
          );
        }),
        titlesData: FlTitlesData(
          leftTitles: AxisTitles(
            axisNameWidget: const Text('kWh', style: TextStyle(color: SolinaColors.pale, fontSize: 10)),
            sideTitles: SideTitles(
              showTitles: true,
              reservedSize: 44,
              getTitlesWidget: (value, _) => Text(
                value.toStringAsFixed(3),
                style: const TextStyle(color: SolinaColors.pale, fontSize: 8),
              ),
            ),
          ),
          bottomTitles: AxisTitles(
            sideTitles: SideTitles(
              showTitles: true,
              interval: 3,
              getTitlesWidget: (value, _) {
                final h = value.toInt();
                if (h % 3 != 0) return const SizedBox.shrink();
                return Text(
                  '${h.toString().padLeft(2, '0')}h',
                  style: const TextStyle(color: SolinaColors.pale, fontSize: 8),
                );
              },
            ),
          ),
          topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
          rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
        ),
        gridData: FlGridData(
          drawVerticalLine: false,
          getDrawingHorizontalLine: (_) => const FlLine(
            color: SolinaColors.cardHi,
            strokeWidth: 0.5,
            dashArray: [2, 4],
          ),
        ),
        borderData: FlBorderData(show: false),
        backgroundColor: Colors.transparent,
      ),
    );
  }
}
