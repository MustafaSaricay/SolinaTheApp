/// screens/settings_screen.dart
///
/// Modal dialog / sheet for editing device settings.
library;

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../models/device_settings.dart';
import '../providers/settings_provider.dart';
import '../widgets/app_theme.dart';

class SettingsScreen extends StatefulWidget {
  const SettingsScreen({super.key});

  static Future<void> show(BuildContext context) {
    return showDialog(
      context: context,
      builder: (_) => const SettingsScreen(),
    );
  }

  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  final _formKey = GlobalKey<FormState>();
  late TextEditingController _deviceName;
  late TextEditingController _capacity;
  late TextEditingController _interval;
  late TextEditingController _co2;

  @override
  void initState() {
    super.initState();
    final s = context.read<SettingsProvider>().settings;
    _deviceName = TextEditingController(text: s.deviceName);
    _capacity   = TextEditingController(text: s.batteryCapacityWh.toString());
    _interval   = TextEditingController(text: s.pollIntervalSeconds.toString());
    _co2        = TextEditingController(text: s.co2GramsPerKwh.toString());
  }

  @override
  void dispose() {
    _deviceName.dispose();
    _capacity.dispose();
    _interval.dispose();
    _co2.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;
    final updated = DeviceSettings(
      deviceName:          _deviceName.text.trim(),
      batteryCapacityWh:   double.parse(_capacity.text),
      pollIntervalSeconds: int.parse(_interval.text),
      co2GramsPerKwh:      double.parse(_co2.text),
    );
    await context.read<SettingsProvider>().save(updated);
    if (mounted) Navigator.of(context).pop();
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      backgroundColor: SolinaColors.card,
      title: const Text('⚙ Settings', style: TextStyle(color: SolinaColors.textCol)),
      content: Form(
        key: _formKey,
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              _field(
                controller: _deviceName,
                label: 'Device name',
                validator: (v) => (v == null || v.trim().isEmpty) ? 'Required' : null,
              ),
              _field(
                controller: _capacity,
                label: 'Battery capacity (Wh)',
                keyboardType: TextInputType.number,
                validator: (v) {
                  final n = double.tryParse(v ?? '');
                  if (n == null || n <= 0) return 'Enter a positive number';
                  return null;
                },
              ),
              _field(
                controller: _interval,
                label: 'Poll interval (seconds)',
                keyboardType: TextInputType.number,
                validator: (v) {
                  final n = int.tryParse(v ?? '');
                  if (n == null || n < 10) return 'Minimum 10 seconds';
                  return null;
                },
              ),
              _field(
                controller: _co2,
                label: 'CO₂ intensity (g/kWh)',
                keyboardType: TextInputType.number,
                validator: (v) {
                  final n = double.tryParse(v ?? '');
                  if (n == null || n < 0) return 'Enter a non-negative number';
                  return null;
                },
              ),
            ],
          ),
        ),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.of(context).pop(),
          child: const Text('Cancel', style: TextStyle(color: SolinaColors.pale)),
        ),
        ElevatedButton(
          onPressed: _save,
          child: const Text('Save'),
        ),
      ],
    );
  }

  Widget _field({
    required TextEditingController controller,
    required String label,
    TextInputType? keyboardType,
    String? Function(String?)? validator,
  }) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: TextFormField(
        controller: controller,
        keyboardType: keyboardType,
        validator: validator,
        style: const TextStyle(color: SolinaColors.textCol),
        decoration: InputDecoration(
          labelText: label,
          labelStyle: const TextStyle(color: SolinaColors.pale),
          enabledBorder: const OutlineInputBorder(
            borderSide: BorderSide(color: SolinaColors.cardHi),
          ),
          focusedBorder: const OutlineInputBorder(
            borderSide: BorderSide(color: SolinaColors.accent),
          ),
          errorBorder: const OutlineInputBorder(
            borderSide: BorderSide(color: SolinaColors.danger),
          ),
          focusedErrorBorder: const OutlineInputBorder(
            borderSide: BorderSide(color: SolinaColors.danger),
          ),
        ),
      ),
    );
  }
}
