import 'package:flutter/material.dart';

class AppColorScheme {
  // Dark Glassmorphic Background
  static const Color background = Color(0x0F172A); // Obsidian
  static const Color surface = Color(0x1E293B);   // Slate 800
  static const color card = Color(0x334155);       // Slate 700 with opacity
  static const Color cardHover = Color(0x475569);  // Slate 600 hover

  // Restrained Accent - Soft Gold
  static const Color primary = Color(0xD4AF37);    // Soft Gold
  static const Color primaryContainer = Color(0x1E3A50);
  static const Color onPrimary = Color(0x0F172A);
  static const Color onPrimaryContainer = Color(0xE2D292);

  // Electric Indigo Alternative
  static const Color accent = Color(0x818CF8);     // Subtle Electric Indigo
  static const Color accentContainer = Color(0x080F29);
  static const Color onAccent = Color(0xF8FAFC);
  static const Color onAccentContainer = Color(0x3F51B5);

  // Status Colors
  static const Color success = Color(0x22C55E);
  static const Color warning = Color(0xF59E0B);
  static const Color error = Color(0xEF4444);
  static const Color info = Color(0x3B82F6);

  // Glassmorphic Glass Color
  static const Color glass = Color(0x1E293B);
  static const Color glassBorder = Color(0x334155);
  static const Color glassHighlight = Color(0x0F172A);

  // Neutral Colors
  static const Color textPrimary = Color(0xF8FAFC);
  static const Color textSecondary = Color(0x94A3B8);
  static const Color textMuted = Color(#64748B);
  static const Color divider = Color(0x374151);
}

extension ColorX on Color {
  Color withOpacity(double opacity) => Color(
        alpha: (opacity * 255).round(),
        red: red,
        green: green,
        blue: blue,
      );
}