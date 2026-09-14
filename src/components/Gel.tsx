import { useId } from 'react';
import { StyleSheet, type ViewStyle } from 'react-native';
import Svg, {
  Defs, Ellipse, LinearGradient, RadialGradient, Rect, Stop,
} from 'react-native-svg';
import { useTheme } from '../theme/useTheme';
import { glass } from '../theme/tokens';
import { svgStop } from '../theme/svgColor';

/**
 * THE GEL MATERIAL. One definition, used by every gel surface in the app.
 *
 * ── WHAT SEPARATES GEL FROM GLASSMORPHISM ──────────────────────────────────
 * Flat glassmorphism is a blur, a scrim, and a hairline. Every one of those is
 * a property of a FLAT pane, which is why the result always reads as a sheet of
 * frosted acrylic laid on the screen. A gel surface reads as a droplet of
 * material RESTING on the screen, and the difference is entirely in how it
 * handles light:
 *
 *   1. CURVATURE. A flat pane takes a linear wash of light. A convex one falls
 *      off fast off the crown, sits in a long shallow trough, and then brightens
 *      again at the far rim. The stop offsets in `glass` are that curve, and
 *      spacing them evenly is what turns a droplet back into a pane.
 *   2. A SPECULAR, not just a sheen. The sheen is the broad body light; the
 *      specular is the hard little reflection of the light SOURCE itself. Only
 *      having the soft one is the single biggest tell of flat glassmorphism.
 *   3. A CAUSTIC. Light that entered the crown, travelled through the body, and
 *      concentrated on the bottom rim. A surface lit only from above reads as a
 *      lid; the bright far rim is what says there is a volume of material in
 *      between.
 *   4. A HOTSPOT. A purely vertical gradient describes a cylinder — no
 *      left-right variation at all — so it reads as extruded. One off-centre
 *      elliptical bloom turns the extrusion into an object with a light source
 *      somewhere in the room.
 *
 * ── WHY THIS IS AFFORDABLE ─────────────────────────────────────────────────
 * All of it is STATIC PAINT. The metaball investigation measured the difference
 * precisely: a static filtered/gradient region is rasterised once and costs
 * nothing (60.0fps, 16.67ms), while an animated one is re-rasterised every
 * frame (15.0fps, 66.68ms). Nothing here animates. The tab bar's chip DOES
 * move, but it moves by a transform on its parent view, which is a compositor
 * operation on an already-rasterised layer rather than a repaint — so the chip
 * gets the full material too, and its highlight smears as it stretches, which
 * is exactly what a highlight on moving liquid does.
 *
 * ── WHAT IS NOT DRAWN HERE ─────────────────────────────────────────────────
 * The inset rim shading is NOT in this SVG. It is a real `boxShadow` with
 * `inset: true`, applied by the caller via `gelInsetShadow()` below, because a
 * shadow follows the rounded corners exactly and a rectangle of gradient does
 * not — on a pill that difference is the whole bottom third of the shape.
 */
export function GelSurface({
  w, h, radius, strength = 1,
}: {
  w: number;
  h: number;
  radius: number;
  /**
   * Scales every light layer together. The tab bar is a large pane seen against
   * the user's own content and wants the full material; the selection chip sits
   * ON that pane, already has the pane's lighting behind it, and would read as
   * a second competing object at full strength.
   */
  strength?: number;
}) {
  const { c } = useTheme();
  /**
   * SVG gradient ids resolve per `<Svg>` document, but two surfaces that both
   * define `#sheen` is the kind of thing that works until the day it does not.
   */
  const uid = useId().replace(/:/g, '');

  /**
   * Colour and opacity go to a gradient stop SEPARATELY — react-native-svg
   * drops the alpha out of an `rgba()` `stopColor`. See `svgColor.ts`; this is
   * the bug that turned the dark tab bar silver.
   */
  const sheen = svgStop(c.glassSheen);
  const spec = svgStop(c.glassSpecular);
  const caustic = svgStop(c.glassCaustic);
  const bounce = svgStop(c.glassBounce);
  const edgeLit = svgStop(c.glassEdge);
  const edgeDim = svgStop(c.glassEdgeDim);

  const a = (v: number) => Math.max(0, Math.min(1, v * strength));

  const ew = glass.edgeWidth;
  /** A pill's `radius` is 999; SVG needs the real corner, which caps at half. */
  const rx = Math.min(radius, w / 2, h / 2);
  /** The stroke straddles the path, so inset by half to keep the whole hairline
   *  inside the clip instead of losing half of it to `overflow: hidden`. */
  const half = ew / 2;

  const sx = glass.specularInset * w;

  return (
    <Svg width={w} height={h} style={StyleSheet.absoluteFill} pointerEvents="none">
      <Defs>
        {/*
          THE DOME. A four-stop vertical profile rather than a two-stop ramp:
          crown, fast falloff, long trough, then the caustic climbing back to
          the bottom rim. This one gradient is most of the convexity.
        */}
        <LinearGradient id={`dome${uid}`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={sheen.stopColor} stopOpacity={a(sheen.stopOpacity)} />
          <Stop
            offset={glass.sheenStop}
            stopColor={sheen.stopColor}
            stopOpacity={a(sheen.stopOpacity * 0.18)}
          />
          <Stop offset={glass.troughStop} stopColor={sheen.stopColor} stopOpacity={0} />
          <Stop
            offset={glass.causticStop}
            stopColor={caustic.stopColor}
            stopOpacity={a(caustic.stopOpacity * 0.35)}
          />
          <Stop offset="1" stopColor={caustic.stopColor} stopOpacity={a(caustic.stopOpacity)} />
        </LinearGradient>

        {/*
          THE HOTSPOT. Off-centre on purpose — dead centre reads as a vignette
          rather than as a reflection, because a vignette has no direction and a
          reflection must have one.
        */}
        <RadialGradient
          id={`hot${uid}`}
          gradientUnits="userSpaceOnUse"
          cx={glass.hotspot.cx * w}
          cy={glass.hotspot.cy * h}
          rx={glass.hotspot.rx * w}
          ry={glass.hotspot.ry * h}
        >
          <Stop offset="0" stopColor={spec.stopColor} stopOpacity={a(spec.stopOpacity * 0.30)} />
          <Stop offset="0.55" stopColor={spec.stopColor} stopOpacity={a(spec.stopOpacity * 0.08)} />
          <Stop offset="1" stopColor={spec.stopColor} stopOpacity={0} />
        </RadialGradient>

        {/* The crisp glint, fading out along its own length. */}
        <LinearGradient id={`spec${uid}`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={spec.stopColor} stopOpacity={a(spec.stopOpacity)} />
          <Stop offset="1" stopColor={spec.stopColor} stopOpacity={0} />
        </LinearGradient>
        <LinearGradient id={`specX${uid}`} x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor="#000000" stopOpacity={0} />
          <Stop offset="0.5" stopColor="#000000" stopOpacity={1} />
          <Stop offset="1" stopColor="#000000" stopOpacity={0} />
        </LinearGradient>

        {/* Bottom-up, soft — light reflected off the content below. */}
        <LinearGradient id={`bounce${uid}`} x1="0" y1="1" x2="0" y2="0">
          <Stop offset="0" stopColor={bounce.stopColor} stopOpacity={a(bounce.stopOpacity)} />
          <Stop offset={glass.bounceStop} stopColor={bounce.stopColor} stopOpacity={0} />
        </LinearGradient>

        {/*
          THE RIM. Bright at the top where it faces the light, dark through the
          middle where it turns away, and BRIGHT AGAIN at the very bottom — the
          caustic reaching the edge. A rim that only dims is a lit pane; a rim
          that comes back is a droplet.
        */}
        <LinearGradient id={`edge${uid}`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={edgeLit.stopColor} stopOpacity={a(edgeLit.stopOpacity)} />
          <Stop offset={glass.edgeFalloff} stopColor={edgeDim.stopColor} stopOpacity={a(edgeDim.stopOpacity)} />
          <Stop offset="1" stopColor={caustic.stopColor} stopOpacity={a(caustic.stopOpacity * 0.8)} />
        </LinearGradient>
      </Defs>

      {/* Body light, in painting order: dome, then the directional bloom, then
          the bounce off whatever is underneath. */}
      <Rect x={0} y={0} width={w} height={h} rx={rx} ry={rx} fill={`url(#dome${uid})`} />
      <Rect x={0} y={0} width={w} height={h} rx={rx} ry={rx} fill={`url(#hot${uid})`} />
      <Rect x={0} y={0} width={w} height={h} rx={rx} ry={rx} fill={`url(#bounce${uid})`} />

      {/*
        THE CRISP SPECULAR, inset from both ends and hugging the top edge.
        Drawn as an ellipse rather than a rect so it follows the crown of the
        pill instead of cutting a straight line across it, which is what reads
        as a sticker rather than as a reflection.
      */}
      <Ellipse
        cx={w / 2}
        cy={h * glass.specularStop * 0.5}
        rx={Math.max(0, w / 2 - sx)}
        ry={Math.max(0.5, h * glass.specularStop)}
        fill={`url(#spec${uid})`}
        opacity={0.9}
      />

      {/* The rim, last, so nothing is painted over it. */}
      <Rect
        x={half}
        y={half}
        width={Math.max(0, w - ew)}
        height={Math.max(0, h - ew)}
        rx={Math.max(0, rx - half)}
        ry={Math.max(0, rx - half)}
        fill="none"
        stroke={`url(#edge${uid})`}
        strokeWidth={ew}
      />
    </Svg>
  );
}

/**
 * The inset rim shading, as a real `boxShadow`.
 *
 * Two shadows, and they do opposite jobs. The dark one sits INSIDE the bottom
 * edge, where a convex surface has curved furthest from the light. The light
 * one sits inside the top edge. Without the light one the surface reads as
 * DENTED rather than bulging — the dark alone is a bowl, and it is the pairing
 * that makes it a dome.
 *
 * This is deliberately not another painted gradient: an inset shadow follows
 * the rounded corners exactly, and a rectangle of gradient does not. On a pill
 * that difference is the whole bottom third of the shape.
 */
export function gelInsetShadow(
  shade: string,
  light: string,
  strength = 1
): ViewStyle['boxShadow'] {
  const s = glass.innerShade;
  const l = glass.innerLight;
  return [
    { offsetX: 0, offsetY: s.y * strength, blurRadius: s.blur, color: shade, inset: true },
    { offsetX: 0, offsetY: l.y * strength, blurRadius: l.blur, color: light, inset: true },
  ];
}
