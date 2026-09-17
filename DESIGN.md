# Pupu — design system

Pupu is a visual day planner. The reference class studied before any code was
written was **Tiimo** (ADHD task & planning assistant, Apple Design Award
finalist 2024) — roughly 30 real shipping screens across its onboarding, Today,
To-do, add-activity and Focus flows, pulled from Mobbin.

A second pass, again on Mobbin, benchmarked the three moments this document
now calls out separately — the **launch screen** (Duolingo, Yazio, Pinterest,
Me+), the **floating gel tab bar** (Apple Photos and Apple News under iOS 26's
Liquid Glass, plus Calm, Quizlet and CLEAR), and **task completion** (Finch,
Numo, and Tiimo itself).

A third pass looked at **Focus** on its own, against **Life Reset**'s pomodoro
screen and the wider timer class (Waking Up, Oura, Toggl Track, CREME, Runna).
That comparison is what produced the stage-and-tray split described under
[Focus: the stage and the tray](#focus-the-stage-and-the-tray).

What was taken is the **pattern**, not the pixels.

## The patterns adopted, and why

| Pattern | Where it came from | Why it works |
|---|---|---|
| High-contrast **serif display** over a neutral UI sans | Tiimo's `Thursday` / `Focus` / question headlines | The serif carries all the warmth so every *control* can stay quiet. One display size per screen. |
| **Time-of-day buckets** (Anytime / Morning / Afternoon / Evening) as tinted pills with counts | Tiimo's `MORNING (3)` chips | A loose ordering beats a timetable for people who cannot predict their own pace, but still gives the day a shape. |
| **Colour as data**, not decoration | Tiimo's pastel activity discs | The tint *is* how a day gets scanned without reading. This is the accessibility affordance, not styling. |
| **Emoji as the activity's identity** inside a tinted disc | Tiimo task rows | Picture-first recall. Emoji is content here; it never appears in chrome. |
| **Nested checklist with a `0/4` progress strip** | Tiimo's routine rows | Lets a "routine" be one row when calm and four steps when stuck. |
| **Countdown ring around the activity's own icon** | Tiimo Focus | Time becomes an area that visibly shrinks — the core idea of visual time management. |
| **Floating pill tab bar** (To-do / Today / Focus / Me) | Tiimo | The product's most recognisable chrome. Still the real Tabs navigator underneath. |
| **Glass navigation** — blur + scrim + lit edge, with a chip that slides between tabs | Tiimo's floating bar, read against TIDE / Calm / Apple News | Translucency is what makes a floating bar read as *above* the day rather than as a slab parked on top of it. |
| **Routine picker**: a time-of-day badge, one question, a field of emoji chips | Tiimo's `MORNING` → "Add morning routines to your schedule" | Asks for what someone already does instead of what they intend to do. Recognition, not recall. |
| **Ticked dial** and a wall-clock **"Ends at"** readout | Tiimo Focus | Minute ticks give the ring a scale; the end time answers the question a countdown does not ("when am I free?"). |
| **Steps on the focus screen** | Tiimo Focus with a routine | Focusing on a four-step routine should not mean leaving the timer to tick the steps off elsewhere. |
| **A calm stage over a grounded control tray** | Life Reset's pomodoro, read against Waking Up, Oura and CREME | The class is unanimous: the time is ambient and untouchable, and every control lives in one panel at the bottom. It puts the primary action where the thumb already is and stops the controls drifting as the content above them changes size. |
| **Mascot dead centre on the launch screen**, wordmark directly beneath | Duolingo, Yazio, Me+ | The whole class converges on this: one character, centred, name under it, on a single flat or barely-graded ground. Anything busier competes with the app it is about to hand over to. |
| **Brand shapes flung outward as the splash leaves** | Pinterest's splash | The exit is where a launch screen earns its keep; Pinterest scatters its confetti shapes rather than dissolving. Ours are painted from `TINTS`, so the launch is made of the user's own day. |
| **A filled capsule chip behind the active tab**, glyph tinted, bar translucent | Apple Photos, Apple News, Calm, Quizlet | Unanimous across the benchmark set, including Apple's own iOS 26 bars. It is what Pupu already had — the second pass confirmed the shape and changed only the *material*. |
| **Completion is the checkbox, not the screen** | Finch, Numo, Tiimo | Even the apps that throw confetti elsewhere keep the per-item beat local: fill, tick, strike, dim. A full-screen celebration per task is the thing that stops being charming on day two. |

## Colour contract

1. **One accent — `#7A5AF8`.** It owns every interactive, progress and active
   state, on every screen. There is no second accent.
2. **`accentInk` is the same hue, darkened for text.** Accent *fills and
   strokes* use `accent`; accent-coloured *text and glyphs* on tinted surfaces
   use `accentInk`, because `accent` on `accentSoft` measures only 3.7:1. It is
   one accent at two lightnesses, not two accents.
3. **`TINTS` is a data-encoding palette, not an accent set.** Six hues plus one
   neutral, each with a light and dark pair, used *only* for activity discs and
   time-of-day chips. This is the one deliberate exception to single-accent
   discipline, and it is load-bearing rather than decorative.

   Six, not eight. Eight pastels forced neighbours (peach/clay, butter/sage)
   down to **deltaE ~8**, which reads as the same colour and defeats the whole
   premise. The six-hue set measures **deltaE 14.2 minimum in light, 12.8 in
   dark**, and every foreground clears 5.2:1 on its own background. When colour
   *is* the data, separation beats variety.
4. **One grey family: warm**, in a three-step ramp — `ink` / `inkMuted` /
   `inkFaint` — where every step clears 4.5:1 on every surface it is used on, in
   both themes.
5. **`surfaceSelected` exists because selection and recession are opposites in
   dark mode.** A selected tab chip must *lift* off the bar while a recessed
   checklist strip must *sink* into the card; sharing one token made the active
   tab invisible in dark.
6. Both themes are defined token-for-token in `src/theme/tokens.ts`. No screen
   defines a colour of its own — the audit for hardcoded hex outside the token
   file returns zero.

## Shape contract

Actions and chips are **pills**; cards **16**; sheets **24**; inputs **12**;
inner progress bars **8**. Circles are `size / 2`. Every rounded *rectangle*
carries `borderCurve: 'continuous'`.

## Spacing and type scaling

4pt base. Gaps come from flexbox `gap`, not stacked margins. ScrollView padding
lives in `contentContainerStyle`.

Every `lineHeight` in the ramp is **multiplied by the clamped font scale** at
render time. React Native scales `fontSize` with Dynamic Type but leaves an
absolute `lineHeight` untouched, so a fixed value shears the glyphs at large
text sizes — invisible at 100%, and the reason "Quick tidy" rendered as
"Quick tidv" at XXXL before this was fixed.

## Motion vocabulary

Decided by the frequency gate, in this order:

- **Tab switches**: a short cross-fade (`animation: 'fade'`), never a slide —
  see the note below.
- **Stack transitions stay the PLATFORM push**, with two options turned on.
  `fullScreenGestureEnabled` lets a detail screen be thrown away from anywhere
  rather than from the left 20pt, and `animationMatchesGesture` makes the
  dismissal track the finger instead of playing a canned exit once the gesture
  is recognised. Together they are the whole of what "fluid" means here, and
  neither is on by default. Android gets `ios_from_right`, because its own
  default has no spatial relationship in it at all.

  The push itself is **not** reimplemented in JavaScript. It is already
  spring-backed, interruptible and gesture-tracking; every custom stack trades
  that away for control nobody asked for. What the platform *cannot* do is give
  an arriving screen's contents any continuity with where you came from, so
  that is what `Rise` adds — see **Arrival** below.
- **Press feedback** (tens of times a day) is **asymmetric, and the asymmetry is
  the design.** Down is a 120ms ease-out `bezier(0.23, 1, 0.32, 1)`, unchanged —
  contact has to be reported immediately or the control feels laggy, so nothing
  springy is allowed on the way down. Up is a spring with a visible overshoot
  (`motion.release`), because a gel surface that is pressed and released
  rebounds rather than sliding back. The rebound happens *after* the user
  already has their answer, so it costs them no waiting, which is what keeps it
  affordable at this frequency.

  It **flattens rather than shrinks**: X and Y are scaled by different amounts
  (0.55× and 1.45× of the same delta), because a droplet under a finger spreads
  — the material has to go somewhere. A uniform scale is just a view getting
  smaller.

  **List rows still never scale, and that is the boundary of the treatment.** A
  squish is a property of a discrete object with edges you can see; a row's
  edges are shared with the rows above and below, so squishing one announces it
  as a separate object and makes the list read as a pile of loose cards. The
  material language stops where the objects stop being separate.
- **Gestures**: the focus dial tracks the finger 1:1 on the UI thread, snaps to
  a whole minute on release with `{ duration: 400, dampingRatio: 1 }`, and has a
  haptic detent every five minutes.
- **The countdown ring** sweeps with a single long `withTiming` on the UI
  thread; only the numeric readout re-renders, once per second.
- **The tab selection chip is liquid.** It stretches as it leaves one tab,
  thins in the middle, and pulls itself back together as it lands — see
  **The liquid indicator** below. This is the one place a tab change animates,
  and it is chrome moving *within* the bar; the scenes cross-fade rather than
  travel, so "tabs never slide" still holds. On a translucent bar the chip is
  the only thing that says which tab is live, so moving it continuously is what
  ties the tap to the result.
- **Completing something** is four beats on the checkbox and one on the title:
  a rubbery **squish**, a **fill** that springs up from the centre, a tick that
  **strokes itself** along its own path, and one **ring** that expands past the
  box and fades — then the title is **struck through** by a rule that is drawn
  from the left. Unchecking gets the squish and nothing else. See
  **Completion** below.
- **Routine chips** overshoot on the way *in* only. Deselecting is a correction
  and should not be celebrated.
- **The focus halo** is the app's only ambient animation, confined to the one
  screen you are meant to stop looking at. Its 4.4s period is deliberately far
  slower than a resting breath so it never becomes something to watch, and it
  does not render at all under Reduce Motion.
- **Reduce Motion** collapses spatial motion to cross-fades throughout.

**Tabs cross-fade; they never slide.** Tabs are peers, so there is no left or
right to travel along — a slide invents a spatial relationship the information
architecture does not have and implies a hierarchy the app does not have either.
This is also the most-used transition in the app, and the frequency gate gives a
100+/day action near-nothing; a fade is the cheapest thing that is still a
transition, softening the swap so content does not appear to teleport. Set as
`animation: 'fade'` in `app/(tabs)/_layout.tsx` (`'shift'` is the sliding one,
and is the one to avoid).

That option **must** be paired with `detachInactiveScreens={false}`. On iOS
react-native-screens detaches a blurred tab from the native hierarchy by
default, and a screen detached mid-fade comes back mounted, correctly laid out
and invisible. Nothing errors — the view tree is intact and every element
reports correct bounds — so only a screenshot reveals it.

## Onboarding shape

Five steps: need → rhythm → **routines** → reminders → ready.

Routines asks three questions (morning, afternoon, evening) from **one route**.
Tiimo asks them as three consecutive screens, and one-at-a-time is right — a
single page of thirty-six chips is the wall of choice this audience bounces off.
But three routes would put three entries in history for what is one decision, so
the phases are local state, the progress bar advances by a third each time, and
back steps through the phases before it is allowed to pop the route.

Each slot's picks collapse into **one parent activity whose steps are the
picks** — the same nested-checklist row the rest of the app uses — and it
*overwrites* that slot's seeded routine rather than sitting beside it, so nobody
ends up with two "Morning routine" rows, one of which they did not choose.

Selection is carried by **fill, plus a redundant tick**: at a dozen chips a row
of checkboxes reads as a form to complete, while a block of filled pills reads
as a shape. The tick is there so selection never depends on colour alone.

## Glass

`GlassPanel` is the one glass primitive, and it has **two implementations**.

### On iOS 26+: Apple's real Liquid Glass

`expo-glass-effect` wraps the system material, and it does things no amount of
painting can. It **refracts and lenses the live content moving behind it**,
bends light around its own edges with visible colour fringing, and adapts its
own contrast to whatever scrolls underneath. Everything in the fallback section
below is an imitation of this, and the imitation must never run when the real
thing is available — `LIQUID_GLASS` in `Glass.tsx` is read once at module load
and branches the component.

Four decisions inside that path:

1. **`regular`, not `clear`.** Clear is for surfaces over media-rich content and
   needs its own dimming layer underneath to stay legible. This bar floats over
   arbitrary text and cards, which is the case `regular` is built to adapt to on
   its own.
2. **Tint the material, do not scrim it.** Real glass refracting live content is
   the whole point of it and also the whole risk: without a tint, the words on a
   card scrolling underneath read *straight through the bar* and compete with
   the tab labels, so contrast becomes a property of the user's own data. This
   was clearly visible in dark mode before the fix. `tintColor={c.glassTint}`
   applies it to the material itself; stacking a scrim on top would be a second
   layer sitting on the glass, which is the thing rule 3 forbids.
3. **Never glass on glass.** Apple's guidance is explicit: when you put
   something on top of a glass surface, do not give it the material as well —
   two stacked glass layers each try to refract the other and read as clutter.
   What goes on top should be a fill, transparency or vibrancy, a thin overlay
   belonging to the material underneath. So on this path the selection chip
   renders **no** gel surface and **no** inset rim; it is a plain translucent
   fill, which is also exactly what Apple's own bars do — Photos and News both
   use a simple filled capsule behind the active tab.
4. **`isInteractive`, on the tab bar only.** The system deforms the material
   under the finger — it swells towards the touch and settles back on release.
   This bar is the one surface that earns it, and the reason is the drag:
   everything else that floats here is *tapped*, and a pane that squirms under a
   tap reads as instability, while this one is a control you put a finger on and
   **pull**. It is also the piece of the real material no amount of painting can
   reach, which is the whole reason the native path exists.
5. **`GlassGroup` exists but the bar does not use it.** `GlassContainer` makes
   *sibling* glass views fuse as they approach — two droplets on a windscreen,
   and the behaviour that most separates Liquid Glass from a blur. It is wrapped
   as `GlassGroup` for where there are genuinely sibling floating controls. This
   bar is one continuous surface, so there is nothing to fuse with, and wrapping
   one surface in a container costs a native view and buys nothing.

**Both availability checks, not just the obvious one.** `isLiquidGlassAvailable()`
answers "was this binary compiled against an SDK that has Liquid Glass, running
on an OS that has it". `isGlassEffectAPIAvailable()` answers "is the API actually
there at runtime", which is a *different* question on the iOS 26 betas that
shipped the OS version without the glass API. On those, the first returns true
and the second does not — and taking the native path anyway renders a plain,
untinted `View` where the tab bar should be: no blur, no material, chrome text
sitting directly on whatever scrolled underneath. The painted gel is a far better
answer than nothing, so the real path requires both.

The drop shadow still lives on an outer wrapper, for the same reason it always
did: a rounded, clipping surface cannot cast its own.

### Everywhere else: the painted gel

On **iOS 25 and older, and on Android**, `expo-glass-effect` falls back to a
plain `View`, so the material has to be built by hand. That is what the rest of
this section is.

Flat glassmorphism is a blur, a scrim, and a hairline — and every one of those
is a property of a **flat pane**, which is why it always reads as a sheet of
frosted acrylic laid on the screen. Gel reads as a droplet of material *resting*
on the screen. It is not as good as the real system material and is not trying
to be; it is what the platforms without one get. The whole difference is in how it handles light, and it is
defined once in `src/components/Gel.tsx` so the tab bar and its selection chip
cannot drift apart.

### The convex profile

A flat pane takes a **linear** wash of light. A convex one does not:

```
bright ┤●                                    ← crisp specular, at the peak
       │ ●
       │   ●●                                ← fast falloff off the crown
       │      ●●●●
       │           ●●●●●●●●●●●●              ← long shallow trough
 dark  ┤                        ●●●●●
       │                             ●●
       │                                ●    ← caustic: light that entered the
       └────────────────────────────────┘      top, refracted through the body,
        top                          bottom    and concentrated on the FAR rim
```

Those stop offsets live in `glass` (`specularStop`, `sheenStop`, `troughStop`,
`causticStop`). **Spacing them evenly turns the droplet back into a pane — the
unevenness *is* the curvature.**

| Layer | What it is | Why it matters |
|---|---|---|
| **Dome** | Five-stop vertical gradient following the curve above | Most of the convexity. A two-stop ramp is the flat-pane tell. |
| **Specular** | A crisp ellipse hugging the crown, inset from both ends | The reflection of the light *source*, not a wash. Having only the soft sheen is the single biggest tell of flat glassmorphism. |
| **Hotspot** | One off-centre radial bloom | A purely vertical gradient describes a *cylinder* — no left-right variation at all, so it reads as extruded. The bloom gives it a light source in the room. |
| **Caustic** | The bright arc at the bottom rim | A surface lit only from above reads as a lid. The bright far rim is what says there is a *volume* of material in between. |
| **Bounce** | Soft lift in the bottom ~22% | Light reflected off the content below. |
| **Rim** | Graded stroke: lit at top, dark through the middle, **bright again at the very bottom** | A rim that only dims is a lit pane; a rim that comes back is a droplet. |
| **Inset shade** | A real `boxShadow` with `inset: true`, paired with an inset *light* at the top | Not another painted gradient: a shadow follows the rounded corners exactly and a rectangle of gradient does not — on a pill that is the whole bottom third of the shape. The paired top light is what makes the surface bulge *toward* you; the dark alone is a bowl. |

### Light mode has no headroom above white

This is the thing that cost the most to learn and is the least obvious. The
pane's base is already **~250/255** once the blur and the scrim are down, so
piling white on top of it clips the entire dome flat: the first attempt measured
a **5-level luminance range across the whole bar**. Convexity in light mode has
to be carried by the **shade**, not by the light.

The two themes are therefore not symmetrical, on purpose. Light keeps its whites
restrained and lets `glassInnerShade` do the structural work; dark has all its
headroom above and can afford the glossy specular. Measured on the tab bar:

| Theme | crown | trough | caustic lift | range |
|---|---|---|---|---|
| Light | 254 | 249 → 211 | back to 229 | 43 |
| Dark | 162 | 27 | back to 37 | 135 |

### Why a rich static material is affordable

The metaball investigation measured exactly this trade-off: a **static**
filtered or gradient region is rasterised once and costs nothing (60.0fps,
16.67ms), while an **animated** one is re-rasterised every frame (15.0fps,
66.68ms). Nothing in the gel animates. The selection chip *does* move, but by a
transform on its parent view — a compositor operation on an already-rasterised
layer, not a repaint — so it gets the full material, and its specular smears as
the blob stretches, which is what a highlight on moving liquid actually does.

The chip renders the same `GelSurface` at `strength={0.72}`, because it sits
*on* the bar and already has the bar's lighting behind it; at full strength it
stops reading as a droplet resting in a pane and starts reading as a second
object stuck on top.

The pane **measures itself** before drawing any of it:The pane **measures itself** before drawing any of it: SVG needs real numbers,
because a percentage `rx` cannot express "a pill" and a percentage stroke cannot
be a hairline. The blur and the scrim are already painted by then, so there is
no visible pop — what *would* pop is guessing the height and getting the corner
radius wrong.

Three further things decide whether it reads as glass at all rather than as a
grey box, and all three are easy to get wrong:

1. `BlurView` **ignores an explicit `borderRadius`**, so the rounding must come
   from a parent that clips it.
2. On iOS `overflow: 'hidden'` sets `masksToBounds`, which **clips the view's own
   drop shadow away** — so the shadow cannot live on the clipping view. Hence an
   outer wrapper whose only job is to cast it.
3. Blur alone does not separate a pane from its background; the **lit edge**
   does. A hairline of near-white along the border is what the eye reads as a
   physical edge catching light.

The scrim over the blur (`glassTint`) is not decoration: without it chrome text
sits on whatever happened to scroll underneath, and contrast becomes a property
of the user's data. `glassChip` lifts in both themes, for the same reason
`surfaceSelected` exists.

Intensity is **64** on a 1–100 scale. Below ~55 the pane looks merely dim rather
than translucent; above ~70 the content behind stops being legible as motion and
the depth cue is lost.

### The liquid indicator

The tab bar's selection chip is a **metaball**: a blob of liquid that stretches
as it leaves one tab, thins in the middle, and pulls itself together as it
arrives at the next. It is also **draggable** — put a finger on the bar and the
blob follows it, smearing behind the drag and catching up whenever you pause,
with a haptic detent each time it crosses into a new tab. Nothing commits until
you let go; switching screens mid-drag would mean four screen transitions for
one gesture.

It is built from **two springs on one target**, not from a gooey filter.
`motion.lead` is loose and runs ahead, `motion.trail` is tight and lags, and the
chip is drawn spanning the gap between them — so the distance between the two
springs *is* the stretch. It appears on the way out and vanishes on arrival for
free, with no keyframes and nothing to keep in sync. `scaleY` comes down as
`scaleX` goes up, because liquid conserves volume; with `borderRadius: pill` the
round ends squash into ellipses as it travels and snap back to circles as it
lands, which is the whole tell.

**The real filter was built and measured, and it is rejected on frame time.**
The textbook metaball is `feGaussianBlur` plus an `feColorMatrix` that
hard-contrasts the alpha channel, and `react-native-svg` 15.15.4 ships all of it.

The obvious objection is that the threshold maths needs near-opaque shapes while
this chip is `rgba(255,255,255,0.13)` in dark — and **that objection is wrong**,
which is worth recording so nobody re-derives it. Put *opaque* blobs in a group,
filter the group, and apply the translucency to the group's own `opacity`:

```
<G opacity={0.13} filter="url(#goo)"> …opaque white blobs… </G>
```

The filter then gets a clean alpha channel to threshold and the result still
renders translucent. This was prototyped and it fuses correctly in both themes.

It was rejected because **it cannot hold a frame.** Measured on an iPhone 17 Pro
Max simulator with `useFrameCallback`, at production geometry and production
spring configs, driving a tab change every 700ms:

| Phase | fps | mean frame | frames over 33ms |
|---|---|---|---|
| filter present, nothing moving | 60.0 | 16.67ms | 0 / 211 |
| filter + blobs animating | **15.0** | **66.68ms** | **53 / 53** |
| filter present, nothing moving | 60.0 | 16.67ms | 0 / 211 |

The static bookends are the control: both return to exactly 60, so this is not
thermal throttling or a warm-up artefact. The cost is precisely the per-frame
re-rasterisation of a blurred, colour-matrixed region — **a static filter is
rasterised once and is free; an animated one is not.** Every single frame of the
transition missed 33ms, on the most frequent interaction in the app.

The general rule to take from it: in `react-native-svg`, animating a *filtered*
region is a different order of cost from animating an unfiltered one, and the
frequency gate should be applied to the filter, not just to the motion. The
two-spring version is free by comparison — pure `translateX`/`scaleX`/`scaleY`,
never touching layout — and it holds 60.

The tab icons read a **fractional position**, not a boolean. A boolean is fine
while tabs only ever cut from one to the next, but the moment the indicator can
be dragged it leaves the icons dead until the finger lifts, and the gesture feels
like it is moving a decoration rather than a selection. Each tab renders its
active and inactive treatment as two complete copies and cross-fades them by how
near the blob is — two copies rather than an animated colour because both the SF
Symbol's `tintColor` and the label's colour are native props, where an opacity
cross-fade of identical geometry is one compositor op.

## Launch

A custom launch animation in React Native is really **two screens pretending to
be one**: the OS draws the first from `app.json` before any JavaScript exists,
and `LaunchScreen` draws the second. The only thing that makes the seam
invisible is that frame one of the JS overlay is pixel-identical to the native
splash — the same artwork (`assets/splash-pupu.png` is a render of the same
`pupu-sit` file the component loads), at the same **140pt** that `imageWidth: 140`
gives it, dead centre, on the same `canvas`.

Get any of those three wrong and the launch has a visible cut in it, which costs
more than the animation buys. That constraint is also why **Pupu starts at rest
and wakes up** rather than flying in: there is nowhere to fly in from when your
first frame is already on screen.

The beats:

| Beat | What happens |
|---|---|
| **Handoff** (140ms) | Nothing moves. The native splash fades off the top of an identical JS frame. `motion.launch.handoff` is read by both sides — if they ever disagree you get a static Pupu and a moving Pupu cross-fading through each other. 140ms is the floor: below about 120 the cross-fade stops reading as a dissolve and starts reading as a cut. |
| **Wake** (520ms) | Pupu settles on a loose spring: squash at the feet, rise, overshoot. The wordmark rises beneath him. Eight tinted discs bloom outward from behind him, each on its own angle, painted from `TINTS`. |
| **Hold** (220ms) | One still frame. A launch with no still frame reads as a stutter, because the eye never gets to land on the brand. |
| **Reveal** (460ms) | An **iris opens from Pupu's own centre**, wiping the launch ground away to the app underneath, while Pupu scales *up* and fades and the discs are flung further out. |

### The budget, and the two things that made it feel slow

Those four numbers sum to the delay between tapping the icon and being able to
use the app. It was **2020ms** and is now **1340ms**. Every beat is shorter and
none is gone: drop the hold and the launch reads as a stutter, drop the handoff
and you get a double exposure. The sequence is not compressible past the point
where the eye can land on the brand at all.

Two separate defects sat underneath the complaint that Pupu "takes too long to
appear", and neither was a slow beat.

**1. The font load was in front of the whole launch.** `RootLayout` returned
`null` until `useFonts` resolved. That reads as correct and it means the root
never lays out, `onLayout` never fires, `hideAsync()` is never called, and the
*native* splash stays up — so the time to Pupu's first movement was the font load
*plus* the handoff, spent waiting on fonts that the mascot does not use. The
overlay now paints immediately and the fonts are awaited underneath it, in
parallel with dead time that was already being spent. The only two things gated
on fonts are the two that need them: the router, and the wordmark inside the
overlay (which is not on the native splash, so it is already allowed to arrive
from nowhere). The overlay comes down when **both** its animation has finished
and there is something behind it to reveal — without that second condition a
cold start on a slow device opens the iris onto an empty canvas.

**2. Pupu was being scaled UP, which is the one direction a rasterised layer must
never go.** He was laid out at `PIP_REST` (140) and scaled to 1.26x awake and on
to ~1.53x on the way out. A transform on a view is a *compositor* operation: the
layer is rendered once at its layout size and the GPU stretches that finished
bitmap. Scaling down discards pixels and stays sharp; scaling up has none to
invent. The 768px source makes no difference — by the time the transform runs,
all that remains is the 140pt render of it, so the launch was stretching a 420px
bitmap across 643 device pixels. That is exactly the slight blur that was
reported. He is now laid out at `PIP_MAX` — the largest size the sequence ever
reaches — and **every state is a scale *down* from it**, with `REST_SCALE`
putting frame one back at exactly the native splash's 140pt.

Two decisions inside the reveal:

- **It is an expanding hole, not a fade.** A fade puts the app and the splash on
  screen at once at 50% each, which is the one frame where both look broken. A
  hole means the app is only ever shown at full strength — just in more and more
  of the screen — so there is no in-between state to get wrong.
- **The hole is a ring with an enormous stroke, not a mask.** `borderRadius`
  gives you a disc and never its inverse, and an SVG `Mask` does give you the
  inverse — at the price of re-rasterising a full-screen mask bitmap on every
  frame of the reveal, which on a 3x phone is a 1320x2868 buffer sixty times a
  second. A circle with `fill="none"` and a stroke wider than the screen is the
  same shape for the cost of one stroked path: the stroke straddles the path, so
  placing the path at `r + W/2` makes the painted band run from exactly `r`
  outward, and the untouched middle *is* the hole. The ring is stroked with the
  launch ground's own radial gradient, whose outer stop is `canvas` — so the
  tint simply stops existing as the hole grows past it, with no second fade to
  keep in step.
- **The launch ground rushes past the camera** (`scale` to 1.14) as the hole
  opens, rather than sitting still while a hole is cut in it. It is the cheapest
  possible depth cue and it is why the reveal reads as moving *into* the app.
  Pupu scales up too, so he reads as passing the viewer — shrinking would say
  "going away", and the app is what is arriving.

The native splash is hidden from **`onLayout`, not from an effect**. An effect
fires after React commits but does not guarantee the commit has been drawn, so
hiding there can uncover the app for one frame before `LaunchScreen` has painted
— a flash of Today between two splash screens, rare enough to survive testing
and obvious enough to be the first thing anyone notices.

Under **Reduce Motion** the iris never opens; the overlay holds the identical
frame just long enough not to flash and then cross-fades, because an iris is a
shape travelling across the screen and that is exactly what the setting exists to
remove.

## Chrome that reacts to scrolling

Two pieces of floating chrome react to the same scroll: the **scroll edge** at
the top and the **tab bar** at the bottom. They are rendered in completely
different places — the edge inside whichever screen is showing, the bar by the
`Tabs` navigator above all of them — so the signal is hoisted into `ChromeProvider`
and both read it. A screen attaches **one** handler (`useChromeScroll()`) and
gets both behaviours.

It is a pair of **shared values**, not state: this updates at 60Hz and drives
animation, so React state here would re-render every tab screen on every scroll
frame.

### Why a plain JS scroll handler

`useAnimatedScrollHandler` cannot be used, because **FlashList cannot take one**.
Its `RecyclerView` owns the ScrollView's `onScroll` for its own windowing maths
and forwards the event to the caller as an ordinary function call. A Reanimated
handler is not an ordinary function — it is an object carrying a worklet that
only becomes a UI-thread handler when attached directly to an
`Animated.ScrollView`. So the offset crosses by hand, once per event. That is
the only JS-thread work in the whole effect: everything that *reads* these values
is a worklet, so both behaviours still animate on the UI thread.

### The scroll edge

Apple's own name for it, and their own description of the job: *"Scroll edge
effects further enhance legibility by blurring and reducing the opacity of
background content."*

**It is blur, not `GlassPanel`, and that is Apple's distinction rather than a
compromise.** The HIG puts Liquid Glass in a *functional layer for controls and
navigation that floats above the content layer*; the scroll edge is a legibility
treatment applied to the content passing underneath. This band contains no
controls. Giving it the material would put a second floating glass object on
screen competing with the tab bar — the "use Liquid Glass sparingly" failure —
and it would read as a bar that is always there rather than an effect that
builds.

The ramp is built by **stacking four bands that all start at the top and end at
different heights**, each at a fraction of the usual intensity. Content at the
very top passes under all four; content at the bottom passes under one. The
accumulation *is* the gradient — a single `BlurView` has a hard bottom edge, and
a hard edge is the tell.

**Only opacity animates.** Animating `intensity` re-renders the blur every frame,
which is the same per-frame re-rasterisation the metaball investigation measured
at 15fps. A fixed-intensity blur cross-faded by opacity is one composite of an
already-rendered layer and looks identical, because a blur at 40% opacity *is* a
40%-strength blur.

The compact title is **position-driven, not direction-driven** — iOS's own
large-title collapse works this way, and it is what makes "scroll back up to
reveal the header" true with no extra mechanism: the big title returning *is* the
compact one leaving, because they are two readings of one offset.

### The tab bar contracts

Apple's own bars shrink out of the way as you scroll into content and return the
moment you scroll towards the top. It **contracts rather than sliding away**: a
bar that leaves entirely has to be hunted for, and Apple's guidance is against
hiding navigation outright. Shrinking keeps it continuously present and tappable;
it simply stops claiming to be the thing you are looking at.

**Transform only, never opacity.** `expo-glass-effect` documents that opacity 0
on a `GlassView` *or any parent* stops the material rendering at all — so fading
toward zero would work perfectly until the final frame and then drop the glass.

### Two things the hysteresis has to survive

A bar that reacts to any movement flickers constantly, so travel is accumulated
in one direction and reset when the direction changes; the bar only moves once
that accumulation passes `scrollEdge.hysteresis`, and never within
`scrollEdge.hideAfter` of the top.

**Overscroll is not a direction, and missing that broke the feature outright.**
Measured on a day that fits in a little over one screen: a single flick produced
28 events wanting the bar contracted, immediately followed by 7 wanting it
expanded — so it contracted and sprang straight back, every time. The 7 were the
**rubber band**. iOS lets a list travel past its own end and settles it back, and
that settle is genuine upward movement of tens of points — far more than any
threshold is meant to absorb, and read as intent it means "scrolling up" when the
finger has already left the screen. The distinction is not speed or distance, so
no threshold could have caught it; it is *where* it happens, beyond the content's
own bounds, which the scroll event reports outright.

## Appearance

Light / Dark / System, stored on the profile.

React Native ships exactly the API this wants — `Appearance.setColorScheme()`
overrides the window's interface style and `useColorScheme()` reads it back — and
driving the whole feature from that alone is the obvious implementation and is
subtly wrong. `setColorScheme` mutates the cached value and **never emits the
`change` event**; `useColorScheme()` is a `useSyncExternalStore` over that
emitter, so a programmatic override notifies no subscriber. What actually
re-renders is the *native* trait change echoing back — a frame late at best, and
on a platform that does not re-emit for an override it was itself asked to apply,
never.

So the palette is resolved from the **store**, which is synchronous and
re-renders on write, and `setColorScheme` is called alongside it for the things
the store cannot reach: `ActionSheetIOS`, the system `Switch`, `Alert`, the
keyboard, the scroll indicators and the status bar. `'unspecified'` is the value
that *clears* an override — RN re-reads the real system scheme when it sees it,
which is what lets "System" follow the device again.

The picker shows **three previews drawn from the real palette**, not screenshots:
a screenshot goes stale the first time a token changes, and it goes stale
silently. The System card is **one full-width preview with the dark one clipped
over its right half**, never two half-width previews side by side — two halves
each lay out to their own width, so rows and titles land differently on the two
sides and the split reads as two different screens rather than one screen lit two
ways. The same three choices appear again as a plain list, because the cards
carry the information in colour and layout, which is exactly the encoding that
does not survive VoiceOver, a colour-vision difference, or 300% Dynamic Type.

## Persisted defaults

Zustand's persist `merge` is **shallow**, so a persisted `profile` replaces the
default profile wholesale and every key added since it was written arrives as
`undefined`.

Patching that key by key inside a version-gated `migrate` block is the obvious
fix and it failed in exactly the way version gates do: the appearance picker
shipped with nothing selected, because the store on the device already reported
version 4 from an earlier build whose schema was different, so `migrate` was
never called at all and the version number confidently said the migration had
happened. Any install that has been on a beta, a TestFlight build, or a release
that was later rolled back can present a version ahead of its own shape.

The rule the store now follows: **transformations are versioned, defaults are
not.** `migrate` keeps the one-way rewrites (the retired-tint remap, which must
run exactly once), and `merge` spreads the current profile underneath the
persisted one on *every* rehydration — a key the user has saved wins, a key they
have never had falls back to the default.

## Reminders

A reminder fires **`profile.reminderLead` minutes before** an activity, not at
it. Firing at the start time was the only option this shipped with and it is the
one moment a nudge cannot help: a notification arriving when you should already
have begun is a notification about being late. The default is 10 minutes, and
that moves existing users too — preserving the old behaviour would be preserving
the defect.

The lead is folded into the notification identifier, so **changing it
reschedules**: the reconcile can only compare identifiers against the OS's
pending list, so anything that changes what a reminder is or when it lands has to
change its id.

Three things were invisible and are now stated on the screen, because each of
them made a working feature look broken:

- **The OS's own permission**, separately from the app's switch. The two can
  disagree at any moment — permission is revocable from iOS Settings while the
  app is not running — and without this row the only symptom is a switch that
  will not move.
- **How many reminders the setting actually produces.** A reminder can only
  attach to an activity that sits at a time on a day, and most activities here do
  not, so switching the feature on could schedule nothing at all with no way to
  tell that apart from "working". The screen now distinguishes *nothing has a
  start time* from *everything today has already begun*.
- **Why the switch turned itself off.** The app disables reminders when it finds
  permission revoked, which is right, and it used to do so silently — which from
  the user's side is indistinguishable from a setting that will not stick.

`requestPermissionsAsync` is also wrapped: an exception there rejects the async
handler and React Native reports it as an unhandled rejection, which the user
sees as a switch that will not move — no prompt, no alert, nothing. Reporting
`false` turns it into the one case the UI already handles properly.

The onboarding preview is built from `reminderBody`, the same function that
writes the real notification. It used to be hand-typed literals and they had
already drifted.

## Routines, after onboarding

Onboarding asks its three questions once and then never again, which is the wrong
shape for the thing it asks about: a routine is the part of a day that changes
most often. Until now the only way to change one was to run the whole five-step
flow again.

**The order is the product.** The routines flow promises "we will keep them in
this order so you do not have to", and the order was the *catalogue's* — the
picks were applied by `ROUTINES[slot].filter(...)`, so a user who chose
shower-then-coffee got coffee-then-shower, silently, because that is how the
array happened to be written. The sequence is now stored as an ordered id list
and built by walking it, never by filtering.

**All three slots on one screen, collapsed.** Onboarding asks one at a time
because a page of thirty-six chips is the wall of choice this audience bounces
off — right for a first run, wrong here, where someone arrives with a specific
edit in mind and paging through the other two is what stops them bothering.

**Every edit writes straight through to today; there is no Save.** A routine is
not a document, it is a description of what you do, and the only way to know
whether a change is right is to look at the day it produces. `syncRoutines`
carries today's completed steps across by id, so editing at eleven in the morning
does not hand back the three things you have already done as undone.

It rebuilds **one slot**, and that is a data-loss fix rather than tidiness. It
rebuilt all three, and `buildRoutine` returns null for a slot with no steps — so
any slot the user had not configured had its activity *deleted*. Editing only the
morning silently removed the seeded "Evening routine": the day went from eight
tasks to seven and nothing said why. A routine activity is an ordinary task once
it exists, and a slot nobody has opened is not an empty routine to clean up.

### A routine has to happen more than once

The word "routine" promises repetition and the app delivered it exactly once. A
routine was written onto the plan by `applyRoutines` at the end of onboarding
and by `syncRoutines` when this screen was edited, and by nothing else — so the
morning someone described on Monday was on Monday's plan, and Tuesday opened to
an empty grid and a dozing dog. The feature's whole promise lasted a day, and it
failed in the most demoralising way available to a planner: blank, every
morning, for a user who had already done the work of telling it what their
mornings look like.

**The id is dated.** `seed-morning` became `seed-morning:2026-09-17`, and that
is what made repetition possible at all rather than merely convenient. A routine
activity is an ordinary task once it exists — editable, tickable, deletable — so
a second day's copy needs a second identity. With one id per slot for all time,
building today's morning necessarily destroyed yesterday's, ticks and all. The
app had been avoiding that data loss by never building a second day.

**`ensureToday` builds, and `syncRoutines` deletes.** The two callers want
opposite things from an empty slot. On the routines screen, emptying a routine
is the user removing it and the activity should go. On the daily pass it would
be an unattended deletion of something nobody touched — the seeded "Evening
routine" vanishing from the starter day of anyone who configured a morning and
skipped the evening. Same helper, and the daily pass simply skips a slot with
nothing in it.

**Gated on a date, not on absence.** Rebuilding whenever today's activity is
missing would make a routine impossible to delete: remove it at nine because
today is not a normal day, and the next foreground puts it back.
`routinesBuiltFor` records that a slot has had its turn today, so a deliberate
deletion survives until tomorrow — which is when a daily routine is supposed to
return anyway.

### A step of a routine can be changed

The screen shipped with three controls per step — up, down, and take it out —
and none for what the step actually *says*. "Shower" could be reordered and
re-added endlessly but never become "Shower and shave", and "Read" was stuck at
the catalogue's twenty minutes however long anyone actually read for. The only
escape was to delete the catalogue step and retype it as a custom one, which
loses its place in the order and its tick for the day.

**The edit is an overlay, not a rewrite.** Copying the catalogue step into
`routineCustom` and dropping the original needs no new state at all, and it was
rejected because it changes the step's ID — and the id is what carries a tick
across a rebuild, so renaming something you had already done this morning would
hand it back undone. `routineEdits` is keyed by step id, applied in
`routineCatalogue`, and leaves identity alone.

Applying it in the catalogue rather than in the screen is what makes one edit
show up in the three places it has to: the row, the collapsed slot summary
(whose duration is the sum of its steps), and the activity on today. Applied in
the screen, the first would update and the routine on the day would quietly keep
the old wording.

**Fields are optional and absent means unchanged**, so editing only the length
leaves the title following the app's language instead of freezing it at whatever
it read when the duration was changed. Reset drops the whole overlay, and its
label says so.

**The editor opens inline, under its own row, and does not take the keyboard.**
A sheet would cover the four steps around it at exactly the moment the user is
deciding whether "Shower and shave" still belongs before "Get dressed" — the
order is the product, and the order is only legible in place. Autofocusing was
worse than it sounds: it made the first tap on the duration chips a keyboard
dismissal rather than a press, so the more common of the two edits appeared to
ignore you.

## Work that did not happen

An activity is filed under one date and Today renders exactly that date, so
anything left unticked at midnight fell out of the app: still stored, still
counted in "Activities", and reachable only by someone who thought to page
backwards through the week looking for it. For an app aimed at people who lose
track of things, quietly losing track of things is the worst available failure.

Today now carries a collapsed group above the plan — the count, and one button
that moves the lot forward. The register is Tiimo's end-of-day review ("These
are the remaining tasks. Anything you want to move to another day?") rather than
a score: it says what is outstanding and offers the obvious action, and it never
says how many days you have missed. The shape is Todoist's Overdue group — a
header with a reschedule action, not a modal between someone and their day.

Routines are excluded, because today already has its own copy: yesterday's
half-finished morning is yesterday's record, not outstanding work.

## An activity can be changed

Title, duration, time of day, start time, tag and day were chosen once, in the
add sheet, in the first ten seconds of an activity's life, and were plain text
forever after. A fifteen-minute guess stayed fifteen minutes; something filed
under Morning could not move to Evening; an activity put on the wrong day was
stuck there. The only edits on offer were ticking it, adding steps, and deleting
it to start again.

No app in the reference class works that way. Tiimo's "Edit task" opens on
exactly these fields; Structured, Todoist, Evernote and ClickUp all put them on
tappable rows in the detail view. So the meta pills became controls: same pill
shape, because the information is still the point, plus a chevron and an
accessibility label that names the field as well as its value. Each opens an
action sheet, which is what those detail screens do — the value stays visible
behind the sheet and there is no save step to forget. The title edits in place,
because `Alert.prompt` is iOS-only.

**A routine's fields are read-only here, and say where they live.** Every one of
them is regenerated each morning from `profile`, so an editor for them would be
a control that works, persists, and silently forgets overnight. The steps stay
tappable — ticking them is the point, and today's ticks are carried across a
rebuild — and a link points at the screen that does own the rest.

## Completion

The most-repeated satisfying moment in the app, built from five beats that each
do one job:

| Beat | What it does | Why |
|---|---|---|
| **Contact** | The box compresses under the finger the moment it is touched and rebounds when released, on the app's press asymmetry — 120ms timing down, spring back up | This beat was **missing**, and its absence was the real defect. Everything else in the app reports contact instantly (`PressScale`, `PressHighlight`); the checkbox alone sat inert until the store came back, which reads as the tap not having landed. |
| **Bloom** | A soft disc of the accent swells behind the box while it is held | Apple's guidance is that a control in the content layer may take on a glass appearance *"to emphasize its interactivity when a person activates it"*. This is that beat — **painted rather than materialised**: a real `GlassView` is a native view, and this control appears once per task row and once per step of every expanded routine. At 26pt under a fingertip, behind an opaque disc that is about to cover it, the two are indistinguishable. |
| **Fill** | The disc springs up from the centre while the outline fades *into* it | The colour arrives with weight instead of switching on, and the ring is **absorbed** rather than left drawn around a filled circle. Two cross-faded views rather than an animated `borderWidth`, which is a layout property and cannot be driven from the UI thread at all. |
| **Draw** | The tick **strokes itself** along its own path via an animated `strokeDashoffset`, rotating the last few degrees upright as it goes | A mark that appears has been asserted; a mark that is drawn has been *made*. This is most of why it feels satisfying rather than merely responsive. |
| **Burst** | Eight short marks fly outward and fade | Replaced a single expanding ring. A ring has to be *watched* to be read — its whole signal is one edge moving slowly outward — while spokes are read instantly from the corner of the eye, which is the only thing this beat is for. The spokes are **mounted only while they are flying**, so the steady-state cost on a list is zero views. |

Then the title is **struck through by a rule that is drawn from the left**.
`textDecorationLine` cannot be used for this: it is a native text attribute, not
a numeric style, so it is either there or it is not. `Strike` listens to
`onTextLayout` and draws **one rule per laid-out line** — a single rule across the
middle of a block is the obvious implementation and it is wrong here, because
task titles wrap to two lines and one rule across a two-line block strikes the
gap between them and nothing else. The rules are staggered, so a wrapped title is
struck the way it is read.

**Unchecking gets contact and nothing else.** It retracts the stroke, deflates
the fill, restores the ring, and fires no burst — the same rule the routine chips follow, that
undoing something is a correction and a correction is not celebrated. An app that
throws the same gesture for "done" and "not done" is telling you it was not
paying attention.

### A change of value is not always a completion

`Checkbox` and `Strike` both take an **`identity`**, and it is required inside a
virtualised list. `checked` flipping is not by itself a reason to celebrate,
because it flips for reasons that have nothing to do with the user: FlashList
**recycles** rows, so scrolling a done task off the top hands its views to an
undone task further down and flips the prop on the way. Animating on the prop
alone means a screen full of ticks drawing themselves and rings popping every
time the list is scrolled — the same trap this document already flags for
`entering` animations on recycled rows, arriving through a different door.

The distinction that matters is not "did the user press *this view*" — a step can
also be toggled by tapping its label — but **"is this still the same item"**.
Same item with a new value is a completion and gets the performance; a different
item is a recycle and snaps to the finished state with no animation at all, which
is what a checkbox you never touched should look like anyway.

### Finishing a whole time of day

Finishing one activity and finishing an entire morning were the same event as far
as the screen was concerned: the day's shape changed and nothing said so. A
time-of-day block now gets a **confetti burst and Pupu cheering**.

The frequency gate is the whole argument for letting it be big. A task is
completed tens of times a day and gets a 500ms flourish on a 26pt control; a
block completes **at most three times a day**, is genuinely the thing the user
came here to do, and is rare enough to afford the mascot — the same tier as the
focus-session finish. It is also what makes the mascot worth having: Pupu is
absent from every screen you look at repeatedly precisely so the few places he
does appear still mean something.

**It never blocks.** `pointerEvents="none"` throughout, and it dismisses itself
off the confetti's own completion rather than a second timer. A celebration that
has to be acknowledged is a modal, and a modal between someone and the next thing
on their list is a punishment for finishing.

Three things make a slot look newly-complete when it is not, and each would put
confetti on screen for something the user did not just do: **arriving** at a day
that is already finished (the first observation is a baseline, never an event),
**changing date** (yesterday's finished morning is not a completion), and an
**empty slot** (`every()` is vacuously true on an empty array, so a slot with
nothing in it reports itself complete forever).

The copy does not congratulate anyone on being good. The audience is people who
struggle to start, so the failure mode of celebration copy is making the *next*
block feel like a standard to live up to. Each line says the block is finished
and stops.

## Arrival

A pushed screen slides in **fully composed, as one flat slab**. That is the one
thing the platform transition cannot help with, so `Rise` staggers the arriving
screen's own content behind the slide — which is what iOS does with a navigation
bar's title, and the difference between a screen *appearing* and a screen
*assembling*.

Its `fromScale` is the shared-element part: give it the ratio between an
element's size in the list you came from and its size here, and it grows through
exactly that range as it settles. The task's emoji disc is **40pt in a row and
84pt in the detail hero**, so `40 / 84` means it enters at the size the thing you
tapped actually was. It is not a true shared-element transition — the real disc
never leaves the list — but the size continuity is the part the eye reads, and it
costs one number instead of a second navigator.

The default 80ms delay **overlaps the tail of the push** rather than waiting for
it. Waiting reads as two animations played back to back; overlapping reads as
parallax, which is what it is.

## Navigation grammar

| Destination | Presentation | Back does |
|---|---|---|
| Onboarding | Its own stack | **One-way door.** `Stack.Protected` drops every entry when `onboarded` flips, so back cannot re-enter it. |
| Today / To-do / Focus / Me | Tabs (peers) | Each keeps its own stack; re-tapping the active tab pops to root. |
| Task detail | `push`, with `fullScreenGestureEnabled` and `animationMatchesGesture` | Returns to the list it came from. Swipe from **anywhere**, and the dismissal tracks the finger. |
| Add activity | `formSheet`, detents `[0.58, 0.96]` | Drag-dismiss; **asks first** if there is unsaved work. |
| Destructive confirms, layout options | Native action sheet | — |

## Icons

SF Symbols for **all** chrome, via a wrapper that renders a sized spacer as a
fallback so layout never shifts. The single bespoke glyph is the Today tab's
calendar, because it is data-bearing: it shows the current date.

## Pupu

The mascot. Three supplied illustrations in `assets/mascot/`, rendered by
`src/components/mascot/`.

**The artwork is shipped as-is, not redrawn.** An earlier version reconstructed
the character as `react-native-svg` paths to gain arbitrary poses and
token-driven recolouring. It was a faithful interpretation and it was still not
the character. Supplied art is a specification, not a reference for a copy — so
a redraw is a fallback for when no usable asset exists, and nothing else.

Keeping the real files also deleted a whole mechanism. The illustrations already
carry a pale die-cut sticker border, which is exactly what a dark canvas needs to
stop a dark-outlined character dissolving into it; the vector version had to
rebuild that border from an extra pass over every silhouette shape, in dark mode
only. It is now simply part of the picture, and the mascot needs **no colour
tokens at all**.

Shipped as WebP — ~75KB each against ~500KB for the same PNG, alpha intact.

**There are three pictures and four poses.** `cheer` has its own drawing —
paws up, eyes shut, excitement marks — because a celebration is carried by the
character's face and paws, and no amount of squash-and-stretch on a calm sitting
dog supplies either. It used to be the sitting artwork moved differently, which
was an honest workaround for not having the picture and is strictly worse than
having it.

`rest` genuinely *is* a behaviour rather than a drawing: a sleeping dog and a
sitting dog differ by how much they move, which is exactly what `idle` controls.
Faking a pose by flipping or skewing the artwork would read as a bug, not a
performance — that constraint still stands for everything not drawn.

Where Pupu may appear is decided by the same frequency gate as the motion
vocabulary, not by where he would be cute:

| Tier | Screens | Pupu |
|---|---|---|
| Rare / first-run | **launch**, welcome, reminders, ready, focus-complete, **a finished time of day** | Full delight budget — entrance spring, celebration, confetti |
| Occasional | an empty day, Me, an empty Routines screen | Present, breathing slowly. Nothing else |
| Tens of times a day | task rows, tab bar, headers, a running timer | **Absent** |

The bottom row is load-bearing. A mascot on a FlashList row would replay its
entrance on every recycle, and a mascot in chrome is a thing you are made to look
at dozens of times a day until you resent it.

He is also absent from Focus *while the timer runs*. That screen's only ambient
motion is the halo and it is the one screen you are meant to stop looking at. He
arrives when the session ends.

**Confetti fires on two moments, both earned**: finishing a focus session, and
finishing a whole time-of-day block. Not on the onboarding `ready` screen —
answering five setup questions is not an achievement, and spending the gesture
there means it means nothing the first time it is actually earned. Both moments
clear the frequency gate: a block completes at most three times a day. The pieces
are painted from `TINTS`, so the celebration is visibly made of the user's own
day.

Two implementation notes:

1. **Nothing in `Pupu.tsx` animates.** All motion is `transform`/`opacity` on
   wrapping views in `PupuScene`, so every moving part stays on the UI thread.
2. **The idle loop pauses on navigation blur.** Expo Router keeps tab screens
   mounted, so a `withRepeat(-1)` started on Today would otherwise run forever
   while you are on another tab — the same trap `Halo` avoids with `active`.

## State

- Zustand + **MMKV**. MMKV is synchronous, so the store rehydrates before the
  first paint — which is what makes the root redirect resolve on frame one
  instead of flashing onboarding at a returning user.
- Ephemeral UI state (collapsed sections, expanded steps, drafts) stays local.
- High-frequency typing surfaces use uncontrolled `TextInput`s.
- Lists are virtualised with FlashList; no row carries an `entering` animation,
  because recycled rows would replay it.

## Focus: the stage and the tray

Focus used to be a single centred column floating on the canvas — dial, preset
chips, "ends at" caption, activity pill, Start — and, once a session was
running, three loose buttons in a row. Every piece was correct on its own and
the screen still read as a pile: nothing was anchored to anything, so the eye
had no order to take them in, the controls shifted vertically whenever the
content above them changed height, and the primary action sat in the middle of
the screen, which on a phone is the one place a thumb does not rest.

Life Reset's pomodoro screen answers this by cutting the screen in two, and
every timer in the benchmark set does some version of the same thing. The
split is now the structure of `app/(tabs)/focus.tsx`:

```
┌──────────────────────────┐
│  STAGE                   │   the aura, the ring, the number.
│       ( the time )       │   Ambient, and the only thing to look at.
│                          │
├──────────────────────────┤ ← the tray's top edge is the screen's
│  TRAY                    │   only hard line
│  ─────── rail ───────    │
│  [+1 min]  (▮▮)  [end]   │   every control, at thumb height
└──────────────────────────┘
```

- **The screen title sits above both**, outside the state branch. It is the one
  thing true in every state, and a title inside the scrolling stage would take
  the app's only "where am I" cue with it.
- **The stage does not scroll in the picker**, because the dial is a circular
  drag: every stroke has a vertical component, and inside a `ScrollView` the
  scroll gesture wins and the dial stops responding. It *does* scroll during a
  session, where a routine's step list has to fit.
- **The tray's surface runs to the bottom edge** and the floating gel tab bar
  sits on it, so its bottom padding is that bar's height plus the home
  indicator. Its shadow is written out rather than taken from an `elevation`
  token: every token offsets downward, and on a panel welded to the bottom of
  the screen all of that falls off it. The only edge a bottom tray has is its
  top one.
- **One primary action, full width.** Start, and later "Mark it done", are the
  only filled pills in the tray. "Not yet" is text. The four presets share one
  row on `flex: 1`, which turns four pills into a segmented control and stops
  them reading as four more decisions.

### The rail

The running tray leads with a 4pt track whose ends are **wall-clock times** —
when the session began, when you are free. It is deliberately thin and
unlabelled, because the ring above it is already the progress indicator and two
heroes for one number is one too many.

It also runs the *other way*: the rail **fills** as time is spent while the ring
**empties**. That is not the same statement drawn twice. The ring is a
countdown; the rail is a position on a timeline, and a timeline that ran
backwards underneath labels reading left to right would be the confusing half of
both.

A **paused** session gets neither end. Pausing clears `startedAt` — which is
what stops the remaining time decaying — so there is no start to report, and the
end time is worse than absent: it is computed at the moment the pause begins and
nothing recomputes it while nothing runs, so a session paused for ten minutes
would sit there promising a finish it can no longer make. The rail drops both
and says `PAUSED`, which is the one thing still true.

### At zero, the ring is replaced

A ring exists to show how much is left. At zero it shows nothing and still
occupies the best part of the screen, so the completed state hands the whole
stage to the celebration: confetti, Pupu cheering, the message, the activity's
name. It is also what keeps that state off the scrollbar on a small phone —
ring, confetti, mascot and message together did not fit above the tray.

## The focus ground

Focus is the app's one full-screen moment — the only screen with nothing else
competing for the ground — and it was a flat wash of `canvasTinted`. Flat is the
right instinct for a screen you are meant to stop looking at, but a flat *fill*
reads as an unset screen rather than a calm one.

The reference class is unanimous that this screen carries atmosphere rather than
chrome: Tiimo's soft tinted field with drifting specks, Waking Up's slow mesh
gradient with nothing on it at all, Oura's full-bleed ground. What was taken is
the idea — a field of light with no edges — not anyone's palette.

**The field is made of the activity's own colour.** The colour contract reserves
`TINTS` for data, so a decorative gradient here would break it for nothing.
`FocusAura` is therefore built from exactly two hues that already mean
something: the tint of the activity being focused on, and the single accent.
Starting a session on "Lunch" turns the room the colour of Lunch. With no
activity attached there is no identity to show, so all three blooms fall back to
the accent and the screen goes quietly monochrome — the honest rendering of "this
session is not about anything in particular".

Two details carry it:

- **Radial gradients, never discs.** Same rule as `Halo`: a flat circle at any
  opacity you can notice has an edge, and an edge is an object. Only a gradient
  with no edge reads as light. The gradient's midpoint is pulled in to 0.45
  rather than left at a linear 0.5, because a straight ramp puts most of the
  colour in the outer ring where the three blooms overlap, and that stacks into
  a visible grey halo.
- **Periods of 17s, 21s and 26s.** Mutually prime-ish, so the composition never
  visibly loops, and far slower than anything else in the app. At this speed it
  is not an animation you watch; it is a room that is not quite still. Under
  Reduce Motion the blooms are painted once and never move.

## Language

The app ships English and Vietnamese, and **opens in the phone's language**
without being asked.

- **Detection walks the whole preference list.** `getLocales()` is ordered by
  the user's own ranking, so a phone set to [Khmer, Vietnamese, English] opens
  in Vietnamese. Matching only the top entry would throw that second choice
  away. Matching is on `languageCode`, never `languageTag` — "vi-VN" and
  "vi-US" are both Vietnamese.
- **`system` is a real state, not a shortcut for today's answer.** Following the
  phone is not the same as having picked the language the phone currently
  happens to be set to, so the picker's first row is `System` and it carries the
  language it resolves to on its right.
- **Every language is named in itself.** "Tiếng Việt", never "Vietnamese". The
  person most likely to open that screen has landed in a language they cannot
  read and is looking for the shape of their own word.
- **Keys are stored; words are not.** An onboarding answer, a tag and a routine
  pick are all persisted as stable identifiers and turned into words at render,
  so they follow a later language change. Task titles are the deliberate
  exception: the seeded starter day is written in whatever language is in effect
  at first launch and then left alone, because those rows become editable user
  content the moment they are stored and re-translating them would overwrite
  someone's own words.
- **Translations are checked by the compiler.** `en.ts` is the schema, every
  other catalogue is typed as `Dict`, and a missing key fails the build rather
  than falling back at runtime. This is why the app does not use a string-keyed
  i18n library.
