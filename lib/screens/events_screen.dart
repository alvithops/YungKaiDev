import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:event_manage/core/models/event.dart';
import 'package:event_manage/core/providers/app_providers.dart';
import 'package:event_manage/core/theming/color_scheme.dart';
import 'package:event_manage/core/widgets/glassmorphic_card.dart';
import 'package:event_manage/core/widgets/glassmorphic_button.dart';
import 'package:event_manage/core/widgets/glassmorphic_text_field.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_animate/flutter_animate.dart';

class EventsScreen extends ConsumerStatefulWidget {
  static const String routeName = '/events';
  const EventsScreen({super.key});

  @override
  EventsScreenState createState() => EventsScreenState();
}

class EventsScreenState extends ConsumerState<EventsScreen> {
  final _searchController = TextEditingController();
  final _searchFocus = FocusNode();
  String _filterQuery = '';

  @override
  void initState() {
    super.initState();
    // Load events initially
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(eventProvider.notifier).loadEvents();
    });
  }

  @override
  void dispose() {
    _searchController.dispose();
    _searchFocus.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final eventState = ref.watch(eventProvider);
    final filteredEvents = eventState.searchEvents(_filterQuery);

    return Scaffold(
      appBar: _buildAppBar(context, _searchController, _filterQuery, ref),
      body: Column(
        children: [
          // Search bar
          _buildSearchBar(_searchController, _searchFocus, ref),

          // Events list expanded
          Expanded(
            child: GlassmorphicCard(
              child: Padding(
                padding: const EdgeInsets.all(20.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Header text
                    Text(
                      'Daftar Event',
                      style: AppTextTheme.titleLarge,
                    ),
                    const SizedBox(height: 16),

                    // Empty state
                    if (filteredEvents.isEmpty)
                      _buildEmptyState()
                    else
                      // Events list
                      Expanded(
                        child: Animate(
                          effects: const [
                            FadeEffect(
                              duration: Duration(milliseconds: 400),
                            ),
                            SlideEffect(
                              duration: Duration(milliseconds: 400),
                              begin: Offset(0, 0.1),
                            ),
                          ],
                          child: ListView.builder(
                            itemCount: filteredEvents.length,
                            itemBuilder: (context, index) {
                              final event = filteredEvents[index];
                              return _buildEventCard(context, event);
                            },
                          ),
                        ),
                      ),

                    // Add event floating action
                    Align(
                      alignment: Alignment.bottomRight,
                      child: FloatingActionButton.extended(
                        onPressed: () => _showAddEventDialog(context),
                        label: const Text('Tambah Event'),
                        icon: const Icon(Icons.add),
                        backgroundColor: Color(0xD4AF37),
                        foregroundColor: Color(0x0F172A),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  /// Build app bar with search
  AppBar _buildAppBar(
      BuildContext context,
      TextEditingController searchController,
      String filterQuery,
      WidgetRef ref) {
    return AppBar(
      title: const Text('Event Management'),
      actions: [
        IconButton(
          icon: const Icon(Icons.filter_list),
          tooltip: 'Filter',
          onPressed: () {
            // Filter modal
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(content: Text('Fitur filter akan segera hadir')),
            );
          },
        ),
      ],
      bottom: PreferredSize(
        preferredSize: const Size.fromHeight(kToolbarHeight),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          child: GlassmorphicTextField(
            controller: searchController,
            hintText: 'Cari event...',
            prefixIcon: const Icon(Icons.search, color: Color(0x64748B)),
            onChanged: (value) {
              setState(() {
                _filterQuery = value;
              });
            },
          ),
        ),
      ),
    );
  }

  /// Build search bar
  Widget _buildSearchBar(
      TextEditingController controller,
      FocusNode focusNode,
      WidgetRef ref) {
    return Container(
      height: 48,
      margin: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
      child: TextField(
        controller: controller,
        focusNode: focusNode,
        decoration: InputDecoration(
          hintText: 'Cari event berdasarkan nama atau tanggal...',
          prefixIcon: const Icon(Icons.search, color: Color(0x64748B)),
          suffixIcon: controller.text.isNotEmpty
              ? IconButton(
                  icon: const Icon(Icons.close),
                  onPressed: () {
                    controller.clear();
                    setState(() {
                      _filterQuery = '';
                    });
                  },
                )
              : null,
          filled: true,
          fillColor: Color(0x1E293B).withOpacity(0.3),
          enabledBorder: OutlineInputBorder(
            borderSide: const BorderSide(color: Color(0x374151)),
            borderRadius: BorderRadius.circular(12),
          ),
          focusedBorder: OutlineInputBorder(
            borderSide: const BorderSide(color: Color(0xD4AF37), width: 2),
            borderRadius: BorderRadius.circular(12),
          ),
        ),
      ),
    );
  }

  /// Build empty state when no events
  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            Icons.event_busy,
            size: 64,
            color: Color(0x64748B),
          ),
          const SizedBox(height: 16),
          Text(
            'Belum ada event',
            style: AppTextTheme.bodyMedium,
          ),
          const SizedBox(height: 8),
          Text(
            'Klik tombol "+ Tambah Event" untuk memulai',
            style: AppTextTheme.labelLarge?.copyWith(
              color: Color(0x64748B),
            ),
          ),
        ],
      ),
    );
  }

  /// Build individual event card
  Widget _buildEventCard(BuildContext context, Event event) {
    return Animate(
      effects: const [
        FadeEffect(
          duration: Duration(milliseconds: 300),
        ),
        SlideEffect(
          duration: Duration(milliseconds: 300),
          begin: Offset(0, 0.1),
        ),
      ],
      child: GlassmorphicCard(
        margin: const EdgeInsets.only(bottom: 12),
        child: ListTile(
          contentPadding: const EdgeInsets.all(16),
          leading: Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: event.color.withOpacity(0.15),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Icon(
              Icons.event,
              color: event.color,
              size: 20,
            ),
          ),
          title: Text(
            event.title,
            style: AppTextTheme.titleMedium?.copyWith(
              fontWeight: FontWeight.w600,
            ),
          ),
          subtitle: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Icon(
                    Icons.calendar_today,
                    size: 12,
                    color: Color(0x94A3B8),
                  ),
                  const SizedBox(width: 4),
                  Text(
                    event.date,
                    style: AppTextTheme.bodyMedium?.copyWith(
                      color: Color(0x94A3B8),
                    ),
                  ),
                ],
              ),
              if (event.description != null && event.description!.isNotEmpty) ...[
                const SizedBox(height: 4),
                Text(
                  event.description!,
                  style: AppTextTheme.labelLarge?.copyWith(
                    color: Color(0x64748B),
                    fontSize: 11,
                  ),
                ),
              ],
            ],
          ),
          trailing: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              // View details button
              Tooltip(
                message: 'Lihat detail',
                child: IconButton(
                  icon: const Icon(Icons.remove_circle_outlined,
                      color: Color(0x64748B), size: 18),
                  onPressed: () {
                    context.go('/events/detail/${event.id}');
                  },
                ),
              ),
              // Delete button
              Tooltip(
                message: 'Hapus event',
                child: IconButton(
                  icon: const Icon(Icons.delete_outline,
                      color: Color(0xEF4444), size: 18),
                  onPressed: () => _deleteEvent(context, event.id),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  /// Show add event dialog
  void _showAddEventDialog(BuildContext context) {
    final titleController = TextEditingController();
    final descriptionController = TextEditingController();
    int capacity = 100;
    double price = 0;
    DateTime selectedDate = DateTime.now();

    showDialog(
      context: context,
      builder: (context) => GlassmorphicCard(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  'Tambah Event Baru',
                  style: AppTextTheme.titleLarge,
                ),
                const SizedBox(height: 24),
                GlassmorphicTextField(
                  controller: titleController,
                  labelText: 'Nama Event',
                  hintText: 'Masukkan nama event',
                  validator: (value) {
                    if (value == null || value.isEmpty) {
                      return 'Judul event wajib diisi';
                    }
                    return null;
                  },
                ),
                const SizedBox(height: 16),
                GlassmorphicTextField(
                  controller: descriptionController,
                  labelText: 'Deskripsi',
                  hintText: 'Deskripsi event (opsional)',
                ),
                const SizedBox(height: 16),
                // Date selector
                ListTile(
                  title: Text(
                    'Tanggal Event: ${selectedDate.toString().split(' ')[0]}',
                    style: AppTextTheme.bodyMedium,
                  ),
                  trailing: const Icon(Icons.arrow_forward_ios,
                      size: 12, color: Color(0x64748B)),
                  onTap: () async {
                    final picked = await showDatePicker(
                      context: context,
                      initialDate: selectedDate,
                      firstDate: DateTime(2020),
                      lastDate: DateTime(2030),
                    );
                    if (picked != null && picked != selectedDate) {
                      setState(() {
                        selectedDate = picked;
                      });
                    }
                  },
                ),
                const SizedBox(height: 16),
                // Capacity
                ListTile(
                  title: Text(
                    'Kapasitas: $capacity',
                    style: AppTextTheme.bodyMedium,
                  ),
                  trailing: const Icon(Icons.arrow_forward_ios,
                      size: 12, color: Color(0x64748B)),
                  onTap: () {
                    // Show capacity dialog
                  },
                ),
                const SizedBox(height: 16),
                // Price
                ListTile(
                  title: Text(
                    'Harga Tiket: Rp ${price.toStringAsFixed(0)}',
                    style: AppTextTheme.bodyMedium,
                  ),
                  trailing: const Icon(Icons.arrow_forward_ios,
                      size: 12, color: Color(0x64748B)),
                  onTap: () {
                    // Show price dialog
                  },
                ),
                const SizedBox(height: 24),
                GlassmorphicButton(
                  text: 'Buat Event',
                  onPressed: () {
                    final newEvent = Event(
                      id: DateTime.now().millisecondsSinceEpoch.toString(),
                      title: titleController.text,
                      date: selectedDate.toString().split(' ')[0],
                      capacity: capacity,
                      price: price,
                      color: Color(0xD4AF37),
                    );
                    ref.read(eventProvider.notifier).addEvent(newEvent);
                    Navigator.of(context).pop();
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(
                        content: Text('Event berhasil dibuat'),
                        backgroundColor: Color(0x22C55E),
                        behavior: SnackBarBehavior.floating,
                      ),
                    );
                  },
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  /// Delete event
  void _deleteEvent(BuildContext context, String eventId) {
    ref.read(eventProvider.notifier).removeEvent(eventId);
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('Event berhasil dihapus'),
        backgroundColor: Color(0xEF4444),
        behavior: SnackBarBehavior.floating,
      ),
    );
  }
}