/// models/battery_info.dart
///
/// Live battery state returned by /api/battery/read-now and SSE reading:taken.
class BatteryInfo {
  final double percent;
  final bool isPlugged;
  final int? secondsLeft;

  const BatteryInfo({
    required this.percent,
    required this.isPlugged,
    this.secondsLeft,
  });

  factory BatteryInfo.fromJson(Map<String, dynamic> json) {
    return BatteryInfo(
      percent: (json['percent'] as num).toDouble(),
      isPlugged: json['isPlugged'] as bool,
      secondsLeft: json['secondsLeft'] as int?,
    );
  }
}
