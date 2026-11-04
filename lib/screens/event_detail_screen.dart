import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:event_manage/core/models/event.dart';
import 'package:event_manage/core/providers/app_providers.dart';
import 'package:event_manage/core/theming/color_scheme.dart';
import 'package:event_manage/core/widgets/glassmorphic_card.dart';
import 'package:flutter_animate/flutter_animate.dart';

class EventDetailScreen extends ConsumerStatefulWidget {
  static const String routeName = '/events/detail';
  final String eventId;

  const EventDetailScreen({
    super.key,
    required this.eventId,
  });

  @override
  EventDetailScreenState createState() => EventDetailScreenState();
}

class EventDetailScreenState extends ConsumerState<EventDetailScreen> {
  @override
  void initState() {
    super.initState();
    // Load event detail
    WidgetsBinding.instance.addPostFrameCallback((_) {
      // ref.read(eventProvider.notifier).loadEvents();
    });
  }

  @override
  Widget build(BuildContext context) {
    final eventState = ref.watch(eventProvider);
    final event = eventState.getEventById(widget.eventId);

    return Scaffold(
      appBar: AppBar(
        title: Text(event.title),
        backgroundColor: Color(0x0F172A),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: GlassmorphicCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Event header
              Row(
                children: [
                  Container(
                    width: 50,
                    height: 50,
                    decoration: BoxDecoration(
                      color: event.color.withOpacity(0.1),
                      shape: BoxShape.circle,
                    ),
                    child: Icon(
                      Icons.event,
                      color: event.color,
                      size: 28,
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          event.title,
                          style: AppTextTheme.titleLarge,
                        ),
                        const SizedBox(height: 4),
                        Text(
                          event.date,
                          style: AppTextTheme.bodyMedium?.copyWith(
                            color: Color(0x94A3B8),
                          ),
                        ),
                      ],
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.favorite_border),
                    color: Color(0xD4AF37),
                    onPressed: () {
                      // Favorite action
                    },
                  ),
                ],
              ),
              const SizedBox(height: 24),
              // Event details
              _buildDetailRow(Icons.calendar_today, 'Tanggal', event.date),
              _buildDetailRow(Icons.location_on, 'Lokasi', event.location ?? 'Belum ditetapkan'),
              if (event.virtualLink != null) ...[
                _buildDetailRow(Icons.link, 'Link Virtual', event.virtualLink!),
              ],
              _buildDetailRow(Icons.person_outline, 'Kapasitas', '${event.ticketsSold}/${event.capacity}'),
              _buildDetailRow(Icons.monetization_on, 'Harga', 'Rp ${event.price.toInt()}'),
              const SizedBox(height: 24),
              // Action buttons
              Row(
                children: [
                  Expanded(
                    child: GlassmorphicButton(
                      text: 'Beli Tiket',
                      onPressed: () {
                        // Buy ticket action
                      },
                      backgroundColor: Color(0xD4AF37),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: GlassmorphicButton(
                      text: 'Share',
                      onPressed: () {
                        // Share action
                      },
                      backgroundColor: Colors.transparent,
                      foregroundColor: Color(0xD4AF37),
                      borderSide: const BorderSide(color: Color(0xD4AF37)),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildDetailRow(IconData icon, String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        children: [
          Icon(icon, size: 16, color: Color(0x64748B)),
          const SizedBox(width: 8),
          Text(
            label,
            style: AppTextTheme.labelLarge?.copyWith(
              color: Color(0x64748B),
              fontWeight: FontWeight.w500,
            ),
          ),
          const Spacer(),
          Text(
            value,
            style: AppTextTheme.bodyMedium?.copyWith(
              fontWeight: FontWeight.w500,
            ),
          ),
        ],
      ),
    );
  }
}