/// widgets/battery_card.dart
///
/// Displays live battery percentage, plug state, and time-remaining.
/// Draws the battery body with a CustomPainter.
library;

import 'package:flutter/material.dart';

import '../models/battery_info.dart';
import 'app_theme.dart';

class BatteryCard extends StatelessWidget {
  const BatteryCard({super.key, required this.info, this.loading = false});

  final BatteryInfo? info;
  final bool loading;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('🔋 Battery', style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 12),
            if (loading)
              const LinearProgressIndicator()
            else if (info == null)
              const _NoBatteryView()
            else
              _BatteryView(info: info!),
          ],
        ),
      ),
    );
  }
}

class _NoBatteryView extends StatelessWidget {
  const _NoBatteryView();

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('N/A', style: Theme.of(context).textTheme.headlineMedium?.copyWith(color: SolinaColors.pale)),
        const Text('No battery detected', style: TextStyle(color: SolinaColors.pale)),
        const Text('Running on AC / VM', style: TextStyle(color: SolinaColors.pale)),
      ],
    );
  }
}

class _BatteryView extends StatelessWidget {
  const _BatteryView({required this.info});

  final BatteryInfo info;

  Color get _pctColor {
    if (info.percent > 60) return SolinaColors.accent;
    if (info.percent > 20) return SolinaColors.warn;
    return SolinaColors.danger;
  }

  String get _timeText {
    if (info.secondsLeft != null) {
      final h = info.secondsLeft! ~/ 3600;
      final m = (info.secondsLeft! % 3600) ~/ 60;
      return '$h h ${m.toString().padLeft(2, '0')} m remaining';
    }
    return info.isPlugged ? 'Plugged in' : '';
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Battery graphic
        SizedBox(
          height: 48,
          child: CustomPaint(
            painter: _BatteryPainter(info.percent, info.isPlugged),
            size: const Size(double.infinity, 48),
          ),
        ),
        const SizedBox(height: 8),
        Text(
          '${info.percent.toStringAsFixed(0)}%',
          style: Theme.of(context)
              .textTheme
              .headlineMedium
              ?.copyWith(color: _pctColor, fontWeight: FontWeight.bold),
        ),
        Text(
          info.isPlugged ? '⚡ Charging' : '🔋 Discharging',
          style: TextStyle(color: info.isPlugged ? SolinaColors.warn : SolinaColors.pale),
        ),
        if (_timeText.isNotEmpty)
          Text(_timeText, style: const TextStyle(color: SolinaColors.pale)),
      ],
    );
  }
}

class _BatteryPainter extends CustomPainter {
  const _BatteryPainter(this.percent, this.isPlugged);

  final double percent;
  final bool isPlugged;

  @override
  void paint(Canvas canvas, Size size) {
    const margin = 8.0;
    const tipW = 8.0;
    final tipH = size.height * 0.38;
    final bx1 = margin;
    final by1 = 4.0;
    final bx2 = size.width - margin - tipW - 3;
    final by2 = size.height - 4.0;

    final fillColor = percent > 60
        ? SolinaColors.accent
        : (percent > 20 ? SolinaColors.warn : SolinaColors.danger);

    // Fill rect
    final innerW = bx2 - bx1 - 4;
    final fillW = (innerW * percent / 100).clamp(0.0, innerW);
    canvas.drawRect(
      Rect.fromLTWH(bx1 + 2, by1 + 2, fillW, by2 - by1 - 4),
      Paint()..color = fillColor,
    );

    // Outline
    canvas.drawRect(
      Rect.fromLTWH(bx1, by1, bx2 - bx1, by2 - by1),
      Paint()
        ..color = SolinaColors.pale
        ..style = PaintingStyle.stroke
        ..strokeWidth = 2,
    );

    // Terminal nub
    final tipTop = size.height / 2 - tipH / 2;
    canvas.drawRect(
      Rect.fromLTWH(bx2 + 2, tipTop, tipW, tipH),
      Paint()..color = SolinaColors.pale,
    );

    // Charging bolt
    if (isPlugged) {
      final tp = TextPainter(
        text: const TextSpan(text: '⚡', style: TextStyle(fontSize: 20)),
        textDirection: TextDirection.ltr,
      )..layout();
      tp.paint(canvas, Offset((bx1 + bx2) / 2 - tp.width / 2, (by1 + by2) / 2 - tp.height / 2));
    }
  }

  @override
  bool shouldRepaint(_BatteryPainter old) =>
      old.percent != percent || old.isPlugged != isPlugged;
}
