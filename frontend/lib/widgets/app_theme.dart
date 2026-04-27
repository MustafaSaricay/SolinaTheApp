/// widgets/app_theme.dart
///
/// Centralised colour palette and ThemeData matching the forest-green
/// design of the original Electron app.
library;

import 'package:flutter/material.dart';

class SolinaColors {
  SolinaColors._();

  static const bg      = Color(0xFF1B4332);
  static const card    = Color(0xFF2D6A4F);
  static const cardHi  = Color(0xFF40916C);
  static const accent  = Color(0xFF52B788);
  static const pale    = Color(0xFF95D5B2);
  static const textCol = Color(0xFFD8F3DC);
  static const warn    = Color(0xFFF4A261);
  static const danger  = Color(0xFFE76F51);
}

ThemeData buildTheme() {
  return ThemeData(
    scaffoldBackgroundColor: SolinaColors.bg,
    colorScheme: ColorScheme.dark(
      primary: SolinaColors.accent,
      secondary: SolinaColors.pale,
      surface: SolinaColors.card,
      error: SolinaColors.danger,
    ),
    cardColor: SolinaColors.card,
    dividerColor: SolinaColors.cardHi,
    textTheme: const TextTheme(
      bodyMedium: TextStyle(color: SolinaColors.textCol),
      bodySmall:  TextStyle(color: SolinaColors.pale),
      titleMedium: TextStyle(color: SolinaColors.textCol, fontWeight: FontWeight.bold),
      labelSmall: TextStyle(color: SolinaColors.pale, fontSize: 10),
    ),
    appBarTheme: const AppBarTheme(
      backgroundColor: SolinaColors.bg,
      foregroundColor: SolinaColors.textCol,
      elevation: 0,
    ),
    elevatedButtonTheme: ElevatedButtonThemeData(
      style: ElevatedButton.styleFrom(
        backgroundColor: SolinaColors.accent,
        foregroundColor: SolinaColors.bg,
      ),
    ),
  );
}
