/// providers/battery_provider.dart
///
/// Holds the most recent live battery info.
/// Updated via SSE reading:taken events or manual reads.
library;

import 'package:flutter/foundation.dart';

import '../models/battery_info.dart';
import '../services/api_service.dart';

class BatteryProvider extends ChangeNotifier {
  BatteryProvider(this._api);

  final ApiService _api;

  BatteryInfo? _info;
  double _lastEnergyDeltaWh = 0;
  bool _loading = false;
  String? _error;

  BatteryInfo? get info => _info;
  double get lastEnergyDeltaWh => _lastEnergyDeltaWh;
  bool get loading => _loading;
  String? get error => _error;

  void updateFromEvent(Map<String, dynamic> data) {
    final infoJson = data['info'] as Map<String, dynamic>?;
    _info = infoJson != null ? BatteryInfo.fromJson(infoJson) : null;
    _lastEnergyDeltaWh = (data['energyDeltaWh'] as num?)?.toDouble() ?? 0;
    notifyListeners();
  }

  Future<void> readNow() async {
    _loading = true;
    _error = null;
    notifyListeners();
    try {
      final result = await _api.takeReadingNow();
      _info = result.info;
      _lastEnergyDeltaWh = result.energyDeltaWh;
    } catch (e) {
      _error = e.toString();
    } finally {
      _loading = false;
      notifyListeners();
    }
  }
}
