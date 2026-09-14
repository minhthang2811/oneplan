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
  /** The CRISP reflection — the hard, bright glint along the top of a convex
   *  surface, and the small bloom just under it. Distinct from `glassSheen`,
   *  which is the broad soft light across the whole dome: a gel surface has
   *  both, and having only the soft one is what makes a pane read as flat. */
  glassSpecular: string;
  /** The bright arc at the BOTTOM rim, where light that entered the top has
   *  travelled through the body and concentrated on the far side. This is the
   *  single most droplet-like cue there is — a surface lit only from above
   *  reads as a lid, not as something with a volume of material in it. */
  glassCaustic: string;
  /** The inset shade in the lower body, where a convex surface curves away
   *  from the light. Drawn as a real `boxShadow` with `inset`, so it hugs the
   *  rounded corners the way a painted gradient cannot. */
  glassInnerShade: string;
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
    glassSheen: 'rgba(255,255,255,0.38)',
    glassBounce: 'rgba(255,255,255,0.26)',
    glassChip: 'rgba(255,255,255,0.92)',
    glassChipSheen: 'rgba(255,255,255,0.95)',
    /**
     * LIGHT MODE HAS NO HEADROOM ABOVE WHITE, so its convexity is carried by
     * the SHADE, not by the light. The pane's base is already ~250/255 once the
     * blur and the scrim are down; piling white on top of that clipped the
     * whole dome flat, measured at a 5-level range across the entire bar. The
     * white values here are therefore restrained and `glassInnerShade` does the
     * structural work. Dark mode is the mirror image and can afford the light.
     */
    glassSpecular: 'rgba(255,255,255,0.85)',
    glassCaustic: 'rgba(255,255,255,0.34)',
    glassInnerShade: 'rgba(23,19,15,0.22)',
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
    glassSpecular: 'rgba(255,255,255,0.38)',
    glassCaustic: 'rgba(255,255,255,0.15)',
    glassInnerShade: 'rgba(0,0,0,0.58)',
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
   * GELMORPHISM — the convex profile.
   *
   * Frosted glass is FLAT: it blurs what is behind it, takes one linear wash of
   * light from top to bottom, and stops. That linear ramp is exactly what makes
   * it read as a flat pane angled at a lamp. A gel surface is CONVEX, and a
   * convex surface does not fall off linearly:
   *
   *     bright ┤●                                    ← crisp specular, at the peak
   *            │ ●
   *            │   ●●                                ← fast falloff off the crown
   *            │      ●●●●
   *            │           ●●●●●●●●●●●●              ← long shallow trough
   *      dark  ┤                        ●●●●●
   *            │                             ●●
   *            │                                ●    ← caustic: light that entered
   *            └────────────────────────────────┘      the top, refracted through
   *             top                          bottom    the body, and concentrated
   *                                                    on the FAR rim
   *
   * The numbers below are that curve, as gradient stop offsets down the pane's
   * own height. Spacing them evenly is what turns a droplet back into a pane —
   * the unevenness IS the curvature.
   */
  /** Where the crisp top glint has fully decayed. Tight: a specular is a
   *  reflection of the light SOURCE, not a wash, and a soft one is just the
   *  sheen again. */
  specularStop: 0.13,
  /** How far in from each end of a pill the crisp glint starts and stops, as a
   *  fraction of width. A highlight that runs edge to edge at full strength
   *  reads as a painted stripe; a real one falls off where the surface turns
   *  away round the ends. */
  specularInset: 0.12,
  /** The broad dome light: bright at the crown, mostly gone by here. */
  sheenStop: 0.46,
  /** The bottom of the trough — the darkest part of the body, where the surface
   *  has curved furthest from the light but the caustic has not yet begun. */
  troughStop: 0.78,
  /** Where the bounce light off the content below fades out, measured up from
   *  the bottom edge. */
  bounceStop: 0.22,
  /** Where the caustic starts to climb on the way to the bottom rim. */
  causticStop: 0.88,

  /**
   * The radial hotspot. A vertical gradient alone describes a CYLINDER — correct
   * for the long axis of a pill, and still wrong, because it has no left-right
   * variation at all and so reads as extruded. One off-centre elliptical bloom
   * is what says "a light source is over there" and turns the extrusion into an
   * object. Centre is a fraction of the pane's own box.
   */
  hotspot: { cx: 0.32, cy: 0.06, rx: 0.42, ry: 0.95 },

  /**
   * The inset rim shade, in points. Drawn as a real `boxShadow` with
   * `inset: true` rather than as another painted gradient, because a shadow
   * follows the rounded corners exactly and a rectangle of gradient does not —
   * on a pill that difference is the whole bottom third of the shape.
   */
  innerShade: { y: -6, blur: 10 },
  /** The matching inset LIGHT at the top, which is what actually makes the
   *  surface look like it bulges towards you rather than being dented in. */
  innerLight: { y: 3, blur: 6 },

  /** The lit edge is brightest at the top and dimmest at the bottom; this is
   *  how far round the stroke has travelled when it has fully dimmed. Less
   *  than 1 so the very bottom keeps a trace of light rather than going dead. */
  edgeFalloff: 0.62,
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
  /**
   * The ELASTIC RELEASE. A gel surface pressed and let go does not return to
   * rest, it rebounds — so the press-out is a spring with a visible overshoot
   * while the press-IN stays a 120ms timing.
   *
   * That asymmetry is the whole design, and it is what keeps this affordable on
   * an action performed a hundred times a day. Contact has to be reported
   * instantly or the control feels laggy, so nothing springy is allowed on the
   * way down. The rebound happens after the user has already got their answer,
   * costs them no waiting, and is the only part that reads as "material".
   */
  release: { duration: 420, dampingRatio: 0.55 } as const,
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
