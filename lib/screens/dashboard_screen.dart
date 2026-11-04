import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:event_manage/core/models/dashboard_metrics.dart';
import 'package:event_manage/core/providers/app_providers.dart';
import 'package:event_manage/core/theming/text_theme.dart';
import 'package:flutter_animate/flutter_animate.dart';

class DashboardScreen extends ConsumerStatefulWidget {
  static const String routeName = '/dashboard';
  const DashboardScreen({super.key});

  @override
  ConsumerState<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends ConsumerState<DashboardScreen> {
  @override
  void initState() {
    super.initState();
    // Trigger dashboard data loading
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(dashboardMetricsProvider.future);
    });
  }

  @override
  Widget build(BuildContext context) {
    final metrics = ref.watch(dashboardMetricsProvider.future);
    final theme = Theme.of(context);

    return CustomScrollView(
      physics: const BouncingScrollPhysics(),
      slivers: [
        // Header with glassmorphic profile
        SliverToBoxAdapter(
          child: Padding(
            padding: const EdgeInsets.all(24.0),
            child: GlassmorphicCard(
              child: Row(
                children: [
                  // Avatar
                  Container(
                    width: 56,
                    height: 56,
                    decoration: BoxDecoration(
                      color: Color(0xD4AF37),
                      shape: BoxShape.circle,
                      border: Border.all(color: Colors.white, width: 2),
                    ),
                    child: const Icon(
                      Icons.person,
                      color: Color(0x0F172A),
                      size: 32,
                    ),
                  ),
                  const SizedBox(width: 16),
                  // User info
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Selamat Datang,',
                          style: AppTextTheme.labelLarge,
                        ),
                        const SizedBox(height: 4),
                        Text(
                          'Admin Event Manager',
                          style: AppTextTheme.titleMedium,
                        ),
                      ],
                    ),
                  ),
                  // Notification icon
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: Color(0xEF4444).withOpacity(0.1),
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(
                      Icons.notifications_none,
                      color: Color(0xEF4444),
                      size: 20,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),

        // Metric Cards Grid
        SliverGrid(
          gridDelegate: const SliverGridDelegate(
            crossAxisCount: 2,
            mainAxisExtent: 140,
            crossAxisSpacing: 16,
            mainAxisSpacing: 16,
          ),
          delegate: SliverChildBuilderDelegate(
            (context, index) {
              final List<DashboardMetrics> metricsList = [
                DashboardMetrics(
                  totalRevenue: 2457890,
                  ticketsSold: 3421,
                  attendanceRate: 87.5,
                  registrationTrend: 12.5,
                ),
                DashboardMetrics(
                  totalRevenue: 1852340,
                  ticketsSold: 2894,
                  attendanceRate: 76.3,
                  registrationTrend: -5.2,
                ),
                DashboardMetrics(
                  totalRevenue: 3125670,
                  ticketsSold: 4187,
                  attendanceRate: 92.1,
                  registrationTrend: 18.7,
                ),
                DashboardMetrics(
                  totalRevenue: 1523450,
                  ticketsSold: 2150,
                  attendanceRate: 68.9,
                  registrationTrend: -3.8,
                ),
              ];

              final metrics = metricsList[index];

              return Animate(
                effects: const [
                  FadeEffect(
                    duration: Duration(milliseconds: 500),
                  ),
                  SlideEffect(
                    duration: Duration(milliseconds: 500),
                    begin: Offset(0, 0.2),
                  ),
                ],
                child: _MetricCard(
                  title: _getMetricTitle(index),
                  value: _getMetricValue(index, metrics),
                  subtitle: _getMetricSubtitle(index, metrics),
                  icon: _getMetricIcon(index),
                  color: _getMetricColor(index),
                ),
              );
            },
            childCount: 4,
          ),
        ),

        // Quick Stats Section
        SliverToBoxAdapter(
          child: Animate(
            effects: const [
              FadeEffect(
                duration: Duration(milliseconds: 600),
                delay: Duration(milliseconds: 100),
              ),
            ],
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Ringkasan Terbaru',
                    style: AppTextTheme.titleLarge,
                  ),
                  const SizedBox(height: 16),
                  _QuickStatRow(
                    label: 'Total Event',
                    value: '12+',
                    icon: Icons.event,
                    trailing: '+3 this month',
                    color: Color(0xD4AF37),
                  ),
                  const SizedBox(height: 12),
                  _QuickStatRow(
                    label: 'Total Pendaftar',
                    value: '4.567',
                    icon: Icons.person,
                    trailing: '+124 hari ini',
                    color: Color(0x818CF8),
                  ),
                  const SizedBox(height: 12),
                  _QuickStatRow(
                    label: 'Rata-rata Kehadiran',
                    value: '82%',
                    icon: Icons.calendar_today,
                    trailing: '+5% minggu ini',
                    color: Color(0x3B82F6),
                  ),
                ],
              ),
            ),
          ),
        ),
      ],
    );
  }

  String _getMetricTitle(int index) {
    switch (index) {
      case 0:
        return 'Pendapatan';
      case 1:
        return 'Tickets Terjual';
      case 2:
        return 'Tingkat Kehadiran';
      case 3:
        return 'Trend Pendaftar';
      default:
        return 'Metrik';
  }

  String _getMetricValue(int index, DashboardMetrics metrics) {
    switch (index) {
      case 0:
        return metrics.formattedRevenue;
      case 1:
        return '${metrics.ticketsSold}';
      case 2:
        return '${metrics.attendanceRate}%';
      case 3:
        return '${metrics.registrationTrend > 0 ? '+' : ''}${metrics.registrationTrend}%';
      default:
        return '-';
    }
  }

  String _getMetricSubtitle(int index, DashboardMetrics metrics) {
    switch (index) {
      case 0:
        return 'Total pendapatan hari ini';
      case 1:
        return ' dari target bulanan';
      case 2:
        return 'kini';
      case 3:
        return 'vs minggu lalu';
      default:
        return '';
    }
  }

  IconData _getMetricIcon(int index) {
    switch (index) {
      case 0:
        return Icons.money;
      case 1:
        return Icons.ticket;
      case 2:
        return Icons.bar_chart;
      case 3:
        return Icons.trending_up;
      default:
        return Icons.bar_chart;
    }
  }

  Color _getMetricColor(int index) {
    switch (index) {
      case 0:
        return Color(0xD4AF37); // Gold
      case 1:
        return Color(0x818CF8); // Indigo
      case 2:
        return Color(0x22C55E); // Green
      case 3:
        return Color(0xF59E0B); // Yellow
      default:
        return Color(0x94A3B8);
    }
  }
}

class _MetricCard extends StatelessWidget {
  final String title;
  final String value;
  final String subtitle;
  final IconData icon;
  final Color color;

  const _MetricCard({
    required this.title,
    required this.value,
    required this.subtitle,
    required this.icon,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return GlassmorphicCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: color.withOpacity(0.1),
                  shape: BoxShape.circle,
                ),
                child: Icon(icon, color: color, size: 20),
              ),
              const Spacer(),
              Text(
                value,
                style: TextStyle(
                  color: color,
                  fontSize: 20,
                  fontWeight: FontWeight.bold,
                  fontFamily: 'Plus Jakarta Sans',
                ),
              ),
            ],
          ),
          const SizedBox(height: 4),
          Text(
            title,
            style: AppTextTheme.bodyMedium,
          ),
          const SizedBox(height: 2),
          Text(
            subtitle,
            style: AppTextTheme.labelLarge?.copyWith(
              color: Color(0x64748B),
            ),
          ),
        ],
      ),
    );
  }
}

class _QuickStatRow extends StatelessWidget {
  final String label;
  final String value;
  final IconData icon;
  final String trailing;
  final Color color;

  const _QuickStatRow({
    required this.label,
    required this.value,
    required this.icon,
    required this.trailing,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Row(
          children: [
            Icon(icon, size: 16, color: color),
            const SizedBox(width: 8),
            Text(
              label,
              style: AppTextTheme.bodyMedium,
            ),
          ],
        ),
        Text(
          value,
          style: AppTextTheme.bodyMedium?.copyWith(
            color: color,
            fontWeight: FontWeight.w500,
          ),
        ),
        Text(
          trailing,
          style: AppTextTheme.labelLarge?.copyWith(
            color: Color(0x64748B),
            fontSize: 10,
          ),
        ),
      ],
    );
  }
}