import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

// Screen imports
import 'screens/dashboard_screen.dart';
import 'screens/events_screen.dart';
import 'screens/event_detail_screen.dart';
import 'screens/settings_screen.dart';

// Route constants
const dashboardRoute = '/dashboard';
const eventsRoute = '/events';
const eventDetailRoute = '/events/detail/:eventId';
const settingsRoute = '/settings';

// GoRouter configuration
final goRouter = GoRouter(
  initialPath: dashboardRoute,
  routes: [
    GoRoute(
      path: dashboardRoute,
      name: DashboardScreen.routeName,
      builder: (context, state) => const DashboardScreen(),
    ),
    GoRoute(
      path: eventsRoute,
      name: EventsScreen.routeName,
      builder: (context, state) => const EventsScreen(),
    ),
    GoRoute(
      path: eventDetailRoute,
      name: EventDetailScreen.routeName,
      builder: (context, state) {
        final eventId = state.pathParameters['eventId'] ?? '';
        return EventDetailScreen(eventId: eventId);
      },
    ),
    GoRoute(
      path: settingsRoute,
      name: SettingsScreen.routeName,
      builder: (context, state) => const SettingsScreen(),
    ),
  ],
);