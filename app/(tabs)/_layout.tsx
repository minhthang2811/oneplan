import { Tabs } from 'expo-router';
import { TabBar } from '../../src/components/TabBar';
import { useTheme } from '../../src/theme/useTheme';

/**
 * Today is the app's home, not the alphabetically-first route file (`focus`).
 * SDK 57 reads `anchor` first and falls back to `initialRouteName`; both are
 * set so the anchor survives either spelling.
 */
export const unstable_settings = { anchor: 'today', initialRouteName: 'today' };

export default function TabsLayout() {
  const { c } = useTheme();
  return (
    <Tabs
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: c.canvas },
      }}
    >
      {/* Declaration order is bar order. Tabs are peers: no slide between them,
          each keeps its own stack, and re-tapping the active tab pops to root. */}
      <Tabs.Screen name="todo" />
      <Tabs.Screen name="today" />
      <Tabs.Screen name="focus" />
      <Tabs.Screen name="me" />
    </Tabs>
  );
}
