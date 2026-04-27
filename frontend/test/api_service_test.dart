/// test/api_service_test.dart
///
/// Unit tests for ApiService — uses a mock http.Client so no real
/// network connection is needed.
library;

import 'dart:convert';

import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:solina_frontend/services/api_service.dart';

// Helper to build a successful JSON response
http.Response _ok(Object body) =>
    http.Response(jsonEncode(body), 200, headers: {'content-type': 'application/json'});

// Helper to build an error response
http.Response _err(int code, String msg) =>
    http.Response(jsonEncode({'error': msg}), code, headers: {'content-type': 'application/json'});

void main() {
  setUpAll(() async {
    dotenv.testLoad(fileInput: 'API_BASE_URL=http://localhost:3000');
  });

  group('getDailyKwh', () {
    test('returns kwh value on success', () async {
      final client = MockClient((_) async => _ok({'kwh': 0.042}));
      final api = ApiService(client: client);
      expect(await api.getDailyKwh(), closeTo(0.042, 0.001));
    });

    test('throws ApiException on error', () async {
      final client = MockClient((_) async => _err(500, 'DB error'));
      final api = ApiService(client: client);
      expect(() => api.getDailyKwh(), throwsA(isA<ApiException>()));
    });
  });

  group('getHourlyBreakdown', () {
    test('returns list of HourlyPoints', () async {
      final client = MockClient((_) async => _ok([
            {'hour': 9, 'kwh': 0.02},
            {'hour': 10, 'kwh': 0.022},
          ]));
      final api = ApiService(client: client);
      final points = await api.getHourlyBreakdown();
      expect(points.length, 2);
      expect(points.first.hour, 9);
      expect(points.first.kwh, closeTo(0.02, 0.001));
    });
  });

  group('getRecentReadings', () {
    test('returns list of BatteryReadings', () async {
      final client = MockClient((_) async => _ok([
            {
              'id': 1,
              'timestamp': '2024-06-01T10:00:00.000Z',
              'batteryPercent': 80.0,
              'isPlugged': false,
              'energyDeltaWh': 5.0,
            }
          ]));
      final api = ApiService(client: client);
      final rows = await api.getRecentReadings();
      expect(rows.length, 1);
      expect(rows.first.batteryPercent, 80.0);
    });
  });

  group('takeReadingNow', () {
    test('returns info and energyDeltaWh', () async {
      final client = MockClient((_) async => _ok({
            'info': {'percent': 75.0, 'isPlugged': false, 'secondsLeft': null},
            'energyDeltaWh': 3.2,
          }));
      final api = ApiService(client: client);
      final result = await api.takeReadingNow();
      expect(result.info, isNotNull);
      expect(result.info!.percent, 75.0);
      expect(result.energyDeltaWh, closeTo(3.2, 0.01));
    });

    test('handles null info (no battery)', () async {
      final client = MockClient((_) async => _ok({'info': null, 'energyDeltaWh': 0}));
      final api = ApiService(client: client);
      final result = await api.takeReadingNow();
      expect(result.info, isNull);
    });
  });

  group('getSettings', () {
    test('returns DeviceSettings', () async {
      final client = MockClient((_) async => _ok({
            'deviceName': 'Laptop',
            'batteryCapacityWh': 65,
            'pollIntervalSeconds': 120,
            'co2GramsPerKwh': 200,
          }));
      final api = ApiService(client: client);
      final s = await api.getSettings();
      expect(s.deviceName, 'Laptop');
      expect(s.batteryCapacityWh, 65);
    });
  });

  group('saveSettings', () {
    test('sends PUT and returns updated settings', () async {
      String? capturedMethod;
      final client = MockClient((req) async {
        capturedMethod = req.method;
        return _ok({
          'deviceName': 'Updated',
          'batteryCapacityWh': 70,
          'pollIntervalSeconds': 300,
          'co2GramsPerKwh': 233,
        });
      });
      final api = ApiService(client: client);
      final updated = await api.saveSettings(
        const DeviceSettings(
          deviceName: 'Updated',
          batteryCapacityWh: 70,
          pollIntervalSeconds: 300,
          co2GramsPerKwh: 233,
        ),
      );
      expect(capturedMethod, 'PUT');
      expect(updated.deviceName, 'Updated');
    });
  });

  group('toggleMonitoring', () {
    test('returns new monitoring state', () async {
      final client = MockClient((_) async => _ok({'monitoring': false}));
      final api = ApiService(client: client);
      expect(await api.toggleMonitoring(), false);
    });
  });

  group('ApiException', () {
    test('statusCode is set', () async {
      final client = MockClient((_) async => _err(404, 'Not found'));
      final api = ApiService(client: client);
      try {
        await api.getDailyKwh();
        fail('should throw');
      } on ApiException catch (e) {
        expect(e.statusCode, 404);
        expect(e.message, contains('Not found'));
      }
    });
  });
}
