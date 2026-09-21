import { useEffect, useState } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue, useAnimatedStyle, useDerivedValue, withSpring,
  runOnJS, useReducedMotion, interpolate, Extrapolation,
  type SharedValue,
} from 'react-native-reanimated';
/**
 * Structural type over only what this bar touches. Expo Router vendors
 * React Navigation under `build/`, and deep-importing that path breaks on
 * patch releases — three fields is a cheaper contract than a fragile import.
 */
export type TabBarProps = {
  state: { index: number; routes: Array<{ key: string; name: string }> };
  navigation: {
    // Returns React Navigation's EventArg. Typed as `unknown` and narrowed at
    // the call site so this structural type stays assignable from the real one.
    emit: (e: { type: 'tabPress' | 'tabLongPress'; target: string; canPreventDefault?: boolean }) => unknown;
    navigate: (name: string) => void;
  };
};
import type { SymbolViewProps } from 'expo-symbols';
import { Txt } from './Txt';
import { Icon } from './Icon';
import { CalendarDayIcon } from './CalendarDayIcon';
import { GlassPanel, LIQUID_GLASS } from './Glass';
import { useT, type TKey } from '../i18n';
import { GelSurface, gelInsetShadow } from './Gel';
import { useTheme } from '../theme/useTheme';
import { motion, radius, space } from '../theme/tokens';
import { haptic } from '../lib/haptics';
import { useToday } from '../lib/useTodayKey';
import { parseKey } from '../lib/time';

export const TAB_BAR_HEIGHT = 64;

const BAR_PAD = 6;
const CHIP_INSET = 4;
const CHIP_HEIGHT = TAB_BAR_HEIGHT - 14;

/** How far the finger must travel sideways before the bar claims the gesture.
 *  Below this it is still a tap, and the tab still activates on release. */
const DRAG_SLOP = 10;

const ICONS: Record<string, SymbolViewProps['name']> = {
  todo: 'checkmark.square',
  focus: 'timer',
  me: 'face.smiling',
};

/**
 * Route name -> translation key. The KEY is what is stable; the word is not.
 * A route whose name is not listed falls back to the raw route name, which is
 * only ever reachable by adding a tab file and forgetting to add it here.
 */
const LABELS: Record<string, TKey> = {
  todo: 'tabs.todo', today: 'tabs.today', focus: 'tabs.focus', me: 'tabs.me',
};

/**
 * A floating pane of gel rather than the system tab bar: it is the single most
 * recognisable piece of this product's chrome. It is still the real Tabs
 * navigator underneath — each tab keeps its own stack and re-tapping the active
 * tab pops it to root, because we emit `tabPress` properly.
 *
 * ── THE LIQUID INDICATOR ───────────────────────────────────────────────────
 * The selection chip is a METABALL: a blob of liquid that stretches as it
 * leaves one tab, thins in the middle, and pulls itself back together as it
 * arrives at the next.
 *
 * It is built from TWO SPRINGS ON ONE TARGET rather than from a gooey filter.
 * `lead` is loose and runs ahead; `trail` is tight and lags. The chip is drawn
 * spanning the gap between them, so the distance between the two springs *is*
 * the stretch — it appears on the way out and vanishes on arrival for free,
 * with no keyframes and nothing to keep in sync.
 *
 * THE REAL FILTER WAS BUILT AND MEASURED, AND IT IS REJECTED ON FRAME TIME.
 *
 * The textbook metaball is `feGaussianBlur` plus an `feColorMatrix` that hard-
 * contrasts the alpha channel, and react-native-svg 15.15.4 ships all of it.
 * The obvious objection — that the threshold maths needs near-opaque shapes,
 * while this chip is `rgba(255,255,255,0.13)` in dark — turns out to be WRONG,
 * and it is worth recording that it is wrong so nobody re-derives it. Putting
 * OPAQUE blobs in a group, filtering the group, and applying the translucency
 * to the group's own `opacity` gives the filter a clean alpha channel to
 * threshold and still renders translucent:
 *
 *     <G opacity={0.13} filter="url(#goo)"> …opaque white blobs… </G>
 *
 * That was prototyped and it fuses correctly, in both themes.
 *
 * It was rejected because IT CANNOT HOLD A FRAME. Measured on an iPhone 17 Pro
 * Max simulator with `useFrameCallback`, at production geometry and production
 * spring configs, driving a tab change every 700ms:
 *
 *     filter present, nothing moving    60.0 fps   16.67ms mean    0/211 frames >33ms
 *     filter + blobs animating          15.0 fps   66.68ms mean   53/53  frames >33ms
 *     filter present, nothing moving    60.0 fps   16.67ms mean    0/211 frames >33ms
 *
 * The static bookends are the control: both return to exactly 60, so this is
 * not thermal throttling or a warm-up artefact. The cost is precisely the
 * per-frame re-rasterisation of a blurred, colour-matrixed region — a static
 * filter is rasterised once and is free, and an animated one is not. EVERY
 * frame of the transition missed 33ms. That is a quarter of the frame budget
 * on the single most frequent interaction in the app.
 *
 * The two-spring version costs nothing by comparison: `translateX`/`scaleX`/
 * `scaleY` on one view, so it never touches layout and never leaves the UI
 * thread. It holds 60.
 *
 * ── VOLUME ─────────────────────────────────────────────────────────────────
 * Stretching horizontally without thinning vertically reads as a rectangle
 * being scaled. Liquid conserves volume, so `scaleY` comes down as `scaleX`
 * goes up. With `borderRadius: pill` the round ends squash into ellipses as it
 * travels and snap back to circles as it lands, which is the whole tell.
 *
 * ── DRAGGING ───────────────────────────────────────────────────────────────
 * The bar can also be dragged. `lead` is pinned to the finger while `trail`
 * springs after it, so the blob smears behind the drag and catches up whenever
 * you pause. Nothing commits until you let go — switching screens mid-drag
 * would mean four screen transitions for one gesture.
 */
export function TabBar({ state, navigation }: TabBarProps) {
  const { c } = useTheme();
  const { t } = useT();
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  // Live, not read once at mount: the tab bar is the one piece of chrome that
  // is on screen all day, so a calendar glyph frozen at the date the app
  // happened to launch on is wrong for exactly as long as the app stays open.
  const today = parseKey(useToday()).getDate();

  const count = state.routes.length;
  const [row, setRow] = useState(0);
  const itemW = row > 0 ? row / count : 0;
  const chipW = Math.max(0, itemW - CHIP_INSET * 2);

  /**
   * Both springs hold the chip's CENTRE, not its left edge. Centres are what
   * make the geometry below symmetrical: the blob is always drawn between them,
   * whichever way it is travelling.
   */
  const lead = useSharedValue(0);
  const trail = useSharedValue(0);
  /** Pinned while a drag owns the chip, so the commit effect cannot yank it. */
  const dragging = useSharedValue(false);
  /** Which tab the finger is currently over. Held separately from `lead`
   *  because the detent has to compare against the PREVIOUS tab, and `lead` has
   *  already been moved to the finger by the time we would ask it. */
  const hovered = useSharedValue(0);

  const centerOf = (i: number) => itemW * (i + 0.5);

  useEffect(() => {
    if (itemW === 0) return;
    const target = centerOf(state.index);
    // The first layout must not spring in from the left edge, and Reduce Motion
    // keeps the chip but drops the travel — and therefore the stretch, since
    // the stretch only exists while the two springs disagree.
    if (lead.get() === 0 || reduced) {
      lead.set(target);
      trail.set(target);
      return;
    }
    if (dragging.get()) return;
    lead.set(withSpring(target, motion.lead));
    trail.set(withSpring(target, motion.trail));
    // `centerOf` closes over `itemW`, which is in the dep list.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.index, itemW, reduced]);

  /**
   * Where the selection is, in fractional tab units. The icons read this rather
   * than a boolean, so they light up continuously as the blob passes over them
   * instead of snapping at the moment navigation commits.
   */
  const pos = useDerivedValue(() =>
    // Falls back to the LIVE tab index, not to 0. Before the first `onLayout`
    // there is no `itemW` to divide by, and returning 0 told every `TabItem`
    // that the selection was sitting on tab 0 — so on a cold launch into Today
    // the To-do tab drew itself active, in ink and lifted, for a frame.
    itemW > 0 ? (lead.get() + trail.get()) / 2 / itemW - 0.5 : state.index
  );

  /** Springs the blob home to a given tab. Used to undo an optimistic move. */
  const settle = (i: number) => {
    const center = itemW * (i + 0.5);
    lead.set(withSpring(center, motion.lead));
    trail.set(withSpring(center, motion.trail));
  };

  /**
   * Emits `tabPress` and navigates if nothing objected. Returns whether the
   * selection actually moved, which the drag needs and the tap does not.
   */
  const press = (i: number) => {
    const route = state.routes[i];
    if (!route) return false;
    const event = navigation.emit({
      type: 'tabPress', target: route.key, canPreventDefault: true,
    }) as { defaultPrevented?: boolean };
    // Re-pressing the live tab is not a no-op — React Navigation pops that
    // tab's stack to root on the event alone — but it does not move anything.
    if (i === state.index || event?.defaultPrevented) return false;
    navigation.navigate(route.name);
    return true;
  };

  const commit = (i: number) => { press(i); };

  /**
   * The drag's commit, WITH A ROLLBACK.
   *
   * `onEnd` springs the blob to where the finger let go before asking, because
   * waiting a JS round-trip to start moving would read as lag. That optimism
   * needs undoing when the press is refused: a `tabPress` listener can call
   * `preventDefault` — an unsaved-work guard is the usual reason — and then
   * `state.index` never changes, so the repositioning effect (keyed on exactly
   * that) never fires and the blob would sit on a tab that is not live,
   * indefinitely. Taps do not need this because a tap never moves the blob
   * itself; only that effect does.
   */
  const commitDrag = (i: number) => {
    if (!press(i)) settle(state.index);
  };

  /**
   * Fires while dragging, each time the finger crosses into a new tab. The
   * detent is what makes a drag feel like it has stops in it rather than like
   * a slider — same reason the focus dial ticks every five minutes.
   */
  const detent = () => haptic.tick();

  const pan = Gesture.Pan()
    // Below the slop this is still a tap, and the Pressables underneath keep it.
    .activeOffsetX([-DRAG_SLOP, DRAG_SLOP])
    .failOffsetY([-18, 18])
    .enabled(itemW > 0)
    .onStart(() => {
      dragging.set(true);
      hovered.set(state.index);
    })
    .onUpdate((e) => {
      const half = chipW / 2 + CHIP_INSET;
      const x = Math.min(Math.max(e.x, half), row - half);

      // Compared BEFORE the springs move, or the finger's new tab would be
      // measured against itself and the detent would never fire.
      const over = Math.min(count - 1, Math.max(0, Math.round(x / itemW - 0.5)));
      if (over !== hovered.get()) {
        hovered.set(over);
        runOnJS(detent)();
      }

      // The finger owns the leading edge outright; the trailing edge is still
      // on its spring, which is what smears the blob behind the drag.
      lead.set(x);
      trail.set(reduced ? x : withSpring(x, motion.trail));
    })
    .onEnd((e) => {
      dragging.set(false);
      const half = chipW / 2 + CHIP_INSET;
      const x = Math.min(Math.max(e.x, half), row - half);
      const target = Math.min(count - 1, Math.max(0, Math.round(x / itemW - 0.5)));
      const center = itemW * (target + 0.5);
      lead.set(withSpring(center, motion.lead));
      trail.set(withSpring(center, motion.trail));
      runOnJS(commitDrag)(target);
    })
    .onFinalize(() => {
      dragging.set(false);
    });

  /**
   * The blob. `translateX` places its centre midway between the two springs;
   * `scaleX` opens it out to span them; `scaleY` gives the volume back.
   */
  const chip = useAnimatedStyle(() => {
    // Same property set in both branches. Reanimated does not reset a property
    // that disappears from a returned style, so a branch without `transform`
    // would strand the last translate/scale on the view.
    if (chipW === 0) return { opacity: 0, transform: [] };
    const a = lead.get();
    const b = trail.get();
    const spread = Math.abs(a - b);
    const cx = (a + b) / 2;

    const stretch = (chipW + spread) / chipW;
    // Normalised against one tab's width so the thinning is the same gesture
    // whether there are four tabs on a small phone or on a large one.
    const t = itemW > 0 ? Math.min(spread / itemW, 1) : 0;

    return {
      opacity: 1,
      transform: [
        { translateX: cx - chipW / 2 },
        { scaleX: stretch },
        { scaleY: interpolate(t, [0, 1], [1, 0.78], Extrapolation.CLAMP) },
      ],
    };
  });

  /**
   * ── THE BAR IS ONE SIZE, ALWAYS ────────────────────────────────────────
   * This used to contract as you scrolled into content and spring back near
   * the top — iOS 26's own tab bar behaviour, and right for the screens Apple
   * ships it on, which are feeds you swim through. Today is not that. A day
   * fits in a screenful or two, so the only thing the contraction ever did
   * here was shrink the navigation exactly as the user arrived at the bottom
   * of a short list, then bounce it back on the way up. Chrome that changes
   * size on a screen whose end is already in sight reads as instability rather
   * than as deference.
   *
   * So there is no transform on this view at all, and `Chrome` no longer
   * carries the state that drove one. The scroll-driven treatment that
   * remains is the blur at the TOP, which is an effect applied to the content
   * passing under the status bar — legibility, not navigation moving about.
   */
  return (
    <View
      pointerEvents="box-none"
      style={{
        position: 'absolute', left: 0, right: 0, bottom: 0,
        paddingBottom: Math.max(insets.bottom, space.md),
        paddingHorizontal: space.base,
      }}
    >
      <GlassPanel
        radius={radius.pill}
        /**
         * The system deforms the material under the finger — it swells towards
         * the touch and settles back on release.
         *
         * This bar is the one surface in the app that earns it, and the reason
         * is the drag. Everything else that floats here is tapped, and a pane
         * that squirms under a tap reads as instability; this one is a control
         * you put a finger on and PULL, so a material that yields under that
         * finger is telling the truth about what the gesture is doing. It is
         * also the piece of the real material that no amount of painting can
         * reach, which is the whole reason the native path exists.
         */
        interactive
        contentStyle={{ height: TAB_BAR_HEIGHT, paddingHorizontal: BAR_PAD, justifyContent: 'center' }}
      >
        <GestureDetector gesture={pan}>
          <View
            onLayout={(e) => setRow(e.nativeEvent.layout.width)}
            style={{ flexDirection: 'row', alignItems: 'center' }}
          >
            {chipW > 0 ? (
              <Animated.View
                pointerEvents="none"
                style={[
                  {
                    position: 'absolute',
                    left: 0,
                    top: (TAB_BAR_HEIGHT - CHIP_HEIGHT) / 2,
                    width: chipW,
                    height: CHIP_HEIGHT,
                    borderRadius: radius.pill,
                    backgroundColor: c.glassChip,
                    // Same convex rim as the bar, softened — the chip is a
                    // small droplet in a large one, not a slab on a pane.
                    // The inset rim is part of the painted imitation, so it
                    // goes with it — on real glass it would be a second
                    // material fighting the first.
                    boxShadow: LIQUID_GLASS
                      ? undefined
                      : gelInsetShadow(c.glassInnerShade, c.glassSpecular, 0.5),
                  },
                  chip,
                ]}
              >
                {/* The chip is gel too, and because it is a CHILD of the
                    transform its highlight stretches with the blob — the
                    specular smears out as it travels, which is precisely what
                    a highlight on a moving liquid surface does. */}
                <ChipGel w={chipW} h={CHIP_HEIGHT} />
              </Animated.View>
            ) : null}

            {state.routes.map((route, i) => {
              const key = LABELS[route.name];
              const label = key ? t(key) : route.name;

              return (
                <Pressable
                  key={route.key}
                  onPress={() => {
                    if (i === state.index) { commit(i); return; }
                    haptic.tick();
                    commit(i);
                  }}
                  onLongPress={() => navigation.emit({ type: 'tabLongPress', target: route.key })}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: state.index === i }}
                  accessibilityLabel={label}
                  style={{ flex: 1, height: TAB_BAR_HEIGHT, alignItems: 'center', justifyContent: 'center' }}
                >
                  <TabItem name={route.name} label={label} index={i} pos={pos} day={today} />
                </Pressable>
              );
            })}
          </View>
        </GestureDetector>
      </GlassPanel>
    </View>
  );
}

/**
 * The chip's surface.
 *
 * ── NEVER GLASS ON GLASS ───────────────────────────────────────────────────
 * Apple's guidance for Liquid Glass is explicit: when you put something on top
 * of a glass surface, do NOT give it the material as well. Two stacked glass
 * layers read as clutter, because each one is trying to refract the other. What
 * goes on top should be a fill, transparency or vibrancy — a thin overlay that
 * belongs to the material underneath rather than a second object sitting on it.
 *
 * So on the native path this renders NOTHING. The chip is a plain translucent
 * fill and the real glass beneath does all the optical work — which is also
 * exactly what Apple's own bars look like: Photos and News both use a simple
 * filled capsule behind the active tab, not a second pane.
 *
 * ── THE FALLBACK ───────────────────────────────────────────────────────────
 * Where there is no real glass, the bar is our painted gel, and the chip has to
 * carry its own convexity or it reads as a flat swatch stuck on a curved pane.
 * It uses the same `GelSurface` at lower strength, because it sits on the bar
 * and already has the bar's lighting behind it.
 *
 * That surface is rasterised once and then moved by a transform on its parent,
 * so the specular smears as the blob stretches — what a highlight on moving
 * liquid actually does — and it costs nothing per frame.
 */
function ChipGel({ w, h }: { w: number; h: number }) {
  if (LIQUID_GLASS) return null;
  return <GelSurface w={w} h={h} radius={h / 2} strength={0.72} />;
}

/**
 * One tab.
 *
 * The active and inactive treatments are rendered as TWO COMPLETE COPIES and
 * cross-faded by how close the blob is, rather than swapped on a boolean. That
 * is what lets a drag light the icons up progressively as the liquid passes
 * over them — with a boolean the icons would sit dead until the finger lifted,
 * and the drag would feel like it was moving a decoration rather than a
 * selection.
 *
 * Two copies rather than an animated colour because both the SF Symbol's
 * `tintColor` and the label's colour are native props, not style properties;
 * animating either from the UI thread means an animated-props bridge per glyph,
 * where an opacity cross-fade of identical geometry is one compositor op.
 *
 * Active stays `ink`, not accent: on a translucent chip the accent loses the
 * contrast it holds on an opaque surface, and the chip already carries the
 * selection.
 */
function TabItem({
  name, label, index, pos, day,
}: {
  name: string;
  label: string;
  index: number;
  pos: SharedValue<number>;
  day: number;
}) {
  const { c } = useTheme();

  /** 1 when the blob is centred here, 0 once it is a whole tab away. Squared so
   *  the handover happens near the middle rather than smearing across both. */
  const nearness = useDerivedValue(() => {
    const d = Math.min(Math.abs(pos.get() - index), 1);
    return (1 - d) * (1 - d);
  });

  const onStyle = useAnimatedStyle(() => ({ opacity: nearness.get() }));
  const offStyle = useAnimatedStyle(() => ({ opacity: 1 - nearness.get() }));
  /**
   * The lift. A single glyph rising ~5% as its tab takes the selection — enough
   * to confirm the tap landed here, small enough to survive being seen a
   * hundred times a day. Driven by the same nearness, so it also tracks a drag.
   */
  const liftStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + 0.06 * nearness.get() }],
  }));

  return (
    /**
     * HIDDEN FROM ASSISTIVE TECHNOLOGY, BOTH COPIES.
     *
     * The tab's meaning is carried by the parent `Pressable`, which has the
     * role, the label and the selected state. These two are a rendering
     * device: the same glyph and word drawn twice and cross-faded so a drag can
     * light them up progressively. iOS happens to collapse them anyway, because
     * a view with a role and a label swallows its descendants — but Android
     * does not, and TalkBack would read "To-do, To-do". Opacity is not a
     * visibility signal to a screen reader, so the 0-opacity copy is just as
     * present as the other one; saying so explicitly beats relying on one
     * platform's collapsing behaviour.
     */
    <Animated.View
      style={liftStyle}
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Animated.View style={offStyle}>
        <Face name={name} label={label} day={day} color={c.inkFaint} weight="regular" />
      </Animated.View>
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          { alignItems: 'center', justifyContent: 'center' },
          onStyle,
        ]}
      >
        <Face name={name} label={label} day={day} color={c.ink} weight="semibold" />
      </Animated.View>
    </Animated.View>
  );
}

function Face({
  name, label, day, color, weight,
}: {
  name: string;
  label: string;
  day: number;
  color: string;
  weight: SymbolViewProps['weight'];
}) {
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', gap: 3 }}>
      {name === 'today' ? (
        <CalendarDayIcon size={21} color={color} day={day} />
      ) : (
        <Icon name={ICONS[name] ?? 'circle'} size={21} color={color} weight={weight} />
      )}
      <Txt
        variant="micro"
        color={color}
        allowFontScaling={false}
        numberOfLines={1}
        style={{ letterSpacing: 0.1, fontSize: 10 }}
      >
        {label}
      </Txt>
    </View>
  );
}
