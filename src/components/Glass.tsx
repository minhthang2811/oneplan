import type { ReactNode } from 'react';
import { View, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import { useTheme } from '../theme/useTheme';
import { glass } from '../theme/tokens';

/**
 * A pane of glass: blur, a legibility scrim, and a lit edge.
 *
 * Three details decide whether this reads as glass or as a grey box, and all
 * three are easy to get wrong:
 *
 * 1. `BlurView` IGNORES an explicit `borderRadius` (documented in expo-blur),
 *    so the rounding has to come from a parent that clips it.
 * 2. On iOS `overflow: 'hidden'` sets `masksToBounds`, which clips the view's
 *    own drop shadow away. So the shadow cannot live on the clipping view —
 *    hence the outer wrapper here, whose only job is to cast it.
 * 3. Blur alone does not separate a pane from its background; the LIT EDGE
 *    does. A hairline of near-white along the border is what the eye reads as
 *    a physical edge catching light.
 *
 * The scrim on top of the blur is not decoration either: without it, chrome
 * text sits on whatever happens to have scrolled underneath, and contrast
 * becomes a property of the user's data.
 */
export function GlassPanel({
  children, radius, style, contentStyle, shadowLevel = 3,
}: {
  children: ReactNode;
  radius: number;
  /** Applied to the OUTER (shadow-casting) wrapper — position it with this. */
  style?: StyleProp<ViewStyle>;
  /** Applied to the INNER (clipping) surface — size and lay out with this. */
  contentStyle?: StyleProp<ViewStyle>;
  shadowLevel?: 0 | 1 | 2 | 3;
}) {
  const { c, shadow, isDark } = useTheme();

  return (
    <View style={[{ borderRadius: radius, boxShadow: shadow[shadowLevel] }, style]}>
      <View
        style={[
          {
            borderRadius: radius,
            borderCurve: 'continuous',
            overflow: 'hidden',
            borderWidth: glass.edgeWidth,
            borderColor: c.glassEdge,
          },
          contentStyle,
        ]}
      >
        <BlurView
          // Explicit light/dark variants rather than the adaptive material:
          // the app already knows the scheme, and an adaptive tint can resolve
          // against the wrong trait collection inside a detached overlay.
          tint={isDark ? 'systemThickMaterialDark' : 'systemThickMaterialLight'}
          intensity={glass.intensity}
          blurMethod="dimezisBlurViewSdk31Plus"
          blurReductionFactor={glass.reductionFactor}
          pointerEvents="none"
          style={StyleSheet.absoluteFill}
        />
        <View style={[StyleSheet.absoluteFill, { backgroundColor: c.glassTint }]} pointerEvents="none" />
        {children}
      </View>
    </View>
  );
}
