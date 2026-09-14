import { useEffect, useId, useState } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue, useAnimatedStyle, useDerivedValue, withSpring,
  runOnJS, useReducedMotion, interpolate, Extrapolation,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
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
import { GlassPanel } from './Glass';
import { useTheme } from '../theme/useTheme';
import { glass, motion, radius, space } from '../theme/tokens';
import { svgStop } from '../theme/svgColor';
import { haptic } from '../lib/haptics';

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

const LABELS: Record<string, string> = {
  todo: 'To-do', today: 'Today', focus: 'Focus', me: 'Me',
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
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const today = new Date().getDate();

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
    itemW > 0 ? (lead.get() + trail.get()) / 2 / itemW - 0.5 : 0
  );

  const commit = (i: number) => {
    const route = state.routes[i];
    if (!route) return;
    const event = navigation.emit({
      type: 'tabPress', target: route.key, canPreventDefault: true,
    }) as { defaultPrevented?: boolean };
    if (i !== state.index && !event?.defaultPrevented) navigation.navigate(route.name);
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
      runOnJS(commit)(target);
    })
    .onFinalize(() => {
      dragging.set(false);
    });

  /**
   * The blob. `translateX` places its centre midway between the two springs;
   * `scaleX` opens it out to span them; `scaleY` gives the volume back.
   */
  const chip = useAnimatedStyle(() => {
    if (chipW === 0) return { opacity: 0 };
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
              const label = LABELS[route.name] ?? route.name;

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
 * The chip's own lighting. Fixed dimensions, so unlike `GlassPanel` it needs no
 * measurement pass — the chip's size is derived from the bar's.
 */
function ChipGel({ w, h }: { w: number; h: number }) {
  const { c } = useTheme();
  const uid = useId().replace(/:/g, '');
  const rx = h / 2;
  // Separated, because react-native-svg drops an `rgba()` stop's alpha — see
  // `svgColor.ts`.
  const sheen = svgStop(c.glassChipSheen);

  return (
    <Svg width={w} height={h} style={StyleSheet.absoluteFill} pointerEvents="none">
      <Defs>
        <LinearGradient id={`chip${uid}`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={sheen.stopColor} stopOpacity={sheen.stopOpacity} />
          <Stop offset={glass.sheenStop} stopColor={sheen.stopColor} stopOpacity={0} />
        </LinearGradient>
      </Defs>
      <Rect x={0} y={0} width={w} height={h} rx={rx} ry={rx} fill={`url(#chip${uid})`} />
    </Svg>
  );
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
    <Animated.View style={liftStyle}>
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
