import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import 'package:event_manage/core/models/event.dart';
import 'package:event_manage/core/models/dashboard_metrics.dart';
import 'package:event_manage/core/providers/event_notifier.dart';
import 'package:event_manage/core/providers/payment_notifier.dart';

// Event event event model provider
final eventProvider = StateNotifierProvider<EventNotifier, EventState>((ref) {
  return EventNotifier();
});

// Selected event provider
final selectedEventProvider = StateProvider<String?>((ref) => null);

// Dashboard metrics provider
final dashboardMetricsProvider = FutureProvider((ref) {
  // In production, this would fetch from API
  return DashboardMetrics(
    totalRevenue: 2457890,
    ticketsSold: 3421,
    attendanceRate: 87.5,
    registrationTrend: 12.5,
  );
});

// Theme provider
final themeProvider = StateNotifierProvider<ThemeNotifier, ThemeMode>((ref) {
  return ThemeNotifier(ThemeMode.dark);
});

// Language provider
final languageProvider = StateNotifierProvider<LanguageNotifier, String>((ref) {
  return 'en';
});

// Currency provider
final currencyProvider = StateNotifierProvider<CurrencyNotifier, String>((ref) {
  return 'IDR';
});

// QR code data provider
final qrCodeProvider = StateProvider((ref) => '');

// Event form state provider
final eventFormProvider = StateProvider((ref) => {
  'title': '',
  'date': '',
  'description': '',
  'capacity': '',
  'ticketPrice': 0,
});

// Payment provider
final paymentProvider = StateNotifierProvider<PaymentNotifier, PaymentState>((ref) {
  return PaymentNotifier();
});

// Seating map provider
final seatingMapProvider = StateNotifierProvider<SeatingMapNotifier, SeatingMapState>((ref) {
  return SeatingMapNotifier();
});