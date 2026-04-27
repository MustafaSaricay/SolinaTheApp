/// models/device_settings.dart
///
/// Mirrors the settings object from /api/settings.
class DeviceSettings {
  final String deviceName;
  final double batteryCapacityWh;
  final int pollIntervalSeconds;
  final double co2GramsPerKwh;

  const DeviceSettings({
    required this.deviceName,
    required this.batteryCapacityWh,
    required this.pollIntervalSeconds,
    required this.co2GramsPerKwh,
  });

  factory DeviceSettings.defaults() => const DeviceSettings(
        deviceName: 'My Device',
        batteryCapacityWh: 50,
        pollIntervalSeconds: 300,
        co2GramsPerKwh: 233,
      );

  factory DeviceSettings.fromJson(Map<String, dynamic> json) {
    return DeviceSettings(
      deviceName: json['deviceName'] as String? ?? 'My Device',
      batteryCapacityWh: (json['batteryCapacityWh'] as num?)?.toDouble() ?? 50,
      pollIntervalSeconds: (json['pollIntervalSeconds'] as num?)?.toInt() ?? 300,
      co2GramsPerKwh: (json['co2GramsPerKwh'] as num?)?.toDouble() ?? 233,
    );
  }

  Map<String, dynamic> toJson() => {
        'deviceName': deviceName,
        'batteryCapacityWh': batteryCapacityWh,
        'pollIntervalSeconds': pollIntervalSeconds,
        'co2GramsPerKwh': co2GramsPerKwh,
      };

  DeviceSettings copyWith({
    String? deviceName,
    double? batteryCapacityWh,
    int? pollIntervalSeconds,
    double? co2GramsPerKwh,
  }) =>
      DeviceSettings(
        deviceName: deviceName ?? this.deviceName,
        batteryCapacityWh: batteryCapacityWh ?? this.batteryCapacityWh,
        pollIntervalSeconds: pollIntervalSeconds ?? this.pollIntervalSeconds,
        co2GramsPerKwh: co2GramsPerKwh ?? this.co2GramsPerKwh,
      );
}
