import 'dart:convert';

import 'package:flutter/material.dart';

class Event {
  final String id;
  final String title;
  final String date;
  final String? description;
  final String? location;
  final String? virtualLink;
  final int capacity;
  final int ticketsSold;
  final double price;
  final Color color;
  final String? qrCodeData;
  final DateTime createdAt;

  Event({
    required this.id,
    required this.title,
    required this.date,
    this.description,
    this.location,
    this.virtualLink,
    required this.capacity,
    required this.ticketsSold,
    required this.price,
    required this.color,
    this.qrCodeData,
    required this.createdAt,
  });

  /// Copy with method for updates
  Event copyWith({
    String? id,
    String? title,
    String? date,
    String? description,
    String? location,
    String? virtualLink,
    int? capacity,
    int? ticketsSold,
    double? price,
    Color? color,
    String? qrCodeData,
    DateTime? createdAt,
  }) {
    return Event(
      id: id ?? this.id,
      title: title ?? this.title,
      date: date ?? this.date,
      description: description ?? this.description,
      location: location ?? this.location,
      virtualLink: virtualLink ?? this.virtualLink,
      capacity: capacity ?? this.capacity,
      ticketsSold: ticketsSold ?? this.ticketsSold,
      price: price ?? this.price,
      color: color ?? this.color,
      qrCodeData: qrCodeData ?? this.qrCodeData,
      createdAt: createdAt ?? this.createdAt,
    );
  }

  /// Convert to JSON
  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'title': title,
      'date': date,
      'description': description,
      'location': location,
      'virtualLink': virtualLink,
      'capacity': capacity,
      'ticketsSold': ticketsSold,
      'price': price,
      'color': color.value,
      'qrCodeData': qrCodeData,
      'createdAt': createdAt.toIso8601String(),
    };
  }

  /// Factory from JSON
  factory Event.fromMap(Map<String, dynamic> map) {
    final DateTime? parsedDate =
        map['date'] != null ? DateTime.parse(map['date']) : null;
    final Color parsedColor = Color(map['color'] ?? 0xD4AF37);
    return Event(
      id: map['id'] ?? DateTime.now().millisecondsSinceEpoch.toString(),
      title: map['title'] ?? '',
      date: map['date'] ?? '',
      description: map['description'],
      location: map['location'],
      virtualLink: map['virtualLink'],
      capacity: map['capacity'] ?? 100,
      ticketsSold: map['ticketsSold'] ?? 0,
      price: (map['price'] ?? 0).toDouble(),
      color: parsedColor,
      qrCodeData: map['qrCodeData'],
      createdAt: parsedDate ?? DateTime.now(),
    );
  }

  /// String representation
  @override
  String toString() {
    return 'Event(id: $id, title: $title, date: $date)';
  }
}