/// providers/settings_provider.dart
///
/// Loads and saves device settings.
library;

import 'package:flutter/foundation.dart';

import '../models/device_settings.dart';
import '../services/api_service.dart';

class SettingsProvider extends ChangeNotifier {
  SettingsProvider(this._api);

  final ApiService _api;

  DeviceSettings _settings = DeviceSettings.defaults();
  bool _loading = false;
  String? _error;

  DeviceSettings get settings => _settings;
  bool get loading => _loading;
  String? get error => _error;

  Future<void> load() async {
    _loading = true;
    _error = null;
    notifyListeners();
    try {
      _settings = await _api.getSettings();
    } catch (e) {
      _error = e.toString();
    } finally {
      _loading = false;
      notifyListeners();
    }
  }

  Future<void> save(DeviceSettings updated) async {
    _loading = true;
    _error = null;
    notifyListeners();
    try {
      _settings = await _api.saveSettings(updated);
    } catch (e) {
      _error = e.toString();
    } finally {
      _loading = false;
      notifyListeners();
    }
  }
}
