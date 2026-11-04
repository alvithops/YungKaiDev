import 'package:flutter/material.dart';
import 'package:event_manage/core/theming/color_scheme.dart';

class GlassmorphicButton extends StatelessWidget {
  final String text;
  final VoidCallback onPressed;
  final Color? backgroundColor;
  final Color? foregroundColor;
  final double? elevation;
  final BorderRadiusGeometry? borderRadius;
  final Widget? leadingIcon;
  final Widget? trailingIcon;
  double? width;
  double? height;
  bool? disabled;

  const GlassmorphicButton({
    super.key,
    required this.text,
    required this.onPressed,
    this.backgroundColor,
    this.foregroundColor,
    this.elevation,
    this.borderRadius,
    this.leadingIcon,
    this.trailingIcon,
    this.width,
    this.height,
    this.disabled,
  });

  static const BorderRadiusGeometry _defaultRadius = BorderRadius.circular(10);

  @override
  Widget build(BuildContext context) {
    final isDisabled = disabled ?? false;
    final Color bgColor = backgroundColor ?? Color(0xD4AF37);
    final Color fgColor = foregroundColor ?? Color(0x0F172A);

    return ElevatedButton(
      onPressed: isDisabled ? null : onPressed,
      style: ElevatedButton.styleFrom(
        backgroundColor: Colors.transparent,
        foregroundColor: Colors.transparent,
        minimumSize: Size(width ?? double.infinity, height ?? 52),
        shape: RoundedRectangleBorder(
          borderRadius: borderRadius ?? _defaultRadius,
          side: BorderSide(
            color: isDisabled
                ? AppColorScheme.divider.withOpacity(0.3)
                : bgColor,
            width: 1,
          ),
        ),
        elevation: elevation ?? 0,
        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
      ),
      child: Container(
        decoration: BoxDecoration(
          borderRadius: borderRadius ?? _defaultRadius,
          gradient: isDisabled
              ? null
              : LinearGradient(
                  colors: [bgColor.withOpacity(0.8), bgColor.withOpacity(0.5)],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (leadingIcon != null) ...[
              leadingIcon!,
              const SizedBox(width: 12),
            ],
            Text(
              text,
              style: TextStyle(
                color: fgColor,
                fontFamily: 'Plus Jakarta Sans',
                fontWeight: FontWeight.w500,
                fontSize: 14,
              ),
            ),
            if (trailingIcon != null) ...[
              const SizedBox(width: 8),
              trailingIcon!,
            ],
          ],
        ),
      ),
    );
  }
}