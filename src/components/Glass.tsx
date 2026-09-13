import { useId, useState, type ReactNode } from 'react';
import { View, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { useTheme } from '../theme/useTheme';
import { glass } from '../theme/tokens';
import { svgStop } from '../theme/svgColor';

/**
 * A pane of GEL: blur, a legibility scrim, a specular sheen, bounce light, and
 * an edge that is lit on top and dark underneath.
 *
 * ── GLASS VS GEL ───────────────────────────────────────────────────────────
 * Frosted glass is flat. It blurs what is behind it and stops, and at that
 * point the only thing separating it from a grey box is the hairline round its
 * edge. What makes a surface read as a soft, slightly rubbery *gel* is that it
 * has a BODY: light lands on the top of it, travels through it, and bounces
 * back up into its underside from the content below.
 *
 * Three layers carry that, and they are drawn in one SVG because they all need
 * the same rounded-rectangle geometry:
 *
 *   SHEEN   A bright smear across the upper ~46%, where the pane faces the
 *           light. This is the single biggest difference between this and a
 *           plain BlurView.
 *   BOUNCE  A faint lift in the bottom ~22%. Without it the lower edge reads as
 *           a cut rather than as the far side of a solid object.
 *   EDGE    The hairline, GRADED from `glassEdge` at the top to `glassEdgeDim`
 *           at the bottom. A uniform hairline all the way round is the tell
 *           that a surface is a rectangle with a border rather than an object
 *           sitting in light — real edges only catch the light they face.
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

        {size ? <Gel w={size.w} h={size.h} radius={radius} /> : null}

        {children}
      </View>
    </View>
  );
}

/**
 * The lighting pass. Everything here is static paint — it does not animate, and
 * it sits under `children` so chrome never has a sheen laid over the top of it.
 */
function Gel({ w, h, radius }: { w: number; h: number; radius: number }) {
  const { c } = useTheme();
  /**
   * SVG gradient ids are resolved per `<Svg>` document, but two panes that both
   * define `#sheen` is exactly the kind of thing that works until the day it
   * does not. `useId` makes the reference unambiguous for the cost of a string.
   */
  const uid = useId().replace(/:/g, '');

  /**
   * Colour and opacity have to be handed to a gradient stop SEPARATELY —
   * react-native-svg drops the alpha out of an `rgba()` `stopColor`. See
   * `svgColor.ts`; this is the bug that turned the dark tab bar silver.
   */
  const sheen = svgStop(c.glassSheen);
  const bounce = svgStop(c.glassBounce);
  const edgeLit = svgStop(c.glassEdge);
  const edgeDim = svgStop(c.glassEdgeDim);

  const ew = glass.edgeWidth;
  /** A pill's `radius` is 999; SVG needs the real corner, which caps at half. */
  const rx = Math.min(radius, w / 2, h / 2);
  /** The stroke straddles the path, so inset by half of it to keep all of the
   *  hairline inside the clip instead of losing half to `overflow: hidden`. */
  const inset = ew / 2;

  return (
    <Svg width={w} height={h} style={StyleSheet.absoluteFill} pointerEvents="none">
      <Defs>
        {/* Top-down. The light is above the phone, which is where a hand holds
            it and where every iOS material assumes it is. */}
        <LinearGradient id={`sheen${uid}`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={sheen.stopColor} stopOpacity={sheen.stopOpacity} />
          <Stop offset={glass.sheenStop} stopColor={sheen.stopColor} stopOpacity={0} />
        </LinearGradient>

        {/* Bottom-up, and much fainter — this is reflected light, not source. */}
        <LinearGradient id={`bounce${uid}`} x1="0" y1="1" x2="0" y2="0">
          <Stop offset="0" stopColor={bounce.stopColor} stopOpacity={bounce.stopOpacity} />
          <Stop offset={glass.bounceStop} stopColor={bounce.stopColor} stopOpacity={0} />
        </LinearGradient>

        {/* The graded hairline. It fades to a DIMMER LIGHT rather than to
            nothing, so the bottom keeps a trace of light instead of dissolving
            into the blur and leaving the pane looking like it has no bottom. */}
        <LinearGradient id={`edge${uid}`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={edgeLit.stopColor} stopOpacity={edgeLit.stopOpacity} />
          <Stop offset={glass.edgeFalloff} stopColor={edgeDim.stopColor} stopOpacity={edgeDim.stopOpacity} />
          <Stop offset="1" stopColor={edgeDim.stopColor} stopOpacity={edgeDim.stopOpacity} />
        </LinearGradient>
      </Defs>

      <Rect x={0} y={0} width={w} height={h} rx={rx} ry={rx} fill={`url(#sheen${uid})`} />
      <Rect x={0} y={0} width={w} height={h} rx={rx} ry={rx} fill={`url(#bounce${uid})`} />
      <Rect
        x={inset}
        y={inset}
        width={w - ew}
        height={h - ew}
        rx={Math.max(0, rx - inset)}
        ry={Math.max(0, rx - inset)}
        fill="none"
        stroke={`url(#edge${uid})`}
        strokeWidth={ew}
      />
    </Svg>
  );
}
