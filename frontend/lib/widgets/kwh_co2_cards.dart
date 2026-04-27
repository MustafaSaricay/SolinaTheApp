/// widgets/kwh_co2_cards.dart
///
/// Two side-by-side metric cards: today's kWh and CO₂ equivalent.
library;

import 'package:flutter/material.dart';

import 'app_theme.dart';

class KwhCard extends StatelessWidget {
  const KwhCard({super.key, required this.kwh});

  final double kwh;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('⚡ Today\'s kWh', style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 8),
            Text(
              kwh.toStringAsFixed(3),
              style: const TextStyle(
                color: SolinaColors.accent,
                fontSize: 32,
                fontWeight: FontWeight.bold,
              ),
            ),
            Text(
              '${(kwh * 1000).toStringAsFixed(2)} Wh',
              style: const TextStyle(color: SolinaColors.pale, fontSize: 12),
            ),
          ],
        ),
      ),
    );
  }
}

class Co2Card extends StatelessWidget {
  const Co2Card({super.key, required this.kwh, required this.gramsPerKwh});

  final double kwh;
  final double gramsPerKwh;

  @override
  Widget build(BuildContext context) {
    final co2 = (kwh * gramsPerKwh).clamp(0.0, double.infinity);
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('🌿 CO₂ Equivalent', style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 8),
            Text(
              '${co2.toStringAsFixed(1)} g',
              style: const TextStyle(
                color: SolinaColors.accent,
                fontSize: 32,
                fontWeight: FontWeight.bold,
              ),
            ),
            Text(
              '@ ${gramsPerKwh.toStringAsFixed(0)} g/kWh grid intensity',
              style: const TextStyle(color: SolinaColors.pale, fontSize: 12),
            ),
          ],
        ),
      ),
    );
  }
}
