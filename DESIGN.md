# Oneplan — design system

Oneplan is a visual day planner. The reference class studied before any code was
written was **Tiimo** (ADHD task & planning assistant, Apple Design Award
finalist 2024) — roughly 30 real shipping screens across its onboarding, Today,
To-do, add-activity and Focus flows, pulled from Mobbin.

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

- **Tab switches and screen transitions**: the platform default, untouched.
  Tabs never slide.
- **Press feedback** (tens of times a day): 120ms, ease-out
  `bezier(0.23, 1, 0.32, 1)`, on press-*in*. Buttons and cards scale to 0.97;
  list rows take a background highlight and never scale.
- **Gestures**: the focus dial tracks the finger 1:1 on the UI thread, snaps to
  a whole minute on release with `{ duration: 400, dampingRatio: 1 }`, and has a
  haptic detent every five minutes.
- **The countdown ring** sweeps with a single long `withTiming` on the UI
  thread; only the numeric readout re-renders, once per second.
- **The tab selection chip** slides between tabs on a spring. This is the one
  place a tab change animates, and it is chrome moving *within* the bar — the
  scenes still cut instantly, so "tabs never slide" still holds. On a
  translucent bar the chip is the only thing that says which tab is live, so
  moving it continuously is what ties the tap to the result.
- **Routine chips** overshoot on the way *in* only. Deselecting is a correction
  and should not be celebrated.
- **The focus halo** is the app's only ambient animation, confined to the one
  screen you are meant to stop looking at. Its 4.4s period is deliberately far
  slower than a resting breath so it never becomes something to watch, and it
  does not render at all under Reduce Motion.
- **Reduce Motion** collapses spatial motion to cross-fades throughout.

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

`GlassPanel` is the one glass primitive. Three things decide whether it reads as
glass rather than as a grey box, and all three are easy to get wrong:

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

## Navigation grammar

| Destination | Presentation | Back does |
|---|---|---|
| Onboarding | Its own stack | **One-way door.** `Stack.Protected` drops every entry when `onboarded` flips, so back cannot re-enter it. |
| Today / To-do / Focus / Me | Tabs (peers) | Each keeps its own stack; re-tapping the active tab pops to root. |
| Task detail | `push` | Returns to the list it came from. |
| Add activity | `formSheet`, detents `[0.58, 0.96]` | Drag-dismiss; **asks first** if there is unsaved work. |
| Destructive confirms, layout options | Native action sheet | — |

## Icons

SF Symbols for **all** chrome, via a wrapper that renders a sized spacer as a
fallback so layout never shifts. The single bespoke glyph is the Today tab's
calendar, because it is data-bearing: it shows the current date.

## Pip

The mascot. A white dog in round glasses, drawn as vector (`src/components/mascot/`)
rather than shipped as a bitmap, so he recolours from `tokens.ts`, stays crisp at
every size from one source, and can be posed.

**Where he is allowed to appear is decided by the same frequency gate as the
motion vocabulary**, not by where he would be cute:

| Tier | Screens | Pip |
|---|---|---|
| Rare / first-run | welcome, reminders, ready, focus-complete | Full delight budget — entrance spring, celebration, confetti |
| Occasional | an empty day | Present, asleep, breathing slowly. Nothing else |
| Tens of times a day | task rows, tab bar, headers, a running timer | **Absent** |

The bottom row is the load-bearing one. A mascot on a FlashList row would replay
its entrance on every recycle, and a mascot in chrome is a thing you are made to
look at dozens of times a day until you resent it.

He is also absent from Focus *while the timer runs*. That screen's only ambient
motion is the halo and it is the one screen you are meant to stop looking at; a
character moving there works against the product. He arrives when the session
ends.

**Confetti fires once in the whole app**, on finishing a focus session. It is
deliberately not on the onboarding `ready` screen: answering five setup questions
is not an achievement, and spending the gesture there means it means nothing the
first time it is earned. The pieces are painted from `TINTS` — the same six hues
that encode a task's identity — so the celebration is visibly made of the user's
own day.

**His colours do not invert with the theme.** Everything else in the app flips
between light and dark; Pip is a white dog with orange ears, and a white dog is
still white at night. Swapping his coat for `surface` would not re-theme him, it
would make him a different animal. The coat and outline hold in both themes, with
the white dropped to a warm off-white in dark so it does not glare. His phone is
the one part painted in `accent`, which is what ties the character to the product
rather than leaving him a sticker borrowed from somewhere else.

Two implementation notes that are easy to get wrong:

1. **The head and body are clipping regions.** Every orange patch is drawn past
   the silhouette and trimmed by `clipPath`, because hand-fitting a patch to the
   inside of an ellipse breaks the moment the head changes by a pixel.
2. **Limbs are strokes, not filled outlines** — a thick `ink` stroke under a
   thinner `coat` one. That makes a pose a change of endpoints rather than a
   redrawn shape, and it is why `cheer` and `phone` cost four lines each.

Nothing in `Pip.tsx` animates. All motion lives in `PipScene` as `transform` and
`opacity` on wrapping views, so no animated SVG props are involved and every
moving part stays on the UI thread.

## State

- Zustand + **MMKV**. MMKV is synchronous, so the store rehydrates before the
  first paint — which is what makes the root redirect resolve on frame one
  instead of flashing onboarding at a returning user.
- Ephemeral UI state (collapsed sections, expanded steps, drafts) stays local.
- High-frequency typing surfaces use uncontrolled `TextInput`s.
- Lists are virtualised with FlashList; no row carries an `entering` animation,
  because recycled rows would replay it.
