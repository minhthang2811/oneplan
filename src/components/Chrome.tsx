import { createContext, useCallback, useContext, useMemo, useRef, type ReactNode } from 'react';
import type { NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
import { useFocusEffect } from 'expo-router';
import {
  useSharedValue, withSpring, useReducedMotion, type SharedValue,
} from 'react-native-reanimated';
import { motion, scrollEdge } from '../theme/tokens';

/**
 * ONE SCROLL SIGNAL, SHARED BY EVERY PIECE OF FLOATING CHROME.
 *
 * Two separate things in this app react to scrolling — the blurred edge at the
 * top and the tab bar at the bottom — and they are rendered in completely
 * different places: the edge is inside whichever screen is showing, the tab bar
 * is rendered by the `Tabs` navigator above all of them. Giving each its own
 * `onScroll` would mean every screen wiring up two handlers and the two pieces
 * of chrome disagreeing about what "scrolled down" means the moment either
 * threshold was tuned.
 *
 * So the signal is hoisted to the navigator and both read it. A screen attaches
 * ONE handler and gets both behaviours.
 *
 * ── WHY SHARED VALUES AND NOT STATE ────────────────────────────────────────
 * Because this updates at 60Hz and drives animation, not layout. React state
 * here would re-render every tab screen on every scroll frame. Shared values
 * cross to the UI thread once and are read by worklets, so a scroll costs one
 * assignment and no renders at all.
 */
export type Chrome = {
  /** Live scroll offset of the active screen, in points. */
  y: SharedValue<number>;
  /**
   * 0 expanded, 1 contracted. Springs between the two — this is a STATE, not a
   * continuous mapping of the offset, because the tab bar contracting
   * proportionally to how far you have scrolled reads as a bug rather than as
   * a behaviour.
   */
  collapsed: SharedValue<number>;
};

const ChromeContext = createContext<Chrome | null>(null);

/**
 * Attach to a scrolling view — it returns `scrollEventThrottle` too, so spread
 * the whole thing and the two cannot be wired up half-done.
 *
 * ── WHY THIS IS A PLAIN JS HANDLER AND NOT `useAnimatedScrollHandler` ──────
 * Because FlashList cannot take one. Its `RecyclerView` owns the ScrollView's
 * `onScroll` for its own windowing maths and then forwards the event to the
 * caller as an ordinary function call:
 *
 *     recyclerViewManager.props.onScroll?.call(props, event)
 *
 * A Reanimated scroll handler is not an ordinary function — it is an object
 * carrying a worklet, and it only becomes a UI-thread handler when it is
 * attached directly to an `Animated.ScrollView`. Handed to FlashList it is
 * invoked as a plain callback, which either throws or silently never updates.
 *
 * So the offset crosses to the UI thread by hand, once per scroll event. That
 * is the only JS-thread work in the whole effect: everything that READS these
 * values is a worklet, so the blur and the tab bar still animate on the UI
 * thread even while JS is busy. A dropped JS frame costs one frame of lag on a
 * fade, which is invisible; it would be unacceptable if this tracked the finger
 * 1:1, and it does not.
 *
 * ── THE HYSTERESIS IS THE WHOLE DESIGN ─────────────────────────────────────
 * A bar that contracts on any downward movement and expands on any upward one
 * flickers constantly: iOS rubber-bands at the top of a list, a finger never
 * travels in a perfectly straight line, and momentum scrolling overshoots and
 * corrects. So direction alone is not enough — the gesture has to COMMIT.
 *
 * Travel is accumulated in one direction and reset the moment the direction
 * changes, and the bar only moves once that accumulation passes
 * `scrollEdge.hysteresis`. A small correction mid-scroll therefore does
 * nothing at all, which is what makes the bar feel like it is responding to
 * intent rather than to jitter.
 *
 * And it never contracts near the top of the day: hiding navigation while the
 * user is still looking at the first thing on their list is the one case where
 * it is certainly wrong, so `hideAfter` gates it outright.
 */
export function useChromeScroll(): {
  onScroll: (e: NativeSyntheticEvent<NativeScrollEvent>) => void;
  scrollEventThrottle: number;
} {
  const chrome = useContext(ChromeContext);
  const reduced = useReducedMotion();
  const last = useRef(0);
  const travel = useRef(0);

  const onScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (!chrome) return;
      const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
      const y = contentOffset.y;
      const dy = y - last.current;
      last.current = y;
      chrome.y.set(y);

      // Reduce Motion keeps the blurred edge, which is a legibility treatment,
      // and drops the contraction, which is chrome moving around the screen.
      if (reduced) return;

      /**
       * OVERSCROLL IS NOT A DIRECTION, AND MISSING THAT IS WHAT BROKE THIS.
       *
       * Measured on a day that fits in a little over one screen: a single flick
       * down produced 28 events wanting the bar contracted, immediately
       * followed by 7 wanting it expanded — so the bar contracted and then
       * sprang straight back, every time, and the feature looked like it simply
       * did not work.
       *
       * The 7 were the RUBBER BAND. iOS lets a list travel past its own end and
       * then settles it back, and that settle is genuine upward movement of
       * tens of points — far more than the hysteresis is meant to absorb. Read
       * as intent it means "the user is scrolling up", and it is nothing of the
       * kind: the user's finger has already left the screen and the list is
       * returning to where it was always going to stop.
       *
       * The distinction is not how FAST the movement is or how far, so no
       * threshold could have caught it. It is WHERE it is happening — beyond
       * the content's own bounds — which the scroll event tells us outright.
       */
      const maxY = Math.max(0, contentSize.height - layoutMeasurement.height);
      if (y < 0 || y > maxY) return;

      // Sign change resets the run. Without this, a long scroll down banks
      // enough travel that a short flick back up cannot spend it, and the bar
      // stays contracted while the user is visibly scrolling towards the top.
      travel.current = Math.sign(dy) === Math.sign(travel.current) ? travel.current + dy : dy;

      const want =
        y <= scrollEdge.hideAfter ? 0
        : travel.current > scrollEdge.hysteresis ? 1
        : travel.current < -scrollEdge.hysteresis ? 0
        : null;

      /**
       * Compared against the JS-side value, which during a running spring is
       * the last value JS itself wrote rather than the live animated one. That
       * is exactly what is wanted here: the question is "have I already asked
       * for this state", not "has it arrived yet".
       */
      if (want == null || chrome.collapsed.get() === want) return;
      travel.current = 0;
      chrome.collapsed.set(withSpring(want, motion.lead));
    },
    [chrome, reduced]
  );

  /**
   * ONE SIGNAL SHARED BY FOUR SCREENS MEANS IT CAN BE ABOUT THE WRONG ONE.
   *
   * Tab screens stay mounted, so `y` keeps whatever the last-scrolled tab left
   * in it. Switching from a Today scrolled halfway down to a To-do sitting at
   * the top would show To-do with a fully blurred edge over nothing, until the
   * first scroll there corrected it.
   *
   * `last` is per-screen — this hook is called once per screen — so the fix is
   * for the arriving screen to re-assert its own offset. The chrome is also
   * expanded on arrival regardless: a tab you have just switched to should show
   * you its navigation, not inherit a contracted bar from the one you left.
   */
  useFocusEffect(
    useCallback(() => {
      if (!chrome) return;
      chrome.y.set(last.current);
      travel.current = 0;
      chrome.collapsed.set(reduced ? 0 : withSpring(0, motion.lead));
    }, [chrome, reduced])
  );

  return { onScroll, scrollEventThrottle: 16 };
}

/** For the chrome itself. Returns null outside a provider, so a screen that is
 *  not inside the tabs navigator simply renders static chrome. */
export function useChrome(): Chrome | null {
  return useContext(ChromeContext);
}

/**
 * Puts the chrome back on screen.
 *
 * ── WHY THIS IS NOT ONLY `useChromeScroll`'S JOB ───────────────────────────
 * `collapsed` is shared, and only screens that SCROLL ever set it back to 0 —
 * so anything that leaves the app showing content it cannot scroll strands a
 * contracted bar with no way to restore it. Two ways to reach that, both easy:
 *
 *   - Switch to a tab that does not scroll. Focus never calls
 *     `useChromeScroll` at all, so it inherits whatever the previous tab left
 *     and the bar simply stays shrunk for the whole session.
 *   - Page Today to an empty day. The empty branch renders no list, and a date
 *     change is not a navigation focus change, so nothing fires.
 *
 * Both are the same defect — the value outliving the screen that set it — so
 * this is one function, called wherever a screen knows there is nothing to
 * scroll. It is idempotent and safe to call on every render pass.
 */
export function useChromeReset(): () => void {
  const chrome = useContext(ChromeContext);
  const reduced = useReducedMotion();
  return useCallback(() => {
    if (!chrome) return;
    chrome.y.set(0);
    chrome.collapsed.set(reduced ? 0 : withSpring(0, motion.lead));
  }, [chrome, reduced]);
}

export function ChromeProvider({ children }: { children: ReactNode }) {
  const y = useSharedValue(0);
  const collapsed = useSharedValue(0);
  const value = useMemo(() => ({ y, collapsed }), [y, collapsed]);
  return <ChromeContext.Provider value={value}>{children}</ChromeContext.Provider>;
}
