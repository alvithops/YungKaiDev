import 'package:flutter/material.dart';
import 'package:event_manage/core/theming/color_scheme.dart';

class GlassmorphicCard extends StatelessWidget {
  final Widget child;
  final EdgeInsetsGeometry? padding;
  final EdgeInsetsGeometry? margin;
  final BorderRadiusGeometry? borderRadius;
  final Color? gradientColor;
  final Color? borderColor;
  final double? blurSigma;
  final Color shadowColor;
  final double? elevation;

  const GlassmorphicCard({
    super.key,
    required this.child,
    this.padding,
    this.margin,
    this.borderRadius,
    this.gradientColor,
    this.borderColor,
    this.blurSigma,
    this.shadowColor = const Color(0x1A000000),
    this.elevation,
  });

  // Default border radius for glassmorphic
  static const BorderRadiusGeometry _defaultRadius = BorderRadius.circular(16);

  // Default blur for frosted glass effect
  static const double _defaultBlur = 20.0;

  @override
  Widget build(BuildContext context) {
    final Color surface = Theme.of(context).colorScheme.surface;
    final Color glass = AppColorScheme.glass;
    final Color border = borderColor ?? AppColorScheme.glassBorder;

    return Container(
      // Frosted glass background with blur
      decoration: BoxDecoration(
        borderRadius: borderRadius ?? _defaultRadius,
        color: gradientColor ?? glass,
        border: Border.all(color: border, width: 1),
        boxShadow: [
          BoxShadow(
            color: shadowColor.withOpacity(0.1),
            blurRadius: elevation ?? 8,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      // Apply glass blur effect
      child: ClipRRect(
        borderRadius: borderRadius ?? _defaultRadius,
        child: BackdropFilter(
          filter: ImageFilter.blur(
            sigmaX: blurSigma ?? _defaultBlur,
            sigmaY: blurSigma ?? _defaultBlur,
          ),
          child: Container(
            decoration: BoxDecoration(
              borderRadius: borderRadius ?? _defaultRadius,
              color: Colors.transparent,
            ),
            child: Padding(
              padding: padding ?? const EdgeInsets.all(24),
              child: child,
            ),
          ),
        ),
      ),
      // Add margin if specified
      margin: margin,
    );
  }
}