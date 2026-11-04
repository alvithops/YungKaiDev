import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

enum PaymentStatus {
  pending,
  processing,
  completed,
  failed,
  refunded,
}

class PaymentState {
  final PaymentStatus status;
  final String? transactionId;
  final double? amount;
  final DateTime? createdAt;

  PaymentState({
    this.status = PaymentStatus.pending,
    this.transactionId,
    this.amount,
    this.createdAt,
  });

  PaymentState copyWith({
    PaymentStatus? status,
    String? transactionId,
    double? amount,
    DateTime? createdAt,
  }) {
    return PaymentState(
      status: status ?? this.status,
      transactionId: transactionId ?? this.transactionId,
      amount: amount ?? this.amount,
      createdAt: createdAt ?? this.createdAt,
    );
  }
}

class PaymentNotifier extends StateNotifier<PaymentState> {
  PaymentNotifier() : super(PaymentState());

  void startPayment(double amount, String currency) {
    state = state.copyWith(
      status: PaymentStatus.processing,
      amount: amount,
    );
    // Simulate payment processing
    // In production, integrate with Midtrans/Xendit here
  }

  void completePayment(String transactionId) {
    state = state.copyWith(
      status: PaymentStatus.completed,
      transactionId: transactionId,
    );
  }

  void failPayment() {
    state = state.copyWith(status: PaymentStatus.failed);
  }

  void refundPayment() {
    state = state.copyWith(status: PaymentStatus.refunded);
  }
}