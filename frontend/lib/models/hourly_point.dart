/// models/hourly_point.dart
///
/// Represents one element from /api/readings/hourly-breakdown.
class HourlyPoint {
  final int hour;
  final double kwh;

  const HourlyPoint({required this.hour, required this.kwh});

  factory HourlyPoint.fromJson(Map<String, dynamic> json) {
    return HourlyPoint(
      hour: json['hour'] as int,
      kwh: (json['kwh'] as num).toDouble(),
    );
  }
}
