# Oneplan

Oneplan is a visual day planner built with Expo Router. It organizes a day into
loose time-of-day buckets (Anytime / Morning / Afternoon / Evening) instead of
a rigid timetable, and pairs that with a Focus mode built around a countdown
ring — so a day gets a shape without forcing a schedule.

It opens on an animated launch screen that hands over from the native splash
without a visible seam, navigates from a floating **gel** tab bar whose selection
indicator stretches like liquid (and can be dragged), and marks a task done with
a tick that strokes itself onto the page.

See [DESIGN.md](./DESIGN.md) for the full design system: the reference class
it was built from, the color and shape contracts, motion rules, the launch
sequence, the liquid indicator, and navigation grammar.

## Tech stack

- [Expo](https://docs.expo.dev/versions/v57.0.0/) SDK 57 (React Native 0.86, React 19), new architecture enabled
- [Expo Router](https://docs.expo.dev/versions/v57.0.0/sdk/router/) for file-based navigation, with typed routes
- [Zustand](https://github.com/pmndrs/zustand) + [react-native-mmkv](https://github.com/mrousavy/react-native-mmkv) for synchronous, persisted state
- [react-native-reanimated](https://docs.swmansion.com/react-native-reanimated/) + [react-native-gesture-handler](https://docs.swmansion.com/react-native-gesture-handler/) for the focus dial and press feedback
- [@shopify/flash-list](https://shopify.github.io/flash-list/) for virtualized lists
- [expo-localization](https://docs.expo.dev/versions/v57.0.0/sdk/localization/) for
  device-language detection (English and Vietnamese)
- TypeScript (strict mode)

> **Note:** this project targets Expo SDK 57, which changed significantly from
> earlier SDKs. When making changes, check the versioned docs at
> https://docs.expo.dev/versions/v57.0.0/ rather than assuming older APIs.

## Getting started

### Prerequisites

- Node.js 20 or later
- The [Expo Go](https://expo.dev/go) app (for quick device testing), or Xcode /
  Android Studio for native builds
- `npm` (a `package-lock.json` is committed; use `npm`, not `yarn` or `pnpm`,
  to keep the lockfile consistent)

### Install

```bash
npm install
```

### Run

```bash
npm start
```

This starts the Expo dev server. From there, press `i` for iOS Simulator,
`a` for Android Emulator, or scan the QR code with Expo Go on a physical
device.

Platform-specific shortcuts are also available:

```bash
npm run ios      # build and run the iOS app (requires Xcode)
npm run android  # build and run the Android app (requires Android Studio)
npm run web      # run in a browser
```

`ios/` and `android/` are not checked into version control — they are
generated on demand by Expo's Continuous Native Generation (CNG) the first
time you run `npm run ios` / `npm run android`, from the config in
[app.json](./app.json).

## Project structure

```
app/                    Expo Router routes (file-based navigation)
  index.tsx             Root redirect: onboarding vs. main tabs
  language.tsx          The language picker (System / English / Tiếng Việt)
  onboarding/           One-way onboarding flow
                        (welcome → need → rhythm → routines → reminders → ready)
  (tabs)/                Today / To-do / Focus / Me tab group
  add.tsx               Add-activity form sheet
  task/[id].tsx         Task detail screen
src/
  components/           Shared UI primitives (Button, Chip, Ring, Glass, TabBar, ...)
    LaunchScreen.tsx    The animated launch screen, and its iris reveal
    Glass.tsx           The glass primitive — Apple's real Liquid Glass on
                        iOS 26+, the hand-painted gel everywhere else
    Gel.tsx             That fallback material: convex dome, specular, caustic
    TabBar.tsx          Floating gel bar with the liquid (metaball) indicator
    Checkbox.tsx        Completion: squish, fill, self-drawing tick, pop ring
    Strike.tsx          A strikethrough drawn per laid-out text line
    Rise.tsx            Staggered arrival for a pushed screen's own content
    mascot/             Pip — the mascot image (Pip) and his motion (PipScene)
    FocusAura.tsx       The drifting field of light behind Focus, built from
                        the focused activity's own tint
  data/seed.ts           Sample/seed data
  data/routines.ts       The morning/afternoon/evening routine catalogue
  i18n/                  Translations. `en.ts` is the schema; every other
                         catalogue is typed against it, so a missing key is a
                         build error rather than a runtime fallback
  lib/                   Small utilities (time formatting, haptics, local reminders)
  store/                 Zustand store, MMKV-backed storage, and types
  theme/                 Design tokens and the light/dark theme hook
assets/                 App icons and splash images
  splash-pip.png        The native splash logo. MUST stay a render of
                        mascot/pip-sit.webp at the same size, or the handoff
                        into the animated launch screen has a visible cut.
app.json                Expo app config (icons, splash, plugins, bundle IDs)
eas.json                EAS build/submit profiles
DESIGN.md               Design system reference
```

## Language

The app ships **English** and **Vietnamese**, and opens in whichever one the
phone is set to — no prompt, no setup. A phone in Vietnamese gets Vietnamese; a
phone in anything else gets English.

Detection walks the device's whole ordered preference list rather than only its
top entry, so a phone set to [Khmer, Vietnamese, English] still opens in
Vietnamese, and it matches on language code so "vi-VN" and "vi-US" both count.

`Me → Language` overrides it. The first row is **System**, which is a real state
rather than a shortcut for today's answer: pick it and the app keeps following
the phone, including after a trip or a settings change. Every language is listed
under its own name, because someone who has landed in a script they cannot read
is looking for the shape of their own word.

Adding a language is two files and a config line:

1. Copy `src/i18n/vi.ts`, translate the values, and export it typed as `Dict`.
   TypeScript will list every key you have not filled in.
2. Register it in `LOCALES`, `LOCALE_NAME` and `LOCALE_TAG` in
   `src/i18n/index.ts`.
3. Add its code to `supportedLocales` in [app.json](./app.json), which is what
   tells iOS and Android the app speaks it.

See the **Language** section of [DESIGN.md](./DESIGN.md) for why translations
are compiler-checked and why stored data holds keys rather than words.

## Scripts

| Script | Description |
|---|---|
| `npm start` | Start the Expo dev server |
| `npm run ios` | Prebuild (if needed) and run the iOS app |
| `npm run android` | Prebuild (if needed) and run the Android app |
| `npm run web` | Run the app in a browser |

## Agent skills

This repo pins a set of AI-agent skills — Expo's official set (`expo-animation`,
`expo-design-system`, `expo-router`, `eas-simulator`, …) plus a few animation and
Apple-design review skills. They are instruction files that teach Claude Code,
Cursor, Codex and friends the SDK 57 conventions this project depends on, instead
of letting them guess from older SDKs.

`skills-lock.json` is committed and pins every skill with a content hash. The
installed files are gitignored, like `node_modules`. To restore them:

```bash
npx skills experimental_install
```

## End-to-end tests

[Maestro](https://maestro.mobile.dev) flows live in [.maestro/](./.maestro).
They drive a real simulator through onboarding, the empty day, a full one-minute
focus session, completing and un-completing an activity, dragging the tab bar's
liquid indicator, switching the app to Vietnamese and back, and the animated
launch screen's handoff — and capture a
screenshot at every screen the mascot appears on. A mascot passes
`assertVisible` just fine while rendering as a blank box, so the screenshots are
as much the point as the assertions.

| Flow | What it guards |
|---|---|
| `01-onboarding` | The five-step first run, and Pip's three first-run moments |
| `02-empty-day` | The empty state, and Pip at rest |
| `03-focus-celebration` | A real one-minute session through to the confetti |
| `04-tab-transitions` | Every tab pair, in both directions — the blank-tab regression |
| `05-task-completion` | Completing an activity and taking it back |
| `06-tab-drag` | Dragging the indicator commits where it *ended*, and tapping still works |
| `07-launch-handoff` | The launch overlay appears **and then goes away** |
| `08-language` | Switching to Vietnamese relabels the picker, the screen behind it, and the tab bar |
| `09-routine-recurrence` | A routine survives a relaunch, and arrives exactly **once** |
| `10-task-editing` | Renaming, retiming and moving an activity, read back off the list |
| `11-focus-dial` | The dial follows the activity it was opened for, and forgets it after |
| `12-translated-chrome` | No English literals left on Routines or Reminders |
| `13-routine-step-editing` | A step's wording and length change in the settings, the summary **and** the day |

`09` is the one that guards the worst bug the app has had: a routine used to be
written onto the plan only on the day it was configured, so day two opened to an
empty grid for someone who had already described their mornings. Maestro cannot
move the device clock, so it cannot prove the routine returns *tomorrow* — what
it proves is the half that regressed twice, that the routine exists at all and
exists once. The date gating itself lives in `routinesBuiltFor`.

`07` is the important one. The launch overlay is `pointerEvents="none"` and
entirely hidden from assistive technology, so if it ever failed to unmount, the
app underneath would stay mounted, stay tappable, and keep satisfying every
assertion in every other flow — while the user stared at a mascot forever.
Nothing else in the suite can catch that, which is why `LaunchScreen` carries a
`testID`: it becomes `accessibilityIdentifier` on iOS, which Maestro can see and
VoiceOver does not announce.

```bash
brew install openjdk@17
curl -Ls "https://get.maestro.mobile.dev" | bash
```

Then, with the app built and running on a simulator:

```bash
JAVA_HOME=/opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home PATH="$HOME/.maestro/bin:$PATH" maestro test .maestro/01-onboarding.yaml
```

Or the whole suite, which on Maestro 2.10 runs them sequentially against one
simulator and takes about five minutes:

```bash
JAVA_HOME=/opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home PATH="$HOME/.maestro/bin:$PATH" maestro test .maestro/
```

**`JAVA_HOME` is not optional.** Maestro is a JVM tool and macOS ships only a
`/usr/bin/java` stub, so without it every command fails with "Unable to locate a
Java Runtime" — including `maestro --version`, which makes it look like Maestro
itself is broken.

**Shut down all but one simulator before running.** With two booted, `maestro
test` silently picks one (so a flow can pass on a device you were not watching)
and `maestro hierarchy` refuses outright with "Multiple devices connected". Use
`xcrun simctl list devices booted` to check, and `maestro test --device <udid>`
if you must keep more than one.

Rules learned the hard way, documented in the flows themselves:

1. A selector is a **full regex match**, not a substring — a bare prefix fails,
   so partial matches need an explicit `.*`.
2. On iOS this app's text lives in `accessibilityText`, so **a control matches on
   its `accessibilityLabel`, not its visible words**: the focus Start button is
   `Start 1 minute focus`, `+ 1 min` is `Add one minute`, `End` is `End session`.
3. `tapOn: point:` percentages must be **whole numbers**. `"16.4%,93%"` throws
   `NumberFormatException` at runtime, after the flow has already started.
4. `launchApp` returns **before React has mounted**, so the first tap can land on
   a blank window and silently do nothing. Assert something on the first screen
   before interacting.
5. **`assertVisible` matches the view hierarchy, not the pixels.** A screen that
   is mounted and correctly laid out but drawn at opacity 0 passes every
   assertion — which is exactly how the blank-tab bug got in. The
   `takeScreenshot` calls are what catch that class of regression.
6. Those screenshots do **not** land in `./artifacts`. Despite the path in the
   flow, Maestro 2.x writes them to
   `~/.maestro/tests/<run timestamp>/<flow name>/takeScreenshot/artifacts/`.
   Worth knowing, because rule 5 makes them the only guard against a whole class
   of bug and a guard nobody can find is not a guard.
7. **`checked:` does not work on iOS.** React Native maps
   `accessibilityState.checked` to an accessibility *value*, not to the boolean
   attribute Maestro reads, so the selector never matches. `selected:` *does*
   work, because RN maps that one to a real UIKit trait. The two are not
   symmetrical.
8. **A row with a role and a label swallows its children.** iOS exposes such a
   view as one accessibility element, so a control nested inside it — the task
   row's checkbox, for instance — is not in the hierarchy at all and cannot be
   selected by name. Writing `05-task-completion` is what surfaced that, and it
   was a real defect rather than a test problem: it meant a VoiceOver user could
   not complete an activity from the list. The row now exposes a custom
   `toggle` action for it.
9. **A virtualized row that is off-screen is not in the hierarchy at all**, so
   `assertVisible` fails on content that exists and is perfectly correct. This
   is rule 5's twin and it is nastier, because the failure is plausible: an
   assertion about an activity you have just moved to the Evening block fails
   with "not visible", which reads exactly like the move having deleted it.
   `scrollUntilVisible` is the fix, and the day header is worth remembering
   too — it is the list's `ListHeaderComponent`, so scrolling down takes the
   Next/Previous day chevrons with it and they have to be scrolled back to.

## Publishing to the App Store

Builds and submissions go through [EAS](https://docs.expo.dev/build/introduction/);
the profiles live in [eas.json](./eas.json). `ios/` is generated by CNG, so
there is no Xcode project to configure by hand — everything comes from
[app.json](./app.json).

```bash
npm install -g eas-cli
eas login
eas build:configure          # links the project to your Expo account, once
```

Then, for each release:

```bash
eas build --platform ios --profile production
eas submit --platform ios --latest
```

`appVersionSource` is `remote`, so EAS owns the build number and
`autoIncrement` bumps it per build — `ios.buildNumber` is deliberately absent
from app.json so the two cannot disagree. The marketing version (`version` in
app.json) is still yours to set.

Before the first submission you will need, on the Apple side: a paid Apple
Developer account, an App Store Connect app record using the bundle identifier
`com.oneplan.app`, and the usual store listing (screenshots, description,
support URL, privacy policy URL).

`ITSAppUsesNonExemptEncryption` is already declared `false` in app.json, which
is what stops App Store Connect holding every build behind the export
compliance questionnaire. The app ships no cryptography of its own.

For the privacy questionnaire: Oneplan stores everything locally via MMKV,
makes no network requests, and collects nothing — "Data Not Collected".

## Contributing

- Keep new UI colors and spacing inside `src/theme/tokens.ts` — screens should
  not define ad hoc colors (see the color contract in
  [DESIGN.md](./DESIGN.md)).
- Run `npx tsc --noEmit` before pushing, since the project builds with
  `strict: true`.
