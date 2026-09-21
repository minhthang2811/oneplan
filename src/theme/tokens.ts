/**
 * Pupu design tokens.
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
   * Pupu settles, the ground blooms, both leave, the app is revealed. Changing
   * one number here without the others is what turns a launch into a wait.
   *
   * ── THE BUDGET ─────────────────────────────────────────────────────────
   * These four numbers sum to the delay between tapping the icon and being
   * able to use the app, and that sum is the only figure that matters. It was
   * 2020ms, which is long enough that the animation stopped being a flourish
   * and became a wait — the complaint was that Pupu "takes too long to appear",
   * and the honest reading of that is not that one beat was slow but that
   * there were 260ms of dead air before anything moved and 2s of performance
   * after it.
   *
   * It is now 1340ms. Every beat is shorter and NONE of them is gone: a launch
   * that drops the hold reads as a stutter, and one that drops the handoff
   * gets a double exposure. Shortening all four keeps the shape and halves the
   * wait, which is the only trade available — the sequence is not compressible
   * past the point where the eye can land on the brand at all.
   */
  launch: {
    /**
     * The native splash's own fade-out, and therefore the exact amount of time
     * the JS overlay must sit perfectly still before it may move. Both sides
     * read this one number: `SplashScreen.setOptions({ duration })` in the root
     * layout, and the wake's delay in `LaunchScreen`. If they ever disagree you
     * get a moment with a static Pupu and a moving Pupu cross-fading through each
     * other, which looks like a double exposure.
     *
     * 140ms is the floor: below about 120 the cross-fade stops reading as a
     * dissolve and starts reading as a cut, which is the exact seam this
     * number exists to hide.
     */
    handoff: 140,
    /** Pupu's wake-up, starting the instant the native splash has handed over. */
    wake: { duration: 520, dampingRatio: 0.6 } as const,
    /** How long the finished frame is allowed to simply be looked at. */
    hold: 220,
    /** The iris opening out to the app underneath. */
    reveal: 460,
  } as const,

  /**
   * COMPLETION — the checkbox's beats.
   *
   * Lifted out of the component because the four of them have to stay in
   * proportion: the fill has to have area before the tick is drawn on it, and
   * the burst has to leave after the tick lands or it reads as two unrelated
   * animations that happened to fire together.
   */
  check: {
    /** Contact. The only beat that also fires on the way OUT. */
    squish: 90,
    /** The disc springing up from the centre. */
    fill: { duration: 380, dampingRatio: 0.58 } as const,
    /** Held back until the disc has most of its area. */
    drawDelay: 60,
    draw: 210,
    /** The spokes flying out. Longer than the draw, so it is still leaving
     *  when the tick has landed — one gesture, not two. */
    burst: 520,
    /** Undo: quicker than the commit, and with no burst. */
    undo: 150,
  } as const,
} as const;

/**
 * THE SCROLL EDGE.
 *
 * Apple's name for it, and their description of what it is for: "Scroll edge
 * effects further enhance legibility by blurring and reducing the opacity of
 * background content." It is the top counterpart to the floating tab bar —
 * content passing under the status bar gets a graded blur so the chrome above
 * it stays readable without a hard, permanently-drawn bar.
 *
 * The numbers are all in scroll points, because the effect has to be a function
 * of how far the content has travelled rather than of time.
 */
export const scrollEdge = {
  /** How far the content must scroll before the edge is at full strength. A
   *  short ramp reads as a switch; a long one never arrives. */
  ramp: 64,
  /** How far past the top the list must be before the compact title takes
   *  over from the large one. */
  hideAfter: 96,

  /**
   * Extra points of pure RAMP below the band, past where the controls stop.
   *
   * The blur used to end exactly where the bar's content did, and an effect
   * that stops on the same line as a row of controls does not read as an
   * effect: it reads as the bottom edge of a panel. Apple's own scroll edge
   * keeps fading well after the bar's content has ended, which is what makes
   * it look like the content is dissolving rather than like something sitting
   * on top of it. Nothing is laid out in here — it is fade and nothing else —
   * so it costs no vertical space.
   *
   * It is 56 rather than 30 because the fade has to be LONGER than the blur
   * it is hiding; see `bands` below.
   */
  fade: 56,

  /**
   * THE RAMP, AND THE ONE THING THAT ACTUALLY MAKES IT WORK.
   *
   * There is no gradient-mask primitive in React Native, so a progressive blur
   * is built by STACKING bands that all start at the top of the effect and stop
   * at different heights: content near the status bar passes under all of them,
   * content lower down passes under one. The accumulation is the gradient.
   *
   * ── WHY THE BANDS ALONE CAN NEVER BE ENOUGH ───────────────────────────────
   * A `BlurView` blurs what is behind it WITHIN ITS OWN BOUNDS and nothing
   * below. So wherever the longest band ends there is a hard horizontal line in
   * the CONTENT — blurred above it, sharp below — and no amount of ramping the
   * blur's strength moves that line or softens it. Weighting the bands (which
   * this does) shrinks how big the step is; it cannot remove it. On a screen
   * whose top content is a drawing rather than text, that line cuts straight
   * through the picture and is the first thing anyone sees.
   *
   * ── SO THE BANDS STOP EARLY AND THE SCRIM OUTLIVES THEM ───────────────────
   * The longest band reaches only `0.58` of the effect's height — well inside
   * the stretch where the scrim is still at full strength, and a clear margin
   * ABOVE the point where the scrim begins to release at `0.62`. That margin is
   * the part it is easy to get wrong: if the blur merely ends somewhere under a
   * *partial* scrim, then the first thing that becomes visible as the scrim
   * lets go is blurred content, and blurred content appearing out of nothing is
   * precisely what reads as a smudge on the glass. Ending the blur first means
   * that what emerges at the bottom of the effect is SHARP — the eye sees
   * content fading in, not a smear resolving.
   *
   * So: blur ends, then the scrim holds a little longer, then the scrim
   * releases. That order is the whole design, and it is why `fade` had to
   * grow — the scrim needs room to come down to nothing after the last band has
   * gone.
   *
   * `h` is a band's height as a fraction of the effect; `w` is its share of the
   * blur, as a fraction of `glass.intensity`. The weighting runs the opposite
   * way from the obvious: the LONGEST band carries the LEAST, because blur radii
   * compose as roughly the root of the sum of squares and equal bands put their
   * largest perceptual steps at the weak end, which is exactly where the eye is
   * most sensitive to them.
   */
  bands: [
    { h: 0.58, w: 0.11 },
    { h: 0.5, w: 0.16 },
    { h: 0.42, w: 0.22 },
    { h: 0.33, w: 0.3 },
    { h: 0.23, w: 0.4 },
    { h: 0.12, w: 0.54 },
  ],

  /**
   * The scrim's alpha, sampled down the effect at `scrimStops`.
   *
   * ── THIS IS THE EFFECT, NOT A GARNISH ─────────────────────────────────────
   * Apple's description of a scroll edge is "blurring and REDUCING THE OPACITY
   * of background content", and the second half is the half that was missing.
   * The scrim used to be `glassTint` — a near-white at 0.62, borrowed from the
   * floating tab bar, where the whole point is that you can still see movement
   * behind the material. Over a scrolling page that is far too weak: the
   * content underneath stayed clearly visible, so a blurred illustration read
   * as a coloured smear on the screen rather than as something fading away.
   *
   * It now peaks at 0.95 and holds through the whole bar, so content passing
   * under the status bar and the compact title is reduced to a ghost. Reminders
   * is the reference: the rows behind its scrolled top are barely there at all.
   *
   * The hold runs to `0.64`, which is just past the bottom of the bar itself,
   * so the clock and the compact title never sit on anything but a flat page.
   * The number was measured rather than guessed: what survives a wash is not
   * the bright part of a picture but its DARK LINEWORK, and the Me screen
   * scrolls a drawing of a dog under here whose outline is ~200 levels away
   * from the canvas. At 95% cover that is two levels; at 85% it is thirty, and
   * thirty levels is exactly enough to read as a mark on the glass. The hold is
   * set by the hardest case on the hardest screen, not the average one.
   *
   * ── AND IT IS PAINTED IN THE CANVAS COLOUR ────────────────────────────────
   * Which `ScrollEdge` takes from the theme rather than from a token, because
   * the whole trick depends on it matching the page. A scrim of the PAGE's own
   * colour makes content dissolve into the background; `glassTint` is lighter
   * than the canvas, so raising its opacity would instead have drawn a pale bar
   * across the top of every screen.
   *
   * The curve holds flat to 0.45 and then runs a smoothstep to zero, so it has
   * no corner at either end. A linear fade to zero still reads as an edge: the
   * eye takes a discontinuity in the RATE of change for a line, even when the
   * colour itself is continuous.
   */
  scrimStops: [0, 0.64, 0.74, 0.84, 0.93, 1],
  scrimAlphas: [0.95, 0.95, 0.77, 0.396, 0.093, 0],
} as const;

/**
 * THE FOCUS SCREEN'S FOREST.
 *
 * ── THIS IS THE ONE DOCUMENTED EXCEPTION TO THE COLOUR CONTRACT ────────────
 * The contract at the top of this file says there is one accent and that
 * `TINTS` is data encoding, never decoration. These greens are neither: they
 * are ATMOSPHERE, they appear on exactly one screen, and nothing in the app
 * ever means anything by them. They are kept out of `Colors` for that reason —
 * a botanical green must never become reachable as a semantic token, because
 * the moment it is, something will be tinted with it and the contract is gone.
 *
 * ── WHY THEY ARE THIS DESATURATED ──────────────────────────────────────────
 * Focus is the screen you are meant to STOP looking at. The reference class
 * (Forest, Life Reset) puts real scenery behind the dial and gets away with it
 * because the scenery is low-contrast and the timer is the only bright thing.
 * A saturated forest here would compete with the numerals, which are the one
 * thing on the screen that has to be readable at a glance from across a desk.
 *
 * Light is a pale sage wash — colour arriving as pigment on an already-bright
 * canvas. Dark is near-black with just enough green to be a place rather than
 * an absence, for the same reason `FocusAura` inverts: deep values on a
 * near-black canvas read as mud, so the dark set stays close to the canvas and
 * separates by value alone.
 */
export const botanical: Record<
  'light' | 'dark',
  {
    /** The vertical wash, top to bottom. Replaces the flat canvas fill. */
    skyTop: string;
    skyBottom: string;
    /** Light coming through the canopy. */
    sun: string;
    /** Three depths of foliage, far to near. */
    far: string;
    mid: string;
    near: string;
    /** The foreground fronds that frame the stage. */
    frond: string;
    /** Leaf midribs and stems — one step darker than the leaf they sit on. */
    stem: string;
  }
> = {
  light: {
    skyTop: '#F4F3EC',
    skyBottom: '#E5EDE1',
    sun: '#FFF6DF',
    /**
     * Foliage is PALER than the first pass, and the first pass is worth
     * recording as the mistake it was. Drawn at a comfortable illustration
     * contrast the fronds read as stickers laid over the screen rather than as
     * the room the dial is in — and they sat directly behind the screen's
     * title, which they have no business competing with. Scenery on a focus
     * screen has to be one of the quietest things on it.
     */
    far: '#D5E1CF',
    mid: '#C2D4BB',
    near: '#AECAA7',
    frond: '#A6C5A1',
    stem: '#93B58E',
  },
  dark: {
    skyTop: '#101512',
    skyBottom: '#0A0F0C',
    sun: '#2A2A1C',
    far: '#18231B',
    mid: '#1D2C22',
    near: '#243629',
    frond: '#2B4132',
    stem: '#35503C',
  },
};
