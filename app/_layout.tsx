import { useEffect } from 'react';
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
import { useTheme } from '../src/theme/useTheme';
import { palette, radius, space } from '../src/theme/tokens';

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
        That screen did not load
      </Text>
      <Text style={{ fontSize: 15, color: c.inkMuted, textAlign: 'center', lineHeight: 21 }}>
        Your plan is safe — it is stored on this device. You can try again.
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
        <Text style={{ color: c.onSolid, fontSize: 16, fontWeight: '600' }}>Try again</Text>
      </Pressable>
    </View>
  );
}

SplashScreen.preventAutoHideAsync();
SplashScreen.setOptions({ duration: 260, fade: true });

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

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync();
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: c.canvas }}>
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
                options={{ headerShown: false, animation: 'slide_from_right' }}
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
        </SafeAreaProvider>
      </KeyboardProvider>
    </GestureHandlerRootView>
  );
}
