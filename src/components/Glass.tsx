import { useState, type ReactNode } from 'react';
import { View, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import { useTheme } from '../theme/useTheme';
import { glass } from '../theme/tokens';
import { GelSurface, gelInsetShadow } from './Gel';

/**
 * A pane of GEL: a blur, a legibility scrim, the convex lighting from
 * `Gel.tsx`, and an inset rim that makes the surface bulge toward you.
 *
 * ── GLASS VS GEL ───────────────────────────────────────────────────────────
 * Frosted glass is flat. It blurs what is behind it and stops, and at that
 * point the only thing separating it from a grey box is the hairline round its
 * edge. What makes a surface read as a soft, slightly rubbery *gel* is that it
 * has a BODY: light lands on the top of it, travels through it, and bounces
 * back up into its underside from the content below.
 *
 * ALL OF THAT LIGHTING LIVES IN `Gel.tsx`, not here, because the tab bar's
 * selection chip is the same material at a lower strength and the two must not
 * drift apart. This file's remaining job is the three structural traps below,
 * plus the inset rim shading, which cannot be painted in SVG — see
 * `gelInsetShadow`.
 *
 * ── THE THREE ORIGINAL TRAPS, ALL STILL LIVE ───────────────────────────────
 * 1. `BlurView` IGNORES an explicit `borderRadius` (documented in expo-blur),
 *    so the rounding has to come from a parent that clips it.
 * 2. On iOS `overflow: 'hidden'` sets `masksToBounds`, which clips the view's
 *    own drop shadow away. So the shadow cannot live on the clipping view —
 *    hence the outer wrapper here, whose only job is to cast it.
 * 3. Blur alone does not separate a pane from its background; the lit edge
 *    does.
 *
 * The scrim under the sheen is not decoration either: without it, chrome text
 * sits on whatever happens to have scrolled underneath, and contrast becomes a
 * property of the user's data.
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

  /**
   * The gel layers are drawn in SVG, and SVG needs real numbers — a percentage
   * `rx` cannot express "a pill" and a percentage stroke cannot be a hairline.
   * So the pane measures itself once and the lighting appears on the next
   * frame. The blur and the scrim are already painted by then, so there is no
   * visible pop; what would pop is guessing the height and getting the corner
   * radius wrong.
   */
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);

  return (
    <View style={[{ borderRadius: radius, boxShadow: shadow[shadowLevel] }, style]}>
      <View
        onLayout={(e) => {
          const { width: w, height: h } = e.nativeEvent.layout;
          setSize((prev) => (prev && prev.w === w && prev.h === h ? prev : { w, h }));
        }}
        style={[
          {
            borderRadius: radius,
            borderCurve: 'continuous',
            overflow: 'hidden',
            /**
             * The convex rim shading. Inset shadows draw INSIDE the view, so
             * unlike the drop shadow on the wrapper above they survive
             * `overflow: 'hidden'` perfectly happily — and they follow the
             * pill's corners, which is the entire reason they are not painted
             * as another gradient.
             */
            boxShadow: gelInsetShadow(c.glassInnerShade, c.glassSpecular),
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

        {size ? <GelSurface w={size.w} h={size.h} radius={radius} /> : null}

        {children}
      </View>
    </View>
  );
}
