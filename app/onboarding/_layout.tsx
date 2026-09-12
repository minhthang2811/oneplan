import { Stack } from 'expo-router';
import { useTheme } from '../../src/theme/useTheme';

export const unstable_settings = { initialRouteName: 'welcome' };

export default function OnboardingLayout() {
  const { c } = useTheme();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: c.canvas },
        // The system push: 100+ times a day is the frequency gate for tabs, but
        // even here a bespoke transition would only make the flow feel less iOS.
        animation: 'slide_from_right',
      }}
    />
  );
}
