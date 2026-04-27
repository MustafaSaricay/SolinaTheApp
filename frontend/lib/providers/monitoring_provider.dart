/// providers/monitoring_provider.dart
///
/// Tracks pause/resume state and drives the SSE listener.
library;

import 'dart:async';

import 'package:flutter/foundation.dart';

import '../services/api_service.dart';
import 'battery_provider.dart';
import 'readings_provider.dart';

class MonitoringProvider extends ChangeNotifier {
  MonitoringProvider(
    this._api,
    this._batteryProvider,
    this._readingsProvider,
  ) {
    _listenToSse();
  }

  final ApiService _api;
  final BatteryProvider _batteryProvider;
  final ReadingsProvider _readingsProvider;

  bool _monitoring = true;
  StreamSubscription<Map<String, dynamic>>? _sseSub;

  bool get monitoring => _monitoring;

  void _listenToSse() {
    _sseSub = _api.sseStream().listen((event) {
      final eventName = event['event'] as String?;
      if (eventName == 'reading:taken') {
        _batteryProvider.updateFromEvent(event);
        _readingsProvider.refresh();
      } else if (eventName == 'monitoring:status') {
        _monitoring = event['monitoring'] as bool? ?? _monitoring;
        notifyListeners();
      }
    });
  }

  Future<void> toggle() async {
    try {
      _monitoring = await _api.toggleMonitoring();
      notifyListeners();
    } catch (_) {
      // keep existing state on error
    }
  }

  @override
  void dispose() {
    _sseSub?.cancel();
    super.dispose();
  }
}
