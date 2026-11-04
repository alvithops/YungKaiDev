/// Dashboard metrics model for executive overview
import 'package:flutter/material.dart';

class DashboardMetrics {
  final double totalRevenue;
  final int ticketsSold;
  final double attendanceRate;
  final double registrationTrend; // percentage change

  DashboardMetrics({
    required this.totalRevenue,
    required this.ticketsSold,
    required this.attendanceRate,
    required this.registrationTrend,
  });

  /// Format revenue as currency with thousands separator
  String get formattedRevenue {
    // Format number with thousands separator
    final number = totalRevenue.toInt().toString();
    final formatted = number
        .split('')
        .asMap()
        .entries
        .map((entry) {
          final index = entry.key;
          final digit = entry.value;
          // Add period every 3 digits from right
          if ((number.length - index) % 3 == 0 && index != 0) {
            return '$digit.';
          }
          return digit;
        })
        .join();

    return 'Rp $formatted';
  }

  /// Get attendance rate status color
  Color get attendanceColor {
    if (attendanceRate >= 90) return Color(0xFF22C55E);
    if (attendanceRate >= 75) return Color(0xFFFF9100);
    return Color(0xFFFF4444);
  }

  /// Get trend arrow icon data
  IconData get trendIcon {
    if (registrationTrend > 0) return Icons.trending_up;
    if (registrationTrend < 0) return Icons.trending_down;
    return Icons.arrow_forward;
  }

  /// Get trend text color
  Color get trendColor {
    if (registrationTrend > 0) return Color(0xFF22C55E);
    if (registrationTrend < 0) return Color(0xFFFF4444);
    return Color(0xFF6B7280);
  }
}