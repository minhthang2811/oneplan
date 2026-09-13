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
  /** The SAME edge where it faces away from the light. Glass does not carry one
   *  uniform hairline all the way round — grading the stroke from `glassEdge`
   *  at the top to this at the bottom is what turns a rounded rectangle into a
   *  lit object with a near side and a far side. */
  glassEdgeDim: string;
  /** Specular sheen: the bright smear across the upper third of a gel surface,
   *  where it catches the light source directly. Distinct from `glassTint`,
   *  which is a flat legibility scrim over the whole pane. */
  glassSheen: string;
  /** Light bouncing back UP into the underside of the pane from the content
   *  below it. Faint by definition — it only has to stop the bottom edge from
   *  reading as a cut. */
  glassBounce: string;
  /** Active chip ON glass. Lifts in both themes — see `surfaceSelected`. */
  glassChip: string;
  /** The chip's own top highlight, so the selection reads as a gel lozenge
   *  sitting IN the bar rather than as a flat swatch painted on it. */
  glassChipSheen: string;
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
    glassEdgeDim: 'rgba(255,255,255,0.30)',
    glassSheen: 'rgba(255,255,255,0.70)',
    glassBounce: 'rgba(255,255,255,0.38)',
    glassChip: 'rgba(255,255,255,0.92)',
    glassChipSheen: 'rgba(255,255,255,0.95)',
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
    glassEdge: 'rgba(255,255,255,0.18)',
    glassEdgeDim: 'rgba(255,255,255,0.04)',
    glassSheen: 'rgba(255,255,255,0.13)',
    glassBounce: 'rgba(255,255,255,0.05)',
    glassChip: 'rgba(255,255,255,0.13)',
    glassChipSheen: 'rgba(255,255,255,0.20)',
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
  /**
   * GEL, not just glass.
   *
   * Frosted glass is flat — it blurs what is behind it and stops. What makes a
   * surface read as a soft, slightly rubbery *gel* is that it also has a body:
   * light lands on the top of it, bends through it, and bounces back into its
   * underside. Three numbers carry that, and they are all fractions of the
   * pane's own height so the material scales with the component.
   */
  /** How far down the pane the specular sheen reaches before it is gone. */
  sheenStop: 0.46,
  /** Where the bounce light off the content below fades out, measured up from
   *  the bottom edge. */
  bounceStop: 0.22,
  /** The lit edge is brightest at the top and dimmest at the bottom; this is
   *  how far round the stroke has travelled when it has fully dimmed. Less
   *  than 1 so the very bottom keeps a trace of light rather than going dead. */
  edgeFalloff: 0.78,
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

  /**
   * LIQUID. A pair of springs on the same target with different damping is the
   * whole trick behind a gooey indicator: the leading edge runs ahead on the
   * loose spring while the trailing edge lags on the tight one, so the shape
   * between them stretches on the way out and catches up on the way in.
   *
   * `lead` must be the looser of the two. Swap them and the blob stretches
   * BACKWARDS, which reads as a rendering glitch rather than as a material.
   */
  lead: { duration: 460, dampingRatio: 0.62 } as const,
  trail: { duration: 620, dampingRatio: 0.9 } as const,

  /**
   * The launch sequence, in one place because the four beats have to add up:
   * Pip settles, the ground blooms, both leave, the app is revealed. Changing
   * one number here without the others is what turns a launch into a wait.
   */
  launch: {
    /**
     * The native splash's own fade-out, and therefore the exact amount of time
     * the JS overlay must sit perfectly still before it may move. Both sides
     * read this one number: `SplashScreen.setOptions({ duration })` in the root
     * layout, and the wake's delay in `LaunchScreen`. If they ever disagree you
     * get a moment with a static Pip and a moving Pip cross-fading through each
     * other, which looks like a double exposure.
     */
    handoff: 260,
    /** Pip's wake-up, starting the instant the native splash has handed over. */
    wake: { duration: 720, dampingRatio: 0.58 } as const,
    /** How long the finished frame is allowed to simply be looked at. */
    hold: 420,
    /** The iris opening out to the app underneath. */
    reveal: 620,
  } as const,
} as const;
