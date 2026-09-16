import { useCallback, useRef, useState } from 'react';
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
import { LaunchScreen } from '../src/components/LaunchScreen';
import { useTheme } from '../src/theme/useTheme';
import { useDeviceLocaleSync, translate } from '../src/i18n';
import { motion, palette, radius, space } from '../src/theme/tokens';

/**
 * Expo Router renders this instead of the red box when a route throws.
 *
 * Deliberately styled with system fonts and literal palette values rather than
 * the `Txt`/`useTheme` components: if the thing that failed IS the font load or
 * the theme, a boundary built on them fails with it.
 */
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
        {translate('error.title')}
      </Text>
      <Text style={{ fontSize: 15, color: c.inkMuted, textAlign: 'center', lineHeight: 21 }}>
        {translate('error.body')}
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
          {translate('common.tryAgain')}
        </Text>
      </Pressable>
    </View>
  );
}

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

  // Above the router rather than inside a tab, so the schedule tracks the plan
  // from whichever screen edits it, and so importing the module — which is what
  // registers the foreground notification handler — happens on the first frame.
  useTaskNotifications();

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
  const [launching, setLaunching] = useState(true);
  const finishLaunch = useCallback(() => setLaunching(false), []);

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

  if (!fontsLoaded) return null;

  return (
    <GestureHandlerRootView onLayout={onReady} style={{ flex: 1, backgroundColor: c.canvas }}>
      <KeyboardProvider>
        <SafeAreaProvider>
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
                name="language"
                options={{
                  headerShown: false,
                  animation: process.env.EXPO_OS === 'ios' ? 'default' : 'ios_from_right',
                  fullScreenGestureEnabled: true,
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
            </Stack.Protected>
          </Stack>

          {/* Above the router, so the app is genuinely mounted and laid out
              behind it — the iris reveals the real Today screen rather than a
              placeholder that then has to be swapped. */}
          {launching ? <LaunchScreen onFinish={finishLaunch} /> : null}
        </SafeAreaProvider>
      </KeyboardProvider>
    </GestureHandlerRootView>
  );
}
