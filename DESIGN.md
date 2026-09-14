# Oneplan — design system

Oneplan is a visual day planner. The reference class studied before any code was
written was **Tiimo** (ADHD task & planning assistant, Apple Design Award
finalist 2024) — roughly 30 real shipping screens across its onboarding, Today,
To-do, add-activity and Focus flows, pulled from Mobbin.

A second pass, again on Mobbin, benchmarked the three moments this document
now calls out separately — the **launch screen** (Duolingo, Yazio, Pinterest,
Me+), the **floating gel tab bar** (Apple Photos and Apple News under iOS 26's
Liquid Glass, plus Calm, Quizlet and CLEAR), and **task completion** (Finch,
Numo, and Tiimo itself).

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
| **Mascot dead centre on the launch screen**, wordmark directly beneath | Duolingo, Yazio, Me+ | The whole class converges on this: one character, centred, name under it, on a single flat or barely-graded ground. Anything busier competes with the app it is about to hand over to. |
| **Brand shapes flung outward as the splash leaves** | Pinterest's splash | The exit is where a launch screen earns its keep; Pinterest scatters its confetti shapes rather than dissolving. Ours are painted from `TINTS`, so the launch is made of the user's own day. |
| **A filled capsule chip behind the active tab**, glyph tinted, bar translucent | Apple Photos, Apple News, Calm, Quizlet | Unanimous across the benchmark set, including Apple's own iOS 26 bars. It is what Oneplan already had — the second pass confirmed the shape and changed only the *material*. |
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

## Gel

`GlassPanel` is the one glass primitive, and it renders **gel** rather than
plain frosted glass.

Flat glassmorphism is a blur, a scrim, and a hairline — and every one of those
is a property of a **flat pane**, which is why it always reads as a sheet of
frosted acrylic laid on the screen. Gel reads as a droplet of material *resting*
on the screen. The whole difference is in how it handles light, and it is
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
splash — the same artwork (`assets/splash-pip.png` is a render of the same
`pip-sit` file the component loads), at the same **140pt** that `imageWidth: 140`
gives it, dead centre, on the same `canvas`.

Get any of those three wrong and the launch has a visible cut in it, which costs
more than the animation buys. That constraint is also why **Pip starts at rest
and wakes up** rather than flying in: there is nowhere to fly in from when your
first frame is already on screen.

The beats:

| Beat | What happens |
|---|---|
| **Handoff** (260ms) | Nothing moves. The native splash fades off the top of an identical JS frame. `motion.launch.handoff` is read by both sides — if they ever disagree you get a static Pip and a moving Pip cross-fading through each other. |
| **Wake** (720ms) | Pip settles on a loose spring: squash at the feet, rise, overshoot. The wordmark rises beneath him. Eight tinted discs bloom outward from behind him, each on its own angle, painted from `TINTS`. |
| **Hold** (420ms) | One still frame. A launch with no still frame reads as a stutter, because the eye never gets to land on the brand. |
| **Reveal** (620ms) | An **iris opens from Pip's own centre**, wiping the launch ground away to the app underneath, while Pip scales *up* and fades and the discs are flung further out. |

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
  Pip scales up too, so he reads as passing the viewer — shrinking would say
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

## Completion

The most-repeated satisfying moment in the app, built from four beats that each
do one job:

| Beat | What it does | Why |
|---|---|---|
| **Squish** | The box compresses and rebounds on a loose spring, anti-phase in X and Y | Contact feedback, so it is the only beat that fires on the way *out* as well as in. |
| **Fill** | The disc springs up from the centre | The colour arrives with weight instead of switching on. |
| **Draw** | The tick **strokes itself** along its own path, via an animated `strokeDashoffset` | A mark that appears has been asserted; a mark that is drawn has been *made*. This is most of why it feels satisfying rather than merely responsive. |
| **Pop** | One ring expands past the box and fades | The only beat that costs nothing to ignore, and what carries at a glance when the tap happens off to the side of where you are reading. |

Then the title is **struck through by a rule that is drawn from the left**.
`textDecorationLine` cannot be used for this: it is a native text attribute, not
a numeric style, so it is either there or it is not. `Strike` listens to
`onTextLayout` and draws **one rule per laid-out line** — a single rule across the
middle of a block is the obvious implementation and it is wrong here, because
task titles wrap to two lines and one rule across a two-line block strikes the
gap between them and nothing else. The rules are staggered, so a wrapped title is
struck the way it is read.

**Unchecking gets the squish and nothing else.** It retracts the stroke, deflates
the fill, and fires no ring — the same rule the routine chips follow, that
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

## Pip

The mascot. Two supplied illustrations in `assets/mascot/`, rendered by
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

**There are two pictures, so a pose is a behaviour, not a file.** `cheer` and
`rest` both render the sitting illustration; what separates them is that one
lands with a squash-and-stretch and floats while the other only breathes. Faking
a third pose by flipping or skewing the artwork would read as a bug, not a
performance.

Where Pip may appear is decided by the same frequency gate as the motion
vocabulary, not by where he would be cute:

| Tier | Screens | Pip |
|---|---|---|
| Rare / first-run | **launch**, welcome, reminders, ready, focus-complete | Full delight budget — entrance spring, celebration, confetti |
| Occasional | an empty day, Me | Present, breathing slowly. Nothing else |
| Tens of times a day | task rows, tab bar, headers, a running timer | **Absent** |

The bottom row is load-bearing. A mascot on a FlashList row would replay its
entrance on every recycle, and a mascot in chrome is a thing you are made to look
at dozens of times a day until you resent it.

He is also absent from Focus *while the timer runs*. That screen's only ambient
motion is the halo and it is the one screen you are meant to stop looking at. He
arrives when the session ends.

**Confetti fires once in the whole app**, on finishing a focus session — not on
the onboarding `ready` screen, because answering five setup questions is not an
achievement and spending the gesture there means it means nothing the first time
it is earned. The pieces are painted from `TINTS`, so the celebration is visibly
made of the user's own day.

Two implementation notes:

1. **Nothing in `Pip.tsx` animates.** All motion is `transform`/`opacity` on
   wrapping views in `PipScene`, so every moving part stays on the UI thread.
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
