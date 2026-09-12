# Oneplan

Oneplan is a visual day planner built with Expo Router. It organizes a day into
loose time-of-day buckets (Anytime / Morning / Afternoon / Evening) instead of
a rigid timetable, and pairs that with a Focus mode built around a countdown
ring — so a day gets a shape without forcing a schedule.

See [DESIGN.md](./DESIGN.md) for the full design system: the reference class
it was built from, the color and shape contracts, motion rules, and
navigation grammar.

## Tech stack

- [Expo](https://docs.expo.dev/versions/v57.0.0/) SDK 57 (React Native 0.86, React 19), new architecture enabled
- [Expo Router](https://docs.expo.dev/versions/v57.0.0/sdk/router/) for file-based navigation, with typed routes
- [Zustand](https://github.com/pmndrs/zustand) + [react-native-mmkv](https://github.com/mrousavy/react-native-mmkv) for synchronous, persisted state
- [react-native-reanimated](https://docs.swmansion.com/react-native-reanimated/) + [react-native-gesture-handler](https://docs.swmansion.com/react-native-gesture-handler/) for the focus dial and press feedback
- [@shopify/flash-list](https://shopify.github.io/flash-list/) for virtualized lists
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
  onboarding/           One-way onboarding flow (welcome → rhythm → need → reminders → ready)
  (tabs)/                Today / To-do / Focus / Me tab group
  add.tsx               Add-activity form sheet
  task/[id].tsx         Task detail screen
src/
  components/           Shared UI primitives (Button, Chip, Ring, TabBar, ...)
  data/seed.ts           Sample/seed data
  lib/                   Small utilities (time formatting, haptics, a now-minute hook)
  store/                 Zustand store, MMKV-backed storage, and types
  theme/                 Design tokens and the light/dark theme hook
assets/                 App icons and splash images
app.json                Expo app config (icons, splash, plugins, bundle IDs)
DESIGN.md               Design system reference
```

## Scripts

| Script | Description |
|---|---|
| `npm start` | Start the Expo dev server |
| `npm run ios` | Prebuild (if needed) and run the iOS app |
| `npm run android` | Prebuild (if needed) and run the Android app |
| `npm run web` | Run the app in a browser |

## Contributing

- Keep new UI colors and spacing inside `src/theme/tokens.ts` — screens should
  not define ad hoc colors (see the color contract in
  [DESIGN.md](./DESIGN.md)).
- Run `npx tsc --noEmit` before pushing, since the project builds with
  `strict: true`.
