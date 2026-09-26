# Pupu

Pupu is a visual day planner built with Expo Router. It organizes a day into
loose time-of-day buckets (Anytime / Morning / Afternoon / Evening) instead of
a rigid timetable, and pairs that with a Focus mode built around a countdown
ring — so a day gets a shape without forcing a schedule. Focus is split into a
calm **stage** (the aura, the ring, the number) and a grounded **tray** that
holds every control at thumb height; see
[DESIGN.md](./DESIGN.md#focus-the-stage-and-the-tray).

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
    mascot/             The mascot's artwork (Pupu) and his motion (PupuScene)
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
  splash-pupu.png        The native splash logo. MUST stay a render of
                        mascot/pupu-sit.webp at the same size, or the handoff
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
| `01-onboarding` | The five-step first run, and Pupu's three first-run moments |
| `02-empty-day` | The empty state, and Pupu at rest |
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
| `14-task-delete` | Deleting an activity from its own detail screen does not crash that screen |
| `15-add-activity` | A new activity saved from the sheet lands on the day with its details, and the discard guard asks only when there is something to lose |
| `16-todo-inbox` | Typing into a priority bucket twice gives two rows, not one run-on; the sheet's inbox mode files a to-do, not a dated activity |
| `17-focus-controls` | Pause, Resume, + 1 min, and End — both "Keep going" and ending for real |
| `18-appearance-and-layout` | Dark and light repaint every tab (status bar included — check the screenshots), the timeline layout draws, and both go back to their defaults |
| `19-reminders-permission` | A never-asked permission reads "Not asked yet" rather than a dead-end "Not allowed", and turning reminders on goes through the real iOS prompt |
| `20-run-onboarding-again` | Starting over keeps the user's own activities and leaves exactly one morning routine |
| `21-deep-links` | A `pupu://` link to a deleted activity lands on "This activity is gone", not a crash |
| `22-decline-carry-over` | "Not today" hides unfinished work without moving it, survives a relaunch, and can be taken back from Day options |

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
simulator and takes about half an hour — `03` alone waits out a real one-minute
focus session:

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

**The simulator has to be in English.** The flows assert English strings, and
the app opens in the phone's language — so on a simulator set to Vietnamese
every text selector misses and the suite fails from the first `assertVisible`
with nothing wrong in the app at all. `08-language` and `12-translated-chrome`
go further: they *switch* to Vietnamese and back, so they assume English is
where they started. There is no `simctl` verb for this; it is a defaults write
and a reboot, and it is worth putting back afterwards:

```bash
D=<udid>
xcrun simctl spawn $D defaults read -g AppleLanguages   # keep this
xcrun simctl spawn $D defaults write -g AppleLanguages -array en-US
xcrun simctl spawn $D defaults write -g AppleLocale -string en_US
xcrun simctl shutdown $D && xcrun simctl boot $D
```

A `clearState: true` flow does **not** strand a development build, which is the
thing you would expect it to do: the dev client finds the packager again on the
next launch, so the flows that clear state run against Metro like any other.

**Before a store submission, run the suite against a Release build of a freshly
generated `ios/`.** `ios/` is gitignored and EAS regenerates it for every build,
so a local copy drifts silently: one left over from before the bundle-ID move
still built `com.pupu.app`, without `expo-updates` — a binary that no longer
exists, which the flows (pinned to `com.minhthang.pupu`) cannot even launch.
Release is also the configuration that embeds the Hermes bundle instead of
loading from Metro, which is what ships. Building for the simulator's own
architecture only halves the build's disk footprint, which matters: a universal
Release build ran a nearly full disk out of space mid-link.

```bash
npx expo prebuild --clean --platform ios   # LANG=en_US.UTF-8 if pod install crashes on encoding
xcodebuild -workspace ios/Pupu.xcworkspace -scheme Pupu -configuration Release \
  -sdk iphonesimulator -destination "id=<udid>" ONLY_ACTIVE_ARCH=YES ARCHS=arm64 \
  -derivedDataPath ios/build build
xcrun simctl install <udid> ios/build/Build/Products/Release-iphonesimulator/Pupu.app
```

`-derivedDataPath` is what makes the install line safe to copy. Xcode's default
DerivedData folder is named after a hash of the workspace's PATH, so every
checkout, worktree or old clone of this repo leaves its own `Pupu-<hash>` —
and a glob across them installs whichever sorts first, which is exactly the
stale binary this section exists to avoid. Under `ios/` it is also gitignored,
and `prebuild --clean` sweeps it away with everything else it regenerates.

Rules learned the hard way, documented in the flows themselves:

1. A selector is a **full regex match**, not a substring — a bare prefix fails,
   so partial matches need an explicit `.*`.
2. On iOS this app's text lives in `accessibilityText`, so **a control matches on
   its `accessibilityLabel`, not its visible words**: the focus Start button is
   `Start 1m focus`, `+ 1 min` is `Add one minute`, `End` is `End session`.
   An `accessibilityValue` is matched too, which makes a bare selector
   ambiguous in a way the screen does not show: while the focus dial reads 15,
   `"15m"` is both the preset chip's label and the dial's value — and Maestro
   tapped the dial. Anchor such a selector (`below:`) or give it `selected:`.
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
   `~/.maestro/tests/<run timestamp>/<flow name>/takeScreenshot/artifacts/`
   (or under `--test-output-dir`, when one is given). Worth knowing, because rule 5 makes them the only guard against a whole class
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
10. **Flows do not run in filename order**, so no flow may rely on another
    having run first. Nine of them used to assume some earlier flow had already
    walked onboarding; they passed on a warm simulator and failed on a fresh
    install. Any flow that does not clear state now starts with
    `runFlow: flows/onboard-if-needed.yaml`, which waits for the first real
    screen and walks onboarding only if that screen is the welcome.
11. **`hideKeyboard` fails when there is no keyboard to hide.** After an action
    sheet closes, or after a compose row remounts on submit, iOS may leave the
    caret without the keyboard. Where the keyboard is legitimately optional the
    step is `optional: true`, and says why.
    **And when there is a keyboard, it may not hide it either.** On iOS,
    `hideKeyboard` is a 3% drag from the **dead centre of the screen**, so it
    works only if whatever sits there dismisses the keyboard — and none of this
    app's scroll views set `keyboardDismissMode`. Which control is at the centre
    depends on the phone's height: on an iPhone 17 Pro it was the very text
    field being edited (`13` failed outright) and a tag chip, which the drag
    *selected* (`15`, where `optional: true` swallowed the failure). Where the
    keyboard has to go, tap a piece of static text instead — every scroll view
    here is `keyboardShouldPersistTaps="handled"`, so an unhandled tap blurs the
    field if the keyboard is up and does nothing if it is not.
12. **`openLink` is followed by iOS's own "Open in “Pupu”?" confirmation**, which
    belongs to SpringBoard rather than the app — so it survives a relaunch and,
    left unanswered, sits on top of every flow that runs after it. Tap "Open".
    And two elements can share a label: the reminders switch and its row's text
    are both "Activity reminders", and a plain text tap hits the words, which
    toggle nothing. A `rightOf:` selector whose reference carried `index: 0`
    found nothing — plain `rightOf:` was not tried — so the switch carries a
    `testID` instead.
13. **"Visible" means inside the window, not uncovered.** A list row resting
    under the floating tab bar, or a field under the keyboard, is visible to
    Maestro — `scrollUntilVisible` stops at once — and `tapOn` sends the tap to
    its centre, which whatever is drawn on top receives. This is rule 5 from the
    other side, and it is why the suite has to be run on the phone it will be
    trusted on: on an iPhone 17 Pro (874pt) rows that sit clear of the bar on a
    Pro Max rest under it, and a full-width row's centre, x = 50%, is exactly
    the Focus tab's left edge — so `11` and `20` bounced to Focus and looked like
    a tab switch the bar had dropped. Scroll the row clear first:
    `scrollUntilVisible` with `centerElement: true` where the list is long enough
    to centre it, a plain `scroll` to the end where it is not.

## Publishing to the App Store

Builds and submissions go through [EAS](https://docs.expo.dev/build/introduction/);
the profiles live in [eas.json](./eas.json). `ios/` is generated by CNG, so
there is no Xcode project to configure by hand — everything comes from
[app.json](./app.json).

```bash
npm install -g eas-cli
eas login
eas init                     # links the project to your Expo account, once
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

Before the first submission you will need a paid Apple Developer account. The
first `eas submit` creates the App Store Connect record for `com.minhthang.pupu`
under `submit.production.ios.appName` in eas.json — set because the fallback,
app.json's `name`, is plain "Pupu", and when a name is taken EAS appends a
random suffix such as "Pupu (3f9a1c)".

The listing itself — both localizations, the age rating, the review notes and
the screenshots in `store/screenshots/` — is
[store.config.json](./store.config.json), pushed by EAS Metadata once that
record exists:

```bash
APPLE_REVIEW_FIRST_NAME=… APPLE_REVIEW_LAST_NAME=… APPLE_REVIEW_PHONE=… eas metadata:push
```

The App Review contact comes from the environment because this repository is
public: [store.config.js](./store.config.js) merges it in, and refuses to run
without it. What EAS Metadata cannot set stays in App Store Connect: the App
Privacy answers, price and availability, and picking the build to submit.

`promptToConfigurePushNotifications` is off in eas.json because Pupu never
registers for remote notifications — every reminder is scheduled on the
device — so there is nothing for an APNs key to do.

`ITSAppUsesNonExemptEncryption` is already declared `false` in app.json, which
is what stops App Store Connect holding every build behind the export
compliance questionnaire. The app ships no cryptography of its own.

For the privacy questionnaire: Pupu stores everything locally via MMKV,
makes no network requests, and collects nothing — "Data Not Collected". That
sentence is true **only while over-the-air updates are off** — see below.

### Over-the-air updates: decide before the first build

`expo-updates` is installed, but `updates.url` is not set, so every build made
today is generated with `EXUpdatesEnabled = false`: the binary can never take an
OTA fix, and the only way to change that is another binary through review. The
URL comes from the EAS project ID, so to have OTA in 1.0 run this **before**
`eas build`:

```bash
eas init                  # writes extra.eas.projectId
eas update:configure      # writes updates.url
```

Turning it on changes what the app does on the network. On every launch it asks
Expo's update server whether there is a newer bundle. The request carries
nothing from the plan, but it is not empty: headers for the platform, runtime
version, channel, protocol and API version, the embedded and currently running
update IDs, recently failed update IDs, and an install-scoped random
`EAS-Client-ID` that persists across launches — plus, as with any request, the
device's IP address, which Expo's servers receive. Three documents currently promise the opposite and have
to change in the same commit: [docs/privacy-policy.md](./docs/privacy-policy.md)
("makes no network requests of any kind"), the App Review notes in
[store.config.json](./store.config.json) ("makes no network requests at all"),
and the questionnaire line above. Whether "Data Not Collected" still holds is
worth re-reading Apple's definition for, rather than assuming.

## Contributing

- Keep new UI colors and spacing inside `src/theme/tokens.ts` — screens should
  not define ad hoc colors (see the color contract in
  [DESIGN.md](./DESIGN.md)).
- Run `npx tsc --noEmit` before pushing, since the project builds with
  `strict: true`.
