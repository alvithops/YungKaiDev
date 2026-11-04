import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

class Seat {
  final String id;
  final String label;
  final bool isSelected;
  final double price;

  Seat({
    required this.id,
    required this.label,
    this.isSelected = false,
    required this.price,
  });

  Seat copyWith({
    String? id,
    String? label,
    bool? isSelected,
    double? price,
  }) {
    return Seat(
      id: id ?? this.id,
      label: label ?? this.label,
      isSelected: isSelected ?? this.isSelected,
      price: price ?? this.price,
    );
  }
}

class SeatingMapState {
  final List<Seat> seats;
  final List<Seat> selectedSeats;

  SeatingMapState({
    required this.seats,
    required this.selectedSeats,
  });

  SeatingMapState copyWith({
    List<Seat>? seats,
    List<Seat>? selectedSeats,
  }) {
    return SeatingMapState(
      seats: seats ?? this.seats,
      selectedSeats: selectedSeats ?? this.selectedSeats,
    );
  }
}

class SeatingMapNotifier extends StateNotifier<SeatingMapState> {
  SeatingMapNotifier()
      : super(const SeatingMapState(
          seats: [],
          selectedSeats: [],
        ));

  /// Initialize seating map with seat layout
  void initializeSeats(int rows, int seatsPerRow, {double seatPrice = 50000}) {
    final totalSeats = rows * seatsPerRow;
    final List<Seat> seatList = [];

    for (int row = 0; row < rows; row++) {
      for (int seat = 0; seat < seatsPerRow; seat++) {
        final seatId = 'R${row + 1}S${seat + 1}';
        seatList.add(Seat(
          id: seatId,
          label: seatId,
          price: seatPrice,
        ));
      }
    }

    state = SeatingMapState(seats: seatList, selectedSeats: []);
  }

  /// Toggle seat selection
  void toggleSeat(String seatId) {
    final seatIndex =
        state.seats.indexWhere((seat) => seat.id == seatId);
    if (seatIndex == -1) return;

    final updatedSeat = state.seats[seatIndex].copyWith();

    if (state.selectedSeats.any((s) => s.id == seatId)) {
      // Deselect
      state = state.copyWith(selectedSeats: [
        for (final s in state.selectedSeats) if (s.id != seatId) s
      ]);
    } else {
      // Select
      state = state.copyWith(
        selectedSeats: [...state.selectedSeats, updatedSeat],
      );
    }
  }

  /// Get total price for selected seats
  double get selectedSeatsPrice =>
      state.selectedSeats.fold(0, (sum, seat) => sum + seat.price);
}