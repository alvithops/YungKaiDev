import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

enum ThemeMode {
  light,
  dark,
}

class ThemeNotifier extends StateNotifier<ThemeMode> {
  ThemeNotifier() : super(ThemeMode.dark);

  void toggleTheme() {
    state = state == ThemeMode.dark ? ThemeMode.light : ThemeMode.dark;
  }
}

class LanguageNotifier extends StateNotifier<String> {
  LanguageNotifier() : super('en');

  void setLanguage(String language) {
    state = language;
  }
}

class CurrencyNotifier extends StateNotifier<String> {
  CurrencyNotifier() : super('IDR');

  void setCurrency(String currency) {
    state = currency;
  }
}