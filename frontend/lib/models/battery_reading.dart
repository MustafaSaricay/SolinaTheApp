/// models/battery_reading.dart
///
/// Represents one row from /api/readings/recent.
class BatteryReading {
  final int id;
  final DateTime timestamp;
  final double batteryPercent;
  final bool isPlugged;
  final double energyDeltaWh;

  const BatteryReading({
    required this.id,
    required this.timestamp,
    required this.batteryPercent,
    required this.isPlugged,
    required this.energyDeltaWh,
  });

  factory BatteryReading.fromJson(Map<String, dynamic> json) {
    return BatteryReading(
      id: json['id'] as int,
      timestamp: DateTime.parse(json['timestamp'] as String),
      batteryPercent: (json['batteryPercent'] as num).toDouble(),
      isPlugged: json['isPlugged'] as bool,
      energyDeltaWh: (json['energyDeltaWh'] as num).toDouble(),
    );
  }
}
