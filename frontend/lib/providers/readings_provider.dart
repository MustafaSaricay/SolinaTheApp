/// providers/readings_provider.dart
///
/// Holds daily kWh, hourly breakdown, and recent readings.
/// Refreshes on SSE reading:taken events.
library;

import 'package:flutter/foundation.dart';

import '../models/battery_reading.dart';
import '../models/hourly_point.dart';
import '../services/api_service.dart';

class ReadingsProvider extends ChangeNotifier {
  ReadingsProvider(this._api);

  final ApiService _api;

  double _dailyKwh = 0;
  List<HourlyPoint> _hourlyBreakdown = [];
  List<BatteryReading> _recentReadings = [];
  bool _loading = false;
  String? _error;

  double get dailyKwh => _dailyKwh;
  List<HourlyPoint> get hourlyBreakdown => _hourlyBreakdown;
  List<BatteryReading> get recentReadings => _recentReadings;
  bool get loading => _loading;
  String? get error => _error;

  Future<void> refresh() async {
    _loading = true;
    _error = null;
    notifyListeners();
    try {
      final results = await Future.wait([
        _api.getDailyKwh(),
        _api.getHourlyBreakdown(),
        _api.getRecentReadings(limit: 20),
      ]);
      _dailyKwh = results[0] as double;
      _hourlyBreakdown = results[1] as List<HourlyPoint>;
      _recentReadings = results[2] as List<BatteryReading>;
    } catch (e) {
      _error = e.toString();
    } finally {
      _loading = false;
      notifyListeners();
    }
  }
}
