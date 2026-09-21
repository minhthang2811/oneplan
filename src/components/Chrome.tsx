import { createContext, useCallback, useContext, useMemo, useRef, type ReactNode } from 'react';
import type { NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useSharedValue, type SharedValue } from 'react-native-reanimated';

/**
 * ONE SCROLL SIGNAL, SHARED BY EVERY PIECE OF FLOATING CHROME.
 *
 * The blurred edge at the top of a screen needs to know how far that screen has
 * scrolled, and it is rendered inside whichever screen is showing while the
 * thing it has to agree with — the floating tab bar — is rendered by the `Tabs`
 * navigator above all of them. Hoisting the offset to the navigator means a
 * screen attaches ONE handler and every piece of chrome reads the same number.
 *
 * ── WHY A SHARED VALUE AND NOT STATE ───────────────────────────────────────
 * Because this updates at 60Hz and drives animation, not layout. React state
 * here would re-render every tab screen on every scroll frame. A shared value
 * crosses to the UI thread once and is read by worklets, so a scroll costs one
 * assignment and no renders at all.
 *
 * ── WHAT THIS DELIBERATELY NO LONGER CARRIES ───────────────────────────────
 * It used to carry a second value, `collapsed`, which shrank the tab bar as you
 * scrolled into content and sprang it back as you scrolled towards the top —
 * iOS 26's own tab bar behaviour, with hysteresis and overscroll detection to
 * keep it from flickering.
 *
 * It is gone, and the removal is the point rather than a simplification. The
 * behaviour is right for a bar whose screen is a long feed you swim through;
 * Today is a single day that fits in one or two screenfuls, so the bar's whole
 * contribution was to shrink itself just as the user reached the bottom of a
 * short list and then bounce back as they scrolled up again. Chrome that
 * changes size on a screen you can see the end of reads as instability, not as
 * deference — so the bar is now one fixed size, always, and the only thing that
 * responds to scrolling is the legibility blur at the top, which is an effect
 * on the CONTENT rather than a change to the navigation.
 *
 * Everything that machinery needed went with it: the direction hysteresis, the
 * overscroll test that stopped the rubber band at the end of a list being read
 * as "scrolling up", and the spring. What is left is one assignment.
 */
export type Chrome = {
  /** Live scroll offset of the active screen, in points. */
  y: SharedValue<number>;
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
 * is the only JS-thread work in the whole effect: everything that READS this
 * value is a worklet, so the blur still animates on the UI thread even while JS
 * is busy. A dropped JS frame costs one frame of lag on a fade, which is
 * invisible; it would be unacceptable if this tracked the finger 1:1, and it
 * does not.
 */
export function useChromeScroll(): {
  onScroll: (e: NativeSyntheticEvent<NativeScrollEvent>) => void;
  scrollEventThrottle: number;
} {
  const chrome = useContext(ChromeContext);
  const last = useRef(0);

  const onScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (!chrome) return;
      const y = e.nativeEvent.contentOffset.y;
      last.current = y;
      chrome.y.set(y);
    },
    [chrome]
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
   * for the arriving screen to re-assert its own offset.
   */
  useFocusEffect(
    useCallback(() => {
      chrome?.y.set(last.current);
    }, [chrome])
  );

  return { onScroll, scrollEventThrottle: 16 };
}

/** For the chrome itself. Returns null outside a provider, so a screen that is
 *  not inside the tabs navigator simply renders static chrome. */
export function useChrome(): Chrome | null {
  return useContext(ChromeContext);
}

/**
 * Declares that there is nothing to scroll.
 *
 * `y` is shared, and only screens that SCROLL ever put it back — so a screen
 * showing content with no list strands the previous screen's offset, and with
 * it a blurred edge sitting over nothing. The way to reach that is ordinary:
 * page Today to an empty day, and the empty branch renders no list at all
 * while a date change is not a navigation focus change, so nothing fires.
 *
 * Idempotent and safe to call on every render pass.
 */
export function useChromeReset(): () => void {
  const chrome = useContext(ChromeContext);
  return useCallback(() => { chrome?.y.set(0); }, [chrome]);
}

export function ChromeProvider({ children }: { children: ReactNode }) {
  const y = useSharedValue(0);
  const value = useMemo(() => ({ y }), [y]);
  return <ChromeContext.Provider value={value}>{children}</ChromeContext.Provider>;
}
