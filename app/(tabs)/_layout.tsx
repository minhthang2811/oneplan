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
        /**
         * A CROSS-FADE, never a slide.
         *
         * Tabs are peers, so there is no left or right to travel along — a
         * slide invents a spatial relationship the information architecture
         * does not have, and it implies a hierarchy the app does not have
         * either. A fade carries no direction, so it stays truthful.
         *
         * This is also the most-used transition in the app, and the frequency
         * gate says a 100+/day action gets near-nothing. A fade is the cheapest
         * thing that is still a transition: it softens the swap so content does
         * not appear to teleport, and it is over before it asks to be watched.
         *
         * `TabAnimationName` is 'none' | 'fade' | 'shift'. 'shift' is the
         * sliding one, and it is the one to avoid here.
         */
        animation: 'fade',
      }}
    >
      {/* Declaration order is bar order. Tabs are peers: they cross-fade rather
          than slide, each keeps its own stack, and re-tapping the active tab
          pops to root. */}
      <Tabs.Screen name="todo" />
      <Tabs.Screen name="today" />
      <Tabs.Screen name="focus" />
      <Tabs.Screen name="me" />
    </Tabs>
  );
}
