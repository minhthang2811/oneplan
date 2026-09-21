import { memo, useId, useMemo } from 'react';
import { View, StyleSheet, useWindowDimensions, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Circle, Defs, G, LinearGradient, Path, RadialGradient, Rect, Stop } from 'react-native-svg';
import { useTheme } from '../theme/useTheme';
import { botanical } from '../theme/tokens';
import { svgStop } from '../theme/svgColor';

/**
 * THE FOREST BEHIND FOCUS.
 *
 * ── WHY THE SCREEN HAS SCENERY AT ALL ──────────────────────────────────────
 * Focus was a flat wash with a drifting field of light on it. That is the right
 * instinct — this is the one screen you are meant to stop looking at — and a
 * field of light alone still reads as an *unset* screen rather than as a calm
 * place. The reference class is unanimous on the fix: Forest puts a growing
 * tree behind the dial, Life Reset puts a lake and a treeline behind the count,
 * and both get away with real scenery because the scenery is low-contrast and
 * the timer is the only bright thing on the screen.
 *
 * ── WHY IT IS DRAWN AND NOT PHOTOGRAPHED ───────────────────────────────────
 * A bitmap would have to ship two of itself (light and dark), would be wrong at
 * every aspect ratio it was not cut for, and could not take the activity's tint
 * the way `FocusAura` washes over this. Everything atmospheric in this app is
 * already vector — `Bloom`, `Halo`, `GelSurface`, `FocusAura` — so a drawn
 * forest costs one component and stays in the same visual family.
 *
 * ── WHY IT DOES NOT MOVE ───────────────────────────────────────────────────
 * Deliberately, and it is the harder call. A swaying canopy is the obvious
 * flourish and this screen already has its ambient motion: `FocusAura` drifts
 * behind everything on three mutually prime periods. Adding a second slow loop
 * would give the screen two things quietly moving at different rates, which is
 * the point at which ambience becomes something you notice — exactly what a
 * focus screen must not be. The foliage is the STILL layer the light moves
 * over.
 *
 * ── THE ORDER OF THE LAYERS, AND WHY IT MATTERS ────────────────────────────
 *     sky wash → sun → far trees → mid trees → ground → fronds
 *                                                        ↑ framing the stage
 * and `FocusAura` is mounted ON TOP of the whole thing, so the activity's
 * colour still floods the room — over foliage it reads as light through a
 * canopy rather than as a gradient on a flat wall.
 *
 * ── MEMOIZED, BECAUSE IT TAKES NO PROPS AND FOCUS RE-RENDERS OFTEN ─────────
 * The output depends on the theme and the window size and nothing else, but
 * `Focus` subscribes to `tasks` and `focus`, so every task edit anywhere in the
 * app used to walk this whole tree again: three `<Svg>` documents, two
 * treelines of hand-placed paths, the haze, and three fronds of twenty-four
 * paths each. The frond GEOMETRY was already `useMemo`'d; the element creation
 * and react-native-svg's reconciliation of it were not.
 */
export const BotanicalBackdrop = memo(function BotanicalBackdrop() {
  const { width: W, height: H } = useWindowDimensions();
  const { isDark } = useTheme();
  const g = botanical[isDark ? 'dark' : 'light'];

  /** Gradient ids live in a process-wide registry in react-native-svg. */
  const uid = useId().replace(/:/g, '');

  const sky = svgStop(g.skyTop);
  const skyLow = svgStop(g.skyBottom);
  const sun = svgStop(g.sun);

  /**
   * The horizon. Below the dial, above the tray on every phone the app runs
   * on — the tray is opaque and simply covers whatever falls behind it, so the
   * treeline is placed to be SEEN rather than to be complete.
   */
  const horizon = H * 0.6;

  /**
   * FOLIAGE IS PAINTED PER GROUP, NEVER PER SHAPE.
   *
   * Every canopy here is built from overlapping shapes, and overlapping
   * translucent shapes double their alpha where they meet — which draws the
   * seams between the trees as bright veins and turns a silhouette back into a
   * pile of separate objects. Putting the opacity on the enclosing `<G>` makes
   * the union flatten first and then fade, which is the only way a drawn
   * treeline reads as one mass.
   */
  const canopy = isDark
    ? { far: 0.9, mid: 0.95, near: 1, frond: 1 }
    : { far: 0.55, mid: 0.68, near: 0.8, frond: 0.62 };

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {/* ── the wash, the sun, and everything that scales with the screen ── */}
      <Svg width={W} height={H} style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id={`sky${uid}`} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={sky.stopColor} stopOpacity={sky.stopOpacity} />
            <Stop offset="1" stopColor={skyLow.stopColor} stopOpacity={skyLow.stopOpacity} />
          </LinearGradient>

          {/* Light coming through the canopy. A radial with no edge, for the
              same reason `Halo` and `FocusAura` use one: a disc at any opacity
              you can notice has a rim, and a rim is an object. */}
          <RadialGradient id={`sun${uid}`} cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor={sun.stopColor} stopOpacity={sun.stopOpacity * (isDark ? 0.55 : 0.8)} />
            {/* The midpoint is pulled in for the reason `FocusAura` documents:
                a straight ramp puts most of the colour in the outer ring, where
                it meets the treeline and draws a halo around it. */}
            <Stop offset="0.42" stopColor={sun.stopColor} stopOpacity={sun.stopOpacity * (isDark ? 0.22 : 0.34)} />
            <Stop offset="1" stopColor={sun.stopColor} stopOpacity={0} />
          </RadialGradient>

          <LinearGradient id={`haze${uid}`} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={skyLow.stopColor} stopOpacity={0} />
            <Stop offset="0.55" stopColor={skyLow.stopColor} stopOpacity={isDark ? 0.5 : 0.72} />
            <Stop offset="1" stopColor={skyLow.stopColor} stopOpacity={0} />
          </LinearGradient>
        </Defs>

        <Rect x={0} y={0} width={W} height={H} fill={`url(#sky${uid})`} />
        <Circle cx={W * 0.8} cy={H * 0.08} r={W * 0.62} fill={`url(#sun${uid})`} />

        {/* ── the far treeline ─────────────────────────────────────────────
            Small, pale and crowded. Depth in a flat drawing is carried by
            CONTRAST and SIZE rather than by perspective: the far row is barely
            separated from the sky, the near row is nearly solid, and the eye
            supplies the distance between them. */}
        <G opacity={canopy.far}>
          {FAR.map((t, i) => (
            <Path key={i} d={conifer(t.x * W, horizon + 6, t.h * H, t.w * W)} fill={g.far} />
          ))}
        </G>

        {/* ── haze ─────────────────────────────────────────────────────────
            Aerial perspective, and the cheapest depth cue there is: a band of
            the sky's own colour laid back over the bottoms of the far trees, so
            they fade into the air instead of standing on the same ground as the
            row in front of them. Without it the two treelines read as one
            cluttered silhouette at two sizes. */}
        <Rect
          x={0}
          y={horizon - H * 0.09}
          width={W}
          height={H * 0.13}
          fill={`url(#haze${uid})`}
        />

        {/* ── the mid treeline, and the ground it stands on ────────────────
            The ground is a single soft mound rather than a straight edge. A
            level horizon reads as a chart axis; one that rises slightly to one
            side reads as terrain, and it costs one control point. */}
        <G opacity={canopy.mid}>
          {MID.map((t, i) => (
            <Path key={i} d={t.round
              ? bush(t.x * W, horizon + H * 0.055, t.h * H, t.w * W)
              : conifer(t.x * W, horizon + H * 0.055, t.h * H, t.w * W)} fill={g.mid} />
          ))}
        </G>

        <G opacity={canopy.near}>
          <Path
            d={`M0,${horizon + H * 0.05}`
              + ` Q${W * 0.32},${horizon + H * 0.02} ${W * 0.62},${horizon + H * 0.045}`
              + ` Q${W * 0.86},${horizon + H * 0.062} ${W},${horizon + H * 0.035}`
              + ` L${W},${H} L0,${H} Z`}
            fill={g.near}
          />
        </G>
      </Svg>

      {/* ── the foreground fronds ────────────────────────────────────────────
          These are the layer that turns a landscape into a place you are
          standing IN. They hang in from the corners and are deliberately cut
          off by the screen edge — a leaf drawn whole reads as a sticker, a leaf
          that continues past the frame reads as something you are under.

          They are separate `<Svg>` elements at fixed point sizes rather than
          part of the scaling document above, because a leaf is the one shape
          here whose proportions are load-bearing: the treelines may stretch a
          few percent on a wide phone and nobody can tell, while a stretched
          frond immediately looks like clip art. */}
      <Frond
        length={Math.min(W * 0.78, 330)}
        color={g.frond}
        stem={g.stem}
        opacity={canopy.frond}
        style={{ top: -H * 0.035, left: -W * 0.24, transform: [{ rotate: '34deg' }] }}
      />
      <Frond
        length={Math.min(W * 0.62, 268)}
        color={g.frond}
        stem={g.stem}
        opacity={canopy.frond * 0.82}
        style={{ top: -H * 0.02, right: -W * 0.2, transform: [{ rotate: '146deg' }] }}
      />
      <Frond
        length={Math.min(W * 0.5, 210)}
        color={g.mid}
        stem={g.stem}
        opacity={canopy.frond * 0.7}
        style={{ top: H * 0.3, left: -W * 0.3, transform: [{ rotate: '-24deg' }] }}
      />
    </View>
  );
});

/* --------------------------------------------------------------- shapes -- */

/**
 * A soft spire. Not a triangle: a straight-sided tree has two hard diagonals
 * that read as a graph, and the quadratic pulls the silhouette in at the
 * shoulders, which is what makes a conifer look like one.
 *
 * `(x, base)` is where the trunk meets the ground; the shape grows upward.
 */
function conifer(x: number, base: number, h: number, w: number): string {
  return (
    `M${x - w},${base}`
    + ` Q${x - w * 0.46},${base - h * 0.42} ${x},${base - h}`
    + ` Q${x + w * 0.46},${base - h * 0.42} ${x + w},${base}`
    + ' Z'
  );
}

/** A rounded canopy — the broadleaf in the mix. A treeline of one species is
 *  a pattern; two is a wood. */
function bush(x: number, base: number, h: number, w: number): string {
  return (
    `M${x - w},${base}`
    + ` C${x - w},${base - h * 0.95} ${x + w},${base - h * 0.95} ${x + w},${base}`
    + ' Z'
  );
}

/**
 * Positions are hand-placed, never random.
 *
 * `Math.random()` here would mean a skyline that is different in every
 * screenshot, every test run and every remount, and one that has to be
 * re-rolled until it happens to look balanced. These are the roll that looked
 * right: irregular spacing, no two neighbours the same height, and nothing
 * tall directly under where the dial sits.
 *
 * `x` and `w` are fractions of screen WIDTH, `h` of screen HEIGHT, so the
 * skyline keeps its proportions from an SE to a Pro Max.
 */
const FAR = [
  { x: -0.02, h: 0.07, w: 0.05 },
  { x: 0.1, h: 0.095, w: 0.055 },
  { x: 0.21, h: 0.062, w: 0.042 },
  { x: 0.3, h: 0.085, w: 0.05 },
  { x: 0.42, h: 0.055, w: 0.04 },
  { x: 0.52, h: 0.088, w: 0.052 },
  { x: 0.63, h: 0.068, w: 0.045 },
  { x: 0.73, h: 0.1, w: 0.058 },
  { x: 0.85, h: 0.058, w: 0.042 },
  { x: 0.96, h: 0.082, w: 0.05 },
  { x: 1.04, h: 0.066, w: 0.046 },
];

const MID = [
  { x: 0.03, h: 0.085, w: 0.07, round: true },
  { x: 0.16, h: 0.12, w: 0.062, round: false },
  { x: 0.27, h: 0.072, w: 0.075, round: true },
  { x: 0.4, h: 0.115, w: 0.058, round: false },
  { x: 0.55, h: 0.078, w: 0.08, round: true },
  { x: 0.68, h: 0.128, w: 0.065, round: false },
  { x: 0.82, h: 0.07, w: 0.072, round: true },
  { x: 0.95, h: 0.108, w: 0.06, round: false },
];

/* ---------------------------------------------------------------- frond -- */

/**
 * One fern frond: a bending stem with paired leaflets that shorten and sweep
 * back toward the tip.
 *
 * Generated rather than hand-authored as a path, because the thing that makes a
 * frond look alive is a CONSISTENT RULE applied down its length — each leaflet
 * a little shorter, a little more swept, sitting on a stem that bends — and
 * that rule is far easier to state in ten lines of arithmetic than to keep
 * straight across forty hand-written bezier control points.
 */
function Frond({
  length, color, stem, opacity, style,
}: {
  length: number;
  color: string;
  stem: string;
  opacity: number;
  style: StyleProp<ViewStyle>;
}) {
  const frond = useMemo(() => buildFrond(length), [length]);
  /** The box the frond is drawn into. Generous on the cross axis because the
   *  leaflets fan out either side of the stem. */
  const box = { w: length * 1.08, h: length * 0.66 };

  return (
    <View style={[{ position: 'absolute', width: box.w, height: box.h }, style]} pointerEvents="none">
      <Svg width={box.w} height={box.h}>
        {/* The whole drawing is built around an origin at the stem's base, so
            it is placed once here rather than offset into every coordinate. */}
        <G opacity={opacity} x={length * 0.03} y={box.h / 2}>
          <Path
            d={frond.stem}
            stroke={stem}
            strokeWidth={Math.max(2, length * 0.012)}
            strokeLinecap="round"
            fill="none"
          />
          {frond.blades.map((b, i) => (
            <Path key={i} d={b} fill={color} />
          ))}
        </G>
      </Svg>
    </View>
  );
}

/**
 * Leaflets per frond.
 *
 * Twelve, and the count is in tension with the leaflet WIDTH below: they are
 * spaced `1/12` of the stem apart, so anything wider than that spacing makes
 * neighbours overlap and the frond collapses into one solid, saw-edged mass.
 * That is exactly what happened at the first two widths tried, and it is the
 * failure mode to watch for if either number is ever changed.
 */
const LEAFLETS = 12;

function buildFrond(length: number): { stem: string; blades: string[] } {
  /** How far the stem droops by the tip, as a fraction of its length. */
  const tipY = length * 0.2;

  const blades: string[] = [];
  for (let i = 0; i < LEAFLETS; i++) {
    const t = (i + 0.6) / LEAFLETS;
    // The leaflet is attached to the stem's own CURVE, not to a straight line
    // drawn underneath it — otherwise the leaflets near the tip float free of
    // the stem they are supposed to be growing from.
    const x = t * length;
    const y = tipY * t * t;

    /**
     * Leaflets are longest about a third of the way along. A frond is widest at
     * its shoulder rather than at its base, and getting that one thing wrong is
     * what makes a drawn leaf look like a feather duster.
     */
    const shoulder = 1 - ((t - 0.32) / 0.68) ** 2 * 0.82;
    const len = length * 0.3 * Math.max(0.16, shoulder);
    /** See the note on `LEAFLETS` — this is the number that has to stay under
     *  the spacing between them. */
    const wid = len * 0.15;
    /** Near the base a leaflet stands almost square to the stem; near the tip
     *  it lies back along it. */
    const sweep = 74 - 46 * t;

    for (const side of [-1, 1] as const) {
      blades.push(leaflet(len, wid, x, y, sweep * side));
    }
  }

  return {
    stem: `M0,0 Q${length * 0.55},${tipY * 0.18} ${length},${tipY}`,
    blades,
  };
}

/**
 * One leaflet, already rotated and positioned: an ellipse running from where it
 * meets the stem out to its tip.
 *
 * ── WHY AN ELLIPSE, AFTER TWO GOES AT A POINTED BLADE ─────────────────────
 * The obvious shape for a leaf is two quadratics meeting at a point, and it was
 * wrong twice for opposite reasons. Narrow, it came to a needle and the frond
 * read as barbed wire; wide enough to have a belly, the neighbours overlapped
 * and the whole thing filled in as one saw-edged triangle. A quadratic pair
 * cannot be both blunt at the tip and slender in the body — those are the same
 * control point.
 *
 * An elliptical arc can. It is rounded at BOTH ends by construction, so the
 * leaflet stays slender enough to sit clear of its neighbours while still
 * ending in something that looks like a leaf rather than a thorn. SVG's arc
 * command also carries its own x-axis rotation, which is what lets each one be
 * placed without a wrapping `<G>` — twenty-four extra nodes in a drawing that
 * never changes, on the one screen whose whole point is that it costs nothing
 * while a timer runs.
 *
 * Two arcs, both sweeping the same way: out along one side, back along the
 * other.
 */
function leaflet(len: number, wid: number, tx: number, ty: number, deg: number): string {
  const r = (deg * Math.PI) / 180;
  const tipX = (tx + len * Math.cos(r)).toFixed(2);
  const tipY = (ty + len * Math.sin(r)).toFixed(2);
  const base = `${tx.toFixed(2)},${ty.toFixed(2)}`;
  const arc = `A${(len / 2).toFixed(2)},${wid.toFixed(2)} ${deg.toFixed(1)} 0 1`;

  return `M${base} ${arc} ${tipX},${tipY} ${arc} ${base} Z`;
}
