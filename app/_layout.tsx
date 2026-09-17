import { useCallback, useEffect, useRef, useState } from 'react';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  PlayfairDisplay_500Medium,
  PlayfairDisplay_600SemiBold,
} from '@expo-google-fonts/playfair-display';
import {
  Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold,
} from '@expo-google-fonts/inter';
import { View, Pressable, Text, useColorScheme } from 'react-native';
import type { ErrorBoundaryProps } from 'expo-router';
import { usePlanStore } from '../src/store/usePlanStore';
import { useTaskNotifications } from '../src/lib/notifications';
import { useFocusAlarm } from '../src/lib/focusAlarm';
import { useTodayKey, TodayProvider } from '../src/lib/useTodayKey';
import { useDeviceLocaleSync, translate, type TKey } from '../src/i18n';
import { LaunchScreen } from '../src/components/LaunchScreen';
import { ChromeProvider } from '../src/components/Chrome';
import { useTheme, useAppearanceSync } from '../src/theme/useTheme';
import { motion, palette, radius, space } from '../src/theme/tokens';

/**
 * Expo Router renders this instead of the red box when a route throws.
 *
 * Deliberately styled with system fonts and literal palette values rather than
 * the `Txt`/`useTheme` components: if the thing that failed IS the font load or
 * the theme, a boundary built on them fails with it.
 */
/**
 * The boundary's own copy, translated but never trusting the translator.
 *
 * `translate()` reaches the language store, which reaches MMKV — so if storage
 * or rehydration is what threw, asking for a translated string while rendering
 * the screen that reports the failure would throw again and leave the user a
 * blank view with no way out. The English literal is the floor: worse copy for
 * a non-English reader beats no recovery button for anyone.
 */
function fallbackSafe(key: TKey, english: string): string {
  try {
    return translate(key);
  } catch {
    return english;
  }
}

export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  const dark = useColorScheme() === 'dark';
  const c = dark ? palette.dark : palette.light;
  return (
    <View
      style={{
        flex: 1, backgroundColor: c.canvas,
        alignItems: 'center', justifyContent: 'center',
        padding: space.xl, gap: space.md,
      }}
    >
      <Text style={{ fontSize: 22, fontWeight: '600', color: c.ink, textAlign: 'center' }}>
        {fallbackSafe('error.title', 'That screen did not load')}
      </Text>
      <Text style={{ fontSize: 15, color: c.inkMuted, textAlign: 'center', lineHeight: 21 }}>
        {fallbackSafe(
          'error.body',
          'Your plan is safe — it is stored on this device. You can try again.'
        )}
      </Text>
      <Text
        selectable
        style={{ fontSize: 12, color: c.inkFaint, textAlign: 'center', marginTop: space.sm }}
      >
        {error.message}
      </Text>
      <Pressable
        onPress={retry}
        accessibilityRole="button"
        style={{
          marginTop: space.base, height: 50, paddingHorizontal: space.xxl,
          alignItems: 'center', justifyContent: 'center',
          borderRadius: radius.pill, backgroundColor: c.solid,
        }}
      >
        <Text style={{ color: c.onSolid, fontSize: 16, fontWeight: '600' }}>
          {fallbackSafe('common.tryAgain', 'Try again')}
        </Text>
      </Pressable>
    </View>
  );
}

/**
 * The PLATFORM push, with the two options that make it feel fluid rather than
 * merely correct. Shared by every pushed detail screen so they cannot drift.
 *
 * `animation` stays 'default' on iOS on purpose: the native push already is a
 * spring-backed, interruptible, gesture-tracking transition, and every JS
 * reimplementation trades that away for control nobody asked for. On Android
 * 'default' is a fade-through with no spatial relationship at all, so it gets
 * the iOS-style push that react-native-screens ships for exactly this.
 */
const PUSH = {
  headerShown: false,
  animation: process.env.EXPO_OS === 'ios' ? 'default' : 'ios_from_right',
  /** Back-swipe from ANYWHERE, not just the left 20pt. */
  fullScreenGestureEnabled: true,
  /** Makes the dismissal track the finger rather than playing a canned exit. */
  animationMatchesGesture: true,
} as const;

SplashScreen.preventAutoHideAsync();
// `duration` is shared with `LaunchScreen`, which must hold perfectly still for
// exactly this long while the native splash fades off the top of it.
SplashScreen.setOptions({ duration: motion.launch.handoff, fade: true });

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    PlayfairDisplay_500Medium,
    PlayfairDisplay_600SemiBold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  // Store state comes from MMKV synchronously, so fonts are the only thing the
  // splash has to wait for. That is why there is no onboarding flash.
  const onboarded = usePlanStore((s) => s.onboarded);
  const { c } = useTheme();

  /**
   * TODAY'S ROUTINES ARE BUILT HERE, ONCE A DAY.
   *
   * A routine used to be written onto the plan only when it was configured, so
   * it appeared on that day and never again — see the note on `ensureToday`.
   * This is the call that makes it recur, and it is at the ROOT rather than in
   * the Today screen for two reasons: the plan has to be right before the
   * notification scheduler below reads it, and the day can turn over while the
   * user is sitting on Focus or Me.
   *
   * Keyed on the live date, so it runs on launch, on the first foreground
   * after midnight, and at midnight itself if the app is open. `ensureToday`
   * is idempotent, so a spurious run costs nothing.
   */
  const todayKey = useTodayKey();
  const ensureToday = usePlanStore((s) => s.ensureToday);
  useEffect(() => {
    if (onboarded) ensureToday();
  }, [todayKey, onboarded, ensureToday]);

  /**
   * A focus session that expired while the app was closed does not get a
   * celebration on the next launch — see `FOCUS_STALE_MS`. Once, on mount,
   * because this is about the gap between runs rather than about the clock.
   */
  const reconcileFocus = usePlanStore((s) => s.reconcileFocus);
  useEffect(() => { reconcileFocus(); }, [reconcileFocus]);

  // Pushes the stored light/dark preference down to the platform, so
  // ActionSheetIOS, Alert, Switch and the keyboard agree with the palette.
  // Mounted once, here, for the reason given on the hook.
  useAppearanceSync();

  // Above the router rather than inside a tab, so the schedule tracks the plan
  // from whichever screen edits it, and so importing the module — which is what
  // registers the foreground notification handler — happens on the first frame.
  useTaskNotifications();

  // The focus timer's own alarm, so a session that ends with the phone face
  // down still says so. Mounted beside the reminder scheduler, above the
  // router, because a session outlives the Focus screen.
  useFocusAlarm();

  /**
   * Keeps the detected device language current. Android can change it while the
   * app is merely backgrounded; iOS cannot, where this costs one native read
   * per foreground and nothing else.
   */
  useDeviceLocaleSync();

  /**
   * The launch overlay stays mounted until its own exit animation has finished.
   * Unmounting it is what hands the app over — there is no other state to keep,
   * which is why a boolean is the whole mechanism.
   */
  const [launched, setLaunched] = useState(false);
  const finishLaunch = useCallback(() => setLaunched(true), []);

  /**
   * ── THE FONT GATE USED TO BE IN FRONT OF EVERYTHING ────────────────────────
   * This component used to `return null` until `useFonts` resolved. That reads
   * as correct and it silently put the font load in FRONT of the whole launch:
   * returning null means the root never lays out, `onReady` never fires,
   * `hideAsync()` is never called, and the NATIVE splash stays up. So the time
   * to Pip's first movement was the font load plus the handoff, and the fonts
   * were being waited on by a mascot that does not use them.
   *
   * Now the overlay paints immediately and the fonts are waited on UNDERNEATH
   * it, in parallel with the animation — which is dead time that was already
   * being spent. The two things that gate on fonts are the only two that
   * actually need them: the router below, and the wordmark inside the overlay.
   *
   * The overlay therefore comes down when BOTH are true — its animation has
   * finished AND there is something behind it to reveal. Without the second
   * condition a cold start on a slow device could open the iris onto an empty
   * canvas, which is the one failure worse than the wait it was removing.
   */
  const launching = !launched || !fontsLoaded;

  /**
   * The native splash is hidden from `onLayout`, NOT from an effect.
   *
   * An effect fires after React commits but does not guarantee the commit has
   * been drawn. Hiding there can uncover the app for one frame before
   * `LaunchScreen` has painted, which shows up as a flash of Today between two
   * splash screens — rare enough to survive testing and obvious enough to be
   * the first thing anyone notices. `onLayout` fires after this tree has been
   * measured and is about to be shown, so the overlay is already there.
   */
  const hidden = useRef(false);
  const onReady = useCallback(() => {
    /**
     * ONCE. `onLayout` is not a mount hook — it fires again on every layout
     * pass, and at the root that means every keyboard show/hide through
     * `KeyboardProvider`, every safe-area inset update, every window resize.
     * Each of those was calling `hideAsync()` again, and a call against an
     * already-hidden splash can reject; with the promise neither awaited nor
     * caught that surfaces as an unhandled rejection warning.
     */
    if (hidden.current) return;
    hidden.current = true;
    SplashScreen.hideAsync().catch(() => {
      // Nothing to recover: the splash is either gone or was never shown, and
      // the app is already rendering underneath either way.
    });
  }, []);

  return (
    <GestureHandlerRootView onLayout={onReady} style={{ flex: 1, backgroundColor: c.canvas }}>
      <KeyboardProvider>
        <SafeAreaProvider>
        <TodayProvider value={todayKey}>
        <ChromeProvider>
          {!fontsLoaded ? null : (
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: c.canvas },
            }}
          >
            <Stack.Screen name="index" />

            {/* One-way door: when `onboarded` flips true these history entries
                are dropped, so back can never re-enter onboarding. */}
            <Stack.Protected guard={!onboarded}>
              <Stack.Screen name="onboarding" />
            </Stack.Protected>

            <Stack.Protected guard={onboarded}>
              <Stack.Screen name="(tabs)" />
              <Stack.Screen
                name="task/[id]"
                options={{
                  headerShown: false,
                  /**
                   * The PLATFORM push, with the two options that make it feel
                   * fluid instead of merely correct.
                   *
                   * `animation` is left at 'default' on iOS on purpose: the
                   * native push already is a spring-backed, interruptible,
                   * gesture-tracking transition, and every JS reimplementation
                   * of it trades that away for control nobody asked for. On
                   * Android 'default' is a fade-through with no spatial
                   * relationship at all, so it gets the iOS-style push, which
                   * react-native-screens ships for exactly this.
                   */
                  animation: process.env.EXPO_OS === 'ios' ? 'default' : 'ios_from_right',
                  /**
                   * Back-swipe from ANYWHERE, not just the left 20pt. This is
                   * the single biggest "native app" lever on the whole screen:
                   * a detail view you can throw away from the middle feels
                   * held rather than entered.
                   */
                  fullScreenGestureEnabled: true,
                  /**
                   * Makes the dismissal animation track the finger instead of
                   * playing a canned exit once the gesture is recognised. Off
                   * by default, and it is what separates "swiping the screen"
                   * from "triggering a back animation".
                   */
                  animationMatchesGesture: true,
                }}
              />
              <Stack.Screen
                name="add"
                options={{
                  presentation: 'formSheet',
                  sheetAllowedDetents: [0.58, 0.96],
                  sheetGrabberVisible: true,
                  sheetCornerRadius: radius.sheet,
                  sheetInitialDetentIndex: 0,
                  headerShown: false,
                  contentStyle: { backgroundColor: c.surface },
                }}
              />

              {/* Settings detail screens. They PUSH rather than present: each
                  one is a place inside Me, not a task interrupting it, and a
                  push is what gives them the back-swipe and the spatial
                  relationship that says "you are deeper in the same thing".
                  Same two options as the task detail, for the same reasons. */}
              <Stack.Screen name="language" options={PUSH} />
              <Stack.Screen name="routines" options={PUSH} />
              <Stack.Screen name="settings/appearance" options={PUSH} />
              <Stack.Screen name="settings/reminders" options={PUSH} />
            </Stack.Protected>
          </Stack>
          )}

          {/* Above the router, so the app is genuinely mounted and laid out
              behind it — the iris reveals the real Today screen rather than a
              placeholder that then has to be swapped. */}
          {launching ? <LaunchScreen onFinish={finishLaunch} fontsReady={fontsLoaded} /> : null}
        </ChromeProvider>
        </TodayProvider>
        </SafeAreaProvider>
      </KeyboardProvider>
    </GestureHandlerRootView>
  );
}
