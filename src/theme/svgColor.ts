/**
 * Split a CSS colour into the two halves an SVG gradient stop actually wants.
 *
 * ── WHY THIS EXISTS ────────────────────────────────────────────────────────
 * `react-native-svg` DROPS THE ALPHA out of an `rgba()` string used as a
 * `stopColor`. The stop renders fully opaque and the transparency is silently
 * lost.
 *
 * It is a nasty one because it is invisible in exactly the theme you are most
 * likely to be looking at. The gel sheen is `rgba(255,255,255,0.70)` in light,
 * where losing 30% of the alpha reads as "a bit bright". It is
 * `rgba(255,255,255,0.13)` in dark, where losing 87% of it turns a whisper of
 * light into a silver bar: the top of the tab bar measured (227,227,227) on a
 * (26,23,21) canvas before this was fixed. The graded edge failed the same way
 * and worse — `glassEdge` and `glassEdgeDim` both became opaque white, so the
 * "grading" that is the entire point of it graded from white to white.
 *
 * Everywhere ELSE in react-native-svg — `fill`, `stroke`, `color` — `rgba()` is
 * handled correctly, which is why the tokens are still written as `rgba()` and
 * why this conversion lives at the gradient boundary rather than in the palette.
 *
 * The SVG spec has always wanted these separate (`stop-color` and
 * `stop-opacity` are distinct properties), so passing them apart is the correct
 * thing to do regardless of the bug.
 */
export type SvgStop = { stopColor: string; stopOpacity: number };

const RGBA = /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+)\s*)?\)$/i;
const HEX8 = /^#([0-9a-f]{6})([0-9a-f]{2})$/i;

export function svgStop(value: string): SvgStop {
  const rgba = RGBA.exec(value);
  if (rgba) {
    const [, r, g, b, a] = rgba;
    return {
      stopColor: `rgb(${r}, ${g}, ${b})`,
      stopOpacity: a === undefined ? 1 : Number(a),
    };
  }

  const hex8 = HEX8.exec(value);
  if (hex8) {
    return { stopColor: `#${hex8[1]}`, stopOpacity: parseInt(hex8[2], 16) / 255 };
  }

  // Already opaque (a plain hex or a named colour) — nothing to separate.
  return { stopColor: value, stopOpacity: 1 };
}
