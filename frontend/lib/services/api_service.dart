/// services/api_service.dart
///
/// Wraps all HTTP calls to the Solina backend API.
/// Mirrors the window.solina.* API from the legacy Electron renderer.
library;

import 'dart:async';
import 'dart:convert';

import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:http/http.dart' as http;

import '../models/battery_info.dart';
import '../models/battery_reading.dart';
import '../models/device_settings.dart';
import '../models/hourly_point.dart';

/// Thrown when a backend call fails.
class ApiException implements Exception {
  final int? statusCode;
  final String message;

  const ApiException(this.message, {this.statusCode});

  @override
  String toString() => 'ApiException($statusCode): $message';
}

class ApiService {
  ApiService({http.Client? client})
      : _client = client ?? http.Client(),
        _base = dotenv.env['API_BASE_URL'] ?? 'http://localhost:3000';

  final http.Client _client;
  final String _base;

  // ── Helpers ──────────────────────────────────────────────────────────────────

  Uri _uri(String path, [Map<String, String>? params]) {
    final uri = Uri.parse('$_base$path');
    return params != null ? uri.replace(queryParameters: params) : uri;
  }

  Future<dynamic> _get(String path, [Map<String, String>? params]) async {
    final res = await _client.get(
      _uri(path, params),
      headers: {'Accept': 'application/json'},
    );
    _checkStatus(res);
    return jsonDecode(res.body);
  }

  Future<dynamic> _post(String path, [Object? body]) async {
    final res = await _client.post(
      _uri(path),
      headers: {'Content-Type': 'application/json', 'Accept': 'application/json'},
      body: body != null ? jsonEncode(body) : null,
    );
    _checkStatus(res);
    return jsonDecode(res.body);
  }

  Future<dynamic> _put(String path, Object body) async {
    final res = await _client.put(
      _uri(path),
      headers: {'Content-Type': 'application/json', 'Accept': 'application/json'},
      body: jsonEncode(body),
    );
    _checkStatus(res);
    return jsonDecode(res.body);
  }

  void _checkStatus(http.Response res) {
    if (res.statusCode >= 400) {
      dynamic body;
      try {
        body = jsonDecode(res.body);
      } catch (_) {
        body = null;
      }
      final msg = (body is Map && body['error'] != null)
          ? body['error'] as String
          : res.body;
      throw ApiException(msg, statusCode: res.statusCode);
    }
  }

  // ── Readings ─────────────────────────────────────────────────────────────────

  /// Today's total energy consumption in kWh.
  Future<double> getDailyKwh({String? date}) async {
    final params = date != null ? {'date': date} : null;
    final data = await _get('/api/readings/daily-kwh', params) as Map<String, dynamic>;
    return (data['kwh'] as num).toDouble();
  }

  /// Per-hour energy breakdown for today (or a given date).
  Future<List<HourlyPoint>> getHourlyBreakdown({String? date}) async {
    final params = date != null ? {'date': date} : null;
    final data = await _get('/api/readings/hourly-breakdown', params) as List<dynamic>;
    return data
        .cast<Map<String, dynamic>>()
        .map(HourlyPoint.fromJson)
        .toList();
  }

  /// The N most recent battery readings (default 20).
  Future<List<BatteryReading>> getRecentReadings({int limit = 20}) async {
    final data = await _get('/api/readings/recent', {'limit': '$limit'}) as List<dynamic>;
    return data
        .cast<Map<String, dynamic>>()
        .map(BatteryReading.fromJson)
        .toList();
  }

  // ── Battery ──────────────────────────────────────────────────────────────────

  /// Trigger an immediate battery reading.
  Future<({BatteryInfo? info, double energyDeltaWh})> takeReadingNow() async {
    final data = await _post('/api/battery/read-now') as Map<String, dynamic>;
    final infoJson = data['info'] as Map<String, dynamic>?;
    return (
      info: infoJson != null ? BatteryInfo.fromJson(infoJson) : null,
      energyDeltaWh: (data['energyDeltaWh'] as num).toDouble(),
    );
  }

  // ── Settings ─────────────────────────────────────────────────────────────────

  Future<DeviceSettings> getSettings() async {
    final data = await _get('/api/settings') as Map<String, dynamic>;
    return DeviceSettings.fromJson(data);
  }

  Future<DeviceSettings> saveSettings(DeviceSettings settings) async {
    final data = await _put('/api/settings', settings.toJson()) as Map<String, dynamic>;
    return DeviceSettings.fromJson(data);
  }

  // ── Monitoring ───────────────────────────────────────────────────────────────

  Future<bool> toggleMonitoring() async {
    final data = await _post('/api/monitoring/toggle') as Map<String, dynamic>;
    return data['monitoring'] as bool;
  }

  // ── Server-Sent Events ────────────────────────────────────────────────────────

  /// Returns a broadcast [Stream] that emits SSE events as raw maps.
  ///
  /// Reconnects automatically after a 5-second delay on disconnect.
  Stream<Map<String, dynamic>> sseStream() {
    final controller = StreamController<Map<String, dynamic>>.broadcast();
    _connectSse(controller);
    return controller.stream;
  }

  void _connectSse(StreamController<Map<String, dynamic>> controller) {
    Future.microtask(() async {
      while (!controller.isClosed) {
        try {
          final request = http.Request('GET', _uri('/api/events'))
            ..headers['Accept'] = 'text/event-stream'
            ..headers['Cache-Control'] = 'no-cache';

          final streamedResponse = await _client.send(request);
          String eventName = 'message';
          final buffer = StringBuffer();

          await for (final chunk in streamedResponse.stream.transform(utf8.decoder)) {
            for (final line in chunk.split('\n')) {
              if (line.startsWith('event:')) {
                eventName = line.substring(6).trim();
              } else if (line.startsWith('data:')) {
                buffer.write(line.substring(5).trim());
              } else if (line.isEmpty && buffer.isNotEmpty) {
                try {
                  final payload = jsonDecode(buffer.toString()) as Map<String, dynamic>;
                  if (!controller.isClosed) {
                    controller.add({'event': eventName, ...payload});
                  }
                } catch (_) {
                  // malformed JSON — ignore
                }
                buffer.clear();
                eventName = 'message';
              }
            }
          }
        } catch (_) {
          // connection error — wait before reconnecting
        }
        if (!controller.isClosed) {
          await Future<void>.delayed(const Duration(seconds: 5));
        }
      }
    });
  }

  void dispose() => _client.close();
}
