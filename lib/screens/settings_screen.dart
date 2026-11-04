import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:event_manage/core/providers/theme_language_currency_notifier.dart';
import 'package:event_manage/core/theming/color_scheme.dart';
import 'package:event_manage/core/widgets/glassmorphic_card.dart';

class SettingsScreen extends ConsumerStatefulWidget {
  static const String routeName = '/settings';

  const SettingsScreen({super.key});

  @override
  SettingsScreenState createState() => SettingsScreenState();
}

class SettingsScreenState extends ConsumerState<SettingsScreen> {
  @override
  void initState() {
    super.initState();
  }

  @override
  Widget build(BuildContext context) {
    final themeNotifier = ref.watch(themeProvider);
    final languageNotifier = ref.watch(languageProvider);
    final currencyNotifier = ref.watch(currencyProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Settings'),
        backgroundColor: Color(0x0F172A),
      ),
      body: GlassmorphicCard(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Theme toggle
              ListTile(
                leading: Icon(
                  themeNotifier == ThemeMode.dark
                      ? Icons.dark_mode
                      : Icons.light_mode,
                  color: Color(0xD4AF37),
                ),
                title: Text(
                  'Tema',
                  style: AppTextTheme.bodyLarge,
                ),
                trailing: Switch(
                  value: themeNotifier == ThemeMode.dark,
                  activeColor: Color(0xD4AF37),
                  onChanged: (value) {
                    ref.read(themeProvider.notifier).toggleTheme();
                  },
                ),
              ),
              const Divider(height: 32),

              // Language selector
              ListTile(
                leading: const Icon(Icons.language,
                    color: Color(0x64748B)),
                title: Text(
                  'Bahasa',
                  style: AppTextTheme.bodyLarge,
                ),
                trailing: DropdownButton<String>(
                  value: languageNotifier,
                  dropdownColor: Color(0x1E293B),
                  icon: const Icon(Icons.arrow_downward,
                      color: Color(0x64748B)),
                  style: AppTextTheme.bodyMedium,
                  underline: const SizedBox(),
                  items: const [
                    DropdownMenuItem(value: 'en', child: Text('English')),
                    DropdownMenuItem(value: 'id', child: Text('Indonesian')),
                    DropdownMenuItem(value: 'en', child: Text('English')),
                  ],
                  onChanged: (String? newValue) {
                    if (newValue != null) {
                      ref.read(languageProvider.notifier).setLanguage(newValue);
                    }
                  },
                ),
              ),
              const Divider(height: 32),

              // Currency selector
              ListTile(
                leading: const Icon(Icons.currency_bitcoin,
                    color: Color(0x64748B)),
                title: Text(
                  'Mata Uang',
                  style: AppTextTheme.bodyLarge,
                ),
                trailing: DropdownButton<String>(
                  value: currencyNotifier,
                  dropdownColor: Color(0x1E293B),
                  icon: const Icon(Icons.arrow_downward,
                      color: Color(0x64748B)),
                  style: AppTextTheme.bodyMedium,
                  underline: const SizedBox(),
                  items: const [
                    DropdownMenuItem(value: 'IDR', child: Text('IDR')),
                    DropdownMenuItem(value: 'USD', child: Text('USD')),
                    DropdownMenuItem(value: 'EUR', child: Text('EUR')),
                  ],
                  onChanged: (String? newValue) {
                    if (newValue != null) {
                      ref.read(currencyProvider.notifier).setCurrency(newValue);
                    }
                  },
                ),
              ),
              const Divider(height: 32),

              // Export center
              ListTile(
                leading: const Icon(Icons.download,
                    color: Color(0x64748B)),
                title: Text(
                  'Export Center',
                  style: AppTextTheme.bodyLarge,
                ),
                trailing: const Icon(Icons.arrow_forward_ios,
                    size: 12, color: Color(0x64748B)),
                onTap: () {
                  // Export center action
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                      content: Text('Fitur export akan segera hadir'),
                      backgroundColor: Color(0xD4AF37),
                    ),
                  );
                },
              ),
            ],
          ),
        ),
      ),
    );
  }
}