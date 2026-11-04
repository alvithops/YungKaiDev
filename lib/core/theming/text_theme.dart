import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class AppTextTheme {
  // Primary font: Plus Jakarta Sans
  static const TextStyle displayLarge = TextStyle(
    fontSize: 32,
    fontWeight: FontWeight.bold,
    fontFamily: 'Plus Jakarta Sans',
    color: Color(0xF8FAFC),
    letterSpacing: -0.5,
  );

  static const TextStyle displayMedium = TextStyle(
    fontSize: 24,
    fontWeight: FontWeight.w600,
    fontFamily: 'Plus Jakarta Sans',
    color: Color(0xF8FAFC),
    letterSpacing: -0.4,
  );

  static const TextStyle titleLarge = TextStyle(
    fontSize: 20,
    fontWeight: FontWeight.w600,
    fontFamily: 'Plus Jakarta Sans',
    color: Color(0xF8FAFC),
    letterSpacing: -0.3,
  );

  static const TextStyle titleMedium = TextStyle(
    fontSize: 16,
    fontWeight: FontWeight.w500,
    fontFamily: 'Plus Jakarta Sans',
    color: Color(0xF1F5F9),
    letterSpacing: -0.2,
  );

  static const TextStyle bodyLarge = TextStyle(
    fontSize: 14,
    fontFamily: 'Plus Jakarta Sans',
    color: Color(0xC5C6C8),
    height: 1.5,
  );

  static const TextStyle bodyMedium = TextStyle(
    fontSize: 12,
    fontFamily: 'Plus Jakarta Sans',
    color: Color(0x94A3B8),
    height: 1.4,
  );

  // Caption and label
  static const TextStyle labelLarge = TextStyle(
    fontSize: 11,
    fontWeight: FontWeight.w600,
    fontFamily: 'Plus Jakarta Sans',
    color: Color(0x94A3B8),
    letterSpacing: 0.5,
  );

  static const TextStyle titleSmall = TextStyle(
    fontSize: 10,
    fontWeight: FontWeight.w500,
    fontFamily: 'Plus Jakarta Sans',
    color: Color(0x64748B),
  );

  // Glassmorphic subtitle
  static const TextStyle glassSubtitle = TextStyle(
    fontSize: 11,
    fontFamily: 'Plus Jakarta Sans',
    color: Color(0x94A3B8),
  );

  // Accent style
  static const TextStyle accentBold = TextStyle(
    fontSize: 14,
    fontWeight: FontWeight.bold,
    fontFamily: 'Plus Jakarta Sans',
    color: Color(0xD4AF37),
  );

  static const TextStyle accentRegular = TextStyle(
    fontSize: 12,
    fontFamily: 'Plus Jakarta Sans',
    color: Color(0xD4AF37),
  );

  // Theme data applicaton
  static TextTheme get lightTheme => TextTheme(
        displayLarge: displayLarge,
        displayMedium: displayMedium,
        titleLarge: titleLarge,
        titleMedium: titleMedium,
        bodyLarge: bodyLarge,
        bodyMedium: bodyMedium,
        labelLarge: labelLarge,
        titleSmall: titleSmall,
      );

  static TextTheme get darkTheme => TextTheme(
        displayLarge: displayLarge.copyWith(color: Color(0x0F172A)),
        displayMedium: displayMedium.copyWith(color: Color(0xF8FAFC)),
        titleLarge: titleLarge.copyWith(color: Color(0xF8FAFC)),
        titleMedium: titleMedium.copyWith(color: Color(0xF1F5F9)),
        bodyLarge: bodyLarge.copyWith(color: Color(0xC5C6C8)),
        bodyMedium: bodyMedium.copyWith(color: Color(0x94A3B8)),
        labelLarge: labelLarge.copyWith(color: Color(0x94A3B8)),
        titleSmall: titleSmall.copyWith(color: Color(0x64748B)),
      );

  // Apply Google Fonts globally
  static TextStyle applyGoogleFonts(TextStyle style) {
    return GoogleFonts.plusJakartaSans(
      textStyle: style,
    );
  }
}