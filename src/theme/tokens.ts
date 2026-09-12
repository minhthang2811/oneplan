/**
 * Oneplan design tokens.
 *
 * COLOR CONTRACT (read before adding a colour):
 *   1. ONE accent — `accent`. It owns every interactive, progress and active
 *      state in the app. There is no second accent, ever.
 *   2. The `TINTS` palette below is NOT decoration and NOT an accent set. It is
 *      *data encoding*: a task's tint is its identity, and time-of-day sections
 *      are tinted so a day can be read at a glance. This is the core
 *      accessibility affordance of a visual planner, which is why it earns an
 *      exception to the single-accent rule.
 *   3. One grey family only: warm greys. No cool grey anywhere.
 *
 * SHAPE CONTRACT: actions and chips are pills, cards 16, sheets 24, inputs 12,
 * inner bars 8. Nothing else.
 *
 * SPACING: 4pt base. Every gap is a multiple of 4.
 */

export type Colors = {
  canvas: string;
  canvasTinted: string;
  surface: string;
  surfaceSunken: string;
  surfaceRaised: string;
  /** Selected/active chrome. Lifts in dark, recedes in light. */
  surfaceSelected: string;
  ink: string;
  inkMuted: string;
  inkFaint: string;
  hairline: string;
  accent: string;
  /** Same hue as `accent`, darkened for TEXT and glyphs on tinted surfaces.
   *  Not a second accent — accent fills and strokes still use `accent`. */
  accentInk: string;
  accentSoft: string;
  onAccent: string;
  solid: string;
  onSolid: string;
  scrim: string;
  /** Legibility scrim laid over a blur. Without it, chrome text sits directly
   *  on whatever scrolled underneath and contrast becomes unpredictable. */
  glassTint: string;
  /** The lit top edge that makes a blurred pane read as a pane of glass rather
   *  than as a smudge. This is the whole illusion. */
  glassEdge: string;
  /** Active chip ON glass. Lifts in both themes — see `surfaceSelected`. */
  glassChip: string;
};

export const palette: Record<'light' | 'dark', Colors> = {
  light: {
    canvas: '#F4F1ED',
    canvasTinted: '#F6F3FC',
    surface: '#FFFFFF',
    surfaceSunken: '#EFEBE5',
    surfaceRaised: '#FFFFFF',
    surfaceSelected: '#EAE5DD',
    ink: '#17130F',
    inkMuted: '#4F4A44',
    inkFaint: '#6E675F',
    hairline: '#E5DFD7',
    accent: '#7A5AF8',
    accentInk: '#6B4AE8',
    accentSoft: '#EBE5FF',
    onAccent: '#FFFFFF',
    solid: '#17130F',
    onSolid: '#FFFFFF',
    scrim: 'rgba(23,19,15,0.28)',
    glassTint: 'rgba(252,250,247,0.62)',
    glassEdge: 'rgba(255,255,255,0.90)',
    glassChip: 'rgba(255,255,255,0.92)',
  },
  dark: {
    canvas: '#0C0B0A',
    canvasTinted: '#100E16',
    surface: '#1A1715',
    surfaceSunken: '#23201C',
    surfaceRaised: '#1F1D1B',
    surfaceSelected: '#35302A',
    ink: '#F6F2ED',
    inkMuted: '#BAB2A8',
    inkFaint: '#928A81',
    hairline: '#2D2925',
    accent: '#9B84FF',
    accentInk: '#9B84FF',
    accentSoft: '#251F42',
    onAccent: '#14101F',
    solid: '#F6F2ED',
    onSolid: '#17130F',
    scrim: 'rgba(0,0,0,0.5)',
    glassTint: 'rgba(26,23,21,0.55)',
    glassEdge: 'rgba(255,255,255,0.14)',
    glassChip: 'rgba(255,255,255,0.13)',
  },
};

export type TintName =
  | 'rose' | 'peach' | 'butter' | 'mint' | 'sky' | 'lilac' | 'stone';

/**
 * Six data hues plus one neutral.
 *
 * Six, not eight: this palette encodes *category*, so the only property that
 * matters is that no two swatches can be confused. Eight pastels on the wheel
 * forced neighbours (peach/clay, butter/sage) down to deltaE ~8, which reads as
 * "the same colour". At six, the closest pair is deltaE 14.2 in light and 12.8
 * in dark, and every foreground clears 5.2:1 on its own background.
 */
export const TINTS: Record<TintName, { light: { bg: string; fg: string }; dark: { bg: string; fg: string } }> = {
  rose:   { light: { bg: '#FBC9DE', fg: '#8E2B54' }, dark: { bg: '#3E1C2B', fg: '#F5AECA' } },
  peach:  { light: { bg: '#FDD9B4', fg: '#8A4710' }, dark: { bg: '#3D2614', fg: '#F3BB89' } },
  butter: { light: { bg: '#F2E5A2', fg: '#65550A' }, dark: { bg: '#37300C', fg: '#E7C974' } },
  mint:   { light: { bg: '#B9E9C6', fg: '#0E5E33' }, dark: { bg: '#12381F', fg: '#8FD4A4' } },
  sky:    { light: { bg: '#BEDCF8', fg: '#17497F' }, dark: { bg: '#132B4C', fg: '#95C2F5' } },
  lilac:  { light: { bg: '#DED5FB', fg: '#44308F' }, dark: { bg: '#282050', fg: '#C0AEFF' } },
  stone:  { light: { bg: '#E6E1DA', fg: '#544D45' }, dark: { bg: '#2A2622', fg: '#B6AEA4' } },
};

/** The pickable data hues — `stone` is reserved for neutral chrome. */
export const TINT_NAMES: TintName[] = ['lilac', 'peach', 'rose', 'mint', 'sky', 'butter'];

/**
 * Pip — the mascot's palette.
 *
 * This is the second and last exception to the single-accent rule, and it is a
 * narrower one than `TINTS`: these colours are never applied to a control, a
 * surface or a piece of chrome. They only ever paint the character.
 *
 * A CHARACTER DOES NOT INVERT WITH THE THEME. Every other colour here flips
 * between light and dark, but Pip is a white dog with orange ears, and a white
 * dog is still white at night — swapping his coat for `surface` in dark mode
 * would not re-theme him, it would make him a different animal. So the coat
 * stays light and the outline stays dark in BOTH themes, exactly the way a
 * sticker keeps its own colours whatever it is stuck to. The only concession to
 * dark mode is that the coat drops from pure white to a warm off-white, because
 * #FFFFFF against the #0C0B0A canvas glares.
 *
 * `ink` is the app's own warm near-black rather than the blue-black a cartoon
 * outline usually gets, so Pip reads as drawn from the same ink as the rest of
 * the app. His phone is deliberately NOT in here: it uses `accent` straight
 * from the palette above, which is what ties the character to the product.
 */
export const mascot: Record<'light' | 'dark', {
  /** The body. Light, always — see above. */
  coat: string;
  /** Soft shading on the chest, haunch and inner paws. Reads as form, not dirt. */
  coatShade: string;
  /** Ears and patches. */
  patch: string;
  /** The outline, and the eyes and nose that are drawn solid from it. */
  ink: string;
  /** The contact shadow Pip sits on, so he is standing rather than floating. */
  ground: string;
}> = {
  light: {
    coat: '#FFFFFF',
    coatShade: '#E4DCF7',
    patch: '#D9814C',
    ink: '#221A2E',
    ground: 'rgba(34,26,46,0.10)',
  },
  dark: {
    coat: '#F1EAE1',
    coatShade: '#C9BEE8',
    patch: '#D07845',
    ink: '#1B1526',
    ground: 'rgba(0,0,0,0.34)',
  },
};

/**
 * Glass material.
 *
 * `intensity` is expo-blur's 1-100 scale. 55-70 is the band where iOS material
 * still reads as translucent; below it the pane looks merely dim, above it the
 * content behind stops being legible as motion and the depth cue is lost.
 *
 * Android divides intensity by `reductionFactor` — its blur renders visibly
 * stronger than iOS at the same number.
 */
export const glass = {
  intensity: 64,
  reductionFactor: 4.6,
  edgeWidth: 1,
} as const;

export const radius = {
  bar: 8,
  input: 12,
  card: 16,
  sheet: 24,
  pill: 999,
} as const;

export const space = {
  xs: 4, sm: 8, md: 12, base: 16, lg: 20, xl: 24, xxl: 32, huge: 40,
} as const;

/** Single elevation system. Index = how far off the canvas the surface sits. */
export type Elevation = Record<0 | 1 | 2 | 3, string>;

export const elevation: Elevation = {
  0: 'none',
  1: '0px 1px 2px rgba(23,19,15,0.05)',
  2: '0px 4px 16px rgba(23,19,15,0.08)',
  3: '0px 12px 32px rgba(23,19,15,0.14)',
};

export const elevationDark: Elevation = {
  0: 'none',
  1: '0px 1px 2px rgba(0,0,0,0.4)',
  2: '0px 4px 16px rgba(0,0,0,0.5)',
  3: '0px 12px 32px rgba(0,0,0,0.6)',
};

/**
 * Type ramp. Display is a high-contrast serif and carries all the emotion;
 * every control stays in the neutral UI sans. One display size per screen.
 */
export const type = {
  displayLg: { fontFamily: 'PlayfairDisplay_600SemiBold', fontSize: 34, lineHeight: 40, letterSpacing: -0.4 },
  displayMd: { fontFamily: 'PlayfairDisplay_600SemiBold', fontSize: 28, lineHeight: 34, letterSpacing: -0.3 },
  displaySm: { fontFamily: 'PlayfairDisplay_600SemiBold', fontSize: 22, lineHeight: 28, letterSpacing: -0.2 },
  numeral:   { fontFamily: 'PlayfairDisplay_500Medium', fontSize: 52, lineHeight: 60, letterSpacing: -1 },
  title:     { fontFamily: 'Inter_600SemiBold', fontSize: 17, lineHeight: 22, letterSpacing: -0.2 },
  bodyStrong:{ fontFamily: 'Inter_600SemiBold', fontSize: 15, lineHeight: 20, letterSpacing: -0.1 },
  body:      { fontFamily: 'Inter_400Regular', fontSize: 15, lineHeight: 21, letterSpacing: -0.1 },
  caption:   { fontFamily: 'Inter_400Regular', fontSize: 13, lineHeight: 17 },
  captionStrong: { fontFamily: 'Inter_600SemiBold', fontSize: 13, lineHeight: 17 },
  micro:     { fontFamily: 'Inter_700Bold', fontSize: 11, lineHeight: 14, letterSpacing: 0.7 },
} as const;

/**
 * Motion vocabulary — one set for the whole app.
 * Gestures get springs; everything else is timing under 300ms, strong ease-out.
 */
export const motion = {
  settle: { duration: 400, dampingRatio: 1 } as const,
  sheet: { duration: 300, dampingRatio: 0.8 } as const,
  press: 120,
  enter: 240,
  exit: 160,
} as const;
