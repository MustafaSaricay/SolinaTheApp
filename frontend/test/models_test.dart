/// test/models_test.dart
///
/// Unit tests for data model fromJson factories.
library;

import 'package:flutter_test/flutter_test.dart';
import 'package:solina_frontend/models/battery_info.dart';
import 'package:solina_frontend/models/battery_reading.dart';
import 'package:solina_frontend/models/device_settings.dart';
import 'package:solina_frontend/models/hourly_point.dart';

void main() {
  group('BatteryInfo.fromJson', () {
    test('parses all fields', () {
      final info = BatteryInfo.fromJson({
        'percent': 75.5,
        'isPlugged': true,
        'secondsLeft': 3600,
      });
      expect(info.percent, 75.5);
      expect(info.isPlugged, true);
      expect(info.secondsLeft, 3600);
    });

    test('secondsLeft can be null', () {
      final info = BatteryInfo.fromJson({'percent': 80, 'isPlugged': false, 'secondsLeft': null});
      expect(info.secondsLeft, isNull);
    });
  });

  group('BatteryReading.fromJson', () {
    test('parses all fields', () {
      final r = BatteryReading.fromJson({
        'id': 42,
        'timestamp': '2024-06-01T10:00:00.000Z',
        'batteryPercent': 80.0,
        'isPlugged': false,
        'energyDeltaWh': 5.5,
      });
      expect(r.id, 42);
      expect(r.batteryPercent, 80.0);
      expect(r.isPlugged, false);
      expect(r.energyDeltaWh, 5.5);
      expect(r.timestamp.year, 2024);
    });
  });

  group('HourlyPoint.fromJson', () {
    test('parses hour and kwh', () {
      final p = HourlyPoint.fromJson({'hour': 9, 'kwh': 0.042});
      expect(p.hour, 9);
      expect(p.kwh, closeTo(0.042, 0.001));
    });
  });

  group('DeviceSettings', () {
    test('fromJson parses all fields', () {
      final s = DeviceSettings.fromJson({
        'deviceName': 'Laptop',
        'batteryCapacityWh': 65.0,
        'pollIntervalSeconds': 120,
        'co2GramsPerKwh': 150.0,
      });
      expect(s.deviceName, 'Laptop');
      expect(s.batteryCapacityWh, 65.0);
      expect(s.pollIntervalSeconds, 120);
      expect(s.co2GramsPerKwh, 150.0);
    });

    test('defaults() provides sensible values', () {
      final s = DeviceSettings.defaults();
      expect(s.deviceName, 'My Device');
      expect(s.batteryCapacityWh, 50);
      expect(s.pollIntervalSeconds, 300);
      expect(s.co2GramsPerKwh, 233);
    });

    test('toJson round-trips correctly', () {
      final s = DeviceSettings(
        deviceName: 'Test',
        batteryCapacityWh: 45,
        pollIntervalSeconds: 60,
        co2GramsPerKwh: 200,
      );
      final json = s.toJson();
      final restored = DeviceSettings.fromJson(json);
      expect(restored.deviceName, s.deviceName);
      expect(restored.batteryCapacityWh, s.batteryCapacityWh);
      expect(restored.pollIntervalSeconds, s.pollIntervalSeconds);
      expect(restored.co2GramsPerKwh, s.co2GramsPerKwh);
    });

    test('copyWith overrides specific fields', () {
      final original = DeviceSettings.defaults();
      final updated = original.copyWith(deviceName: 'Updated', pollIntervalSeconds: 60);
      expect(updated.deviceName, 'Updated');
      expect(updated.pollIntervalSeconds, 60);
      expect(updated.batteryCapacityWh, original.batteryCapacityWh);
    });
  });
}
