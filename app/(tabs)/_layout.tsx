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
      /**
       * REQUIRED BY `animation: 'fade'` BELOW. Do not remove one without the
       * other.
       *
       * `detachInactiveScreens` defaults to TRUE on iOS: react-native-screens
       * physically detaches a blurred tab from the native view hierarchy. That
       * is a good default — until the navigator is also animating that screen's
       * opacity. The screen gets detached while its fade is still mid-flight at
       * opacity 0, and on re-attach the native opacity is never restored, so
       * the tab comes back mounted, correctly laid out, and completely
       * invisible. Going To-do -> Today rendered a blank canvas.
       *
       * It is a nasty failure because nothing errors: the view tree is intact
       * and every element reports correct bounds, so only a screenshot shows
       * anything is wrong.
       *
       * The cost is that all four tab screens stay attached. With four
       * lightweight screens that is a fair trade for a transition that works;
       * if a heavier screen is ever added here, re-measure it.
       */
      detachInactiveScreens={false}
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
