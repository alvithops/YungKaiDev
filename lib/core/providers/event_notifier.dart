import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:event_manage/core/models/event.dart';

/// Event state class
class EventState {
  final List<Event> events;
  final bool isLoading;
  final String? error;

  EventState({
    required this.events,
    this.isLoading = false,
    this.error,
  });

  EventState copyWith({
    List<Event>? events,
    bool? isLoading,
    String? error,
  }) {
    return EventState(
      events: events ?? this.events,
      isLoading: isLoading ?? this.isLoading,
      error: error ?? this.error,
    );
  }
}

/// Event notifier for managing event state
class EventNotifier extends StateNotifier<EventState> {
  EventNotifier() : super(const EventState(events: []));

  /// Add new event
  void addEvent(Event event) {
    state = state.copyWith(
      events: [event, ...state.events],
    );
  }

  /// Remove event by ID
  void removeEvent(String eventId) {
    state = state.copyWith(
      events: state.events.where((e) => e.id != eventId).toList(),
    );
  }

  /// Update event
  void updateEvent(Event event) {
    final updatedEvents = state.events.map((e) {
      if (e.id == event.id) return event;
      return e;
    }).toList();

    state = state.copyWith(events: updatedEvents);
  }

  /// Load events (simulate API call)
  Future<void> loadEvents() async {
    state = state.copyWith(isLoading: true);
    // Simulate network delay
    await Future.delayed(const Duration(milliseconds: 500));
    // In production, fetch from API
    state = state.copyWith(isLoading: false);
  }

  /// Search events
  List<Event> searchEvents(String query) {
    if (query.isEmpty) return state.events;
    return state.events
        .where((event) =>
            event.title.toLowerCase().contains(query.toLowerCase()) ||
            event.description!
                .toLowerCase()
                .contains(query.toLowerCase()))
        .toList();
  }

  /// Get event by ID
  Event? getEventById(String eventId) {
    return state.events.firstWhere(
      (event) => event.id == eventId,
      orElse: () => throw Exception('Event not found'),
    );
  }
}