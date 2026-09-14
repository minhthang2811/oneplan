import { useEffect, useRef, useState } from 'react';
import { View, type TextLayoutLine } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withTiming, withDelay, useReducedMotion,
  interpolate, Extrapolation,
} from 'react-native-reanimated';
import { Txt, type TxtProps } from './Txt';
import { EASE } from './Press';
import { useTheme } from '../theme/useTheme';

/**
 * A title that gets struck through when its task is completed, with the line
 * DRAWN rather than switched on.
 *
 * ── WHY NOT `textDecorationLine` ───────────────────────────────────────────
 * Because it cannot be animated. It is a native text attribute, not a style
 * property with a numeric value, so it is either there or it is not — and the
 * instant it appears is the one frame where the completion reads as the app
 * changing its mind rather than as a mark being made. Drawing the line is the
 * text-side half of the same idea as the checkbox's stroked tick.
 *
 * ── WHY IT MEASURES ────────────────────────────────────────────────────────
 * A single absolutely-positioned rule across the middle of the block is the
 * obvious implementation, and it is wrong here: task titles wrap to two lines,
 * and one rule across a two-line block strikes the gap between them and nothing
 * else. So this listens to `onTextLayout`, which hands back the real rect of
 * every laid-out line, and draws one rule per line.
 *
 * The rules are staggered, so a wrapped title is struck the way it is read —
 * first line, then second — instead of both being wiped at once.
 *
 * Line placement is `ascender - xHeight / 2`: the midpoint of the lowercase
 * letters, which is where a struck-out line belongs. Falling back to half the
 * line box is noticeably too low, so it is only the last resort for a platform
 * that reports the metrics as zero.
 */
export function Strike({
  struck,
  identity,
  children,
  ...txt
}: TxtProps & {
  struck: boolean;
  /** See `Checkbox` — a recycled row must not replay the draw. */
  identity?: string;
  children: React.ReactNode;
}) {
  const { c } = useTheme();
  const reduced = useReducedMotion();
  const [lines, setLines] = useState<TextLayoutLine[]>([]);

  const t = useSharedValue(struck ? 1 : 0);
  const prev = useRef({ identity, struck });

  useEffect(() => {
    const sameItem = prev.current.identity === identity;
    const changed = prev.current.struck !== struck;
    prev.current = { identity, struck };

    // Same reasoning as the checkbox: only the item you actually completed gets
    // the draw. A recycled row arrives already struck.
    if (!sameItem || !changed || reduced) {
      t.set(struck ? 1 : 0);
      return;
    }
    t.set(
      withTiming(struck ? 1 : 0, {
        // Unstriking is faster and is not a performance — undoing is a
        // correction, and the line should simply get out of the way.
        duration: struck ? 260 : 140,
        easing: EASE,
      })
    );
  }, [struck, identity, reduced, t]);

  return (
    /**
     * A PLAIN, FULL-WIDTH wrapper — deliberately not `alignSelf: 'flex-start'`.
     *
     * Shrink-wrapping looks like the obvious way to make the rules match the
     * text, and it is both unnecessary and actively wrong. Unnecessary because
     * `onTextLayout` already reports each line's own `x` and `width` within the
     * text frame, so a centred line is measured where it is actually drawn.
     * Wrong because `alignSelf` on the child beats `alignItems` on the parent,
     * so a shrink-wrapped `Strike` silently refuses to be centred by whatever
     * contains it — which is exactly what the task detail hero asks for.
     */
    <View
      /**
       * `flexShrink: 1` is what makes this behave like the bare `<Text>` it
       * replaced. Yoga measures a Text and lets it shrink to the space left in
       * a row; a View defaults to `flexShrink: 0` and takes its content's full
       * natural width instead, so a long step title pushed straight past the
       * right edge of its row and `numberOfLines` never got a constrained width
       * to wrap against. Fixed here rather than at the call sites because every
       * caller wants it — the row ones need it and the column ones are
       * unaffected by it.
       */
      style={{ flexShrink: 1 }}
    >
      <Txt
        {...txt}
        tone={struck ? 'faint' : txt.tone}
        /**
         * Committed only when the GEOMETRY actually changed, not on every
         * layout event. `onTextLayout` hands back a fresh array each time, so
         * storing it unconditionally re-renders on every fire — which for a
         * recycled FlashList row is an extra render per recycle, and which
         * would loop outright if a re-render ever caused a re-layout.
         */
        onTextLayout={(e) => {
          const next = e.nativeEvent.lines;
          setLines((prev) =>
            prev.length === next.length &&
            prev.every((l, i) => same(l, next[i]))
              ? prev
              : next
          );
        }}
      >
        {children}
      </Txt>

      {lines.map((ln, i) => (
        <Rule key={i} line={ln} index={i} count={lines.length} t={t} color={c.inkFaint} />
      ))}
    </View>
  );
}

/**
 * Two laid-out lines are the same for our purposes only if EVERY value we draw
 * from is unchanged. Comparing position and width alone was not enough: the
 * rule's height on the line comes from `ascender` and `xHeight`, so a relayout
 * that moved only the font metrics — a font resolving after first paint, a
 * Dynamic Type change that happens not to reflow — was discarded as identical
 * and left the rule struck at the old baseline.
 */
function same(a: TextLayoutLine, b: TextLayoutLine) {
  return (
    a.x === b.x &&
    a.y === b.y &&
    a.width === b.width &&
    a.height === b.height &&
    a.ascender === b.ascender &&
    a.xHeight === b.xHeight
  );
}

function Rule({
  line, index, count, t, color,
}: {
  line: TextLayoutLine;
  index: number;
  count: number;
  t: ReturnType<typeof useSharedValue<number>>;
  color: string;
}) {
  /** Each line owns an equal slice of the progress, in reading order. */
  const from = index / count;
  const to = (index + 1) / count;

  const anim = useAnimatedStyle(() => {
    const v = interpolate(t.get(), [from, to], [0, 1], Extrapolation.CLAMP);
    return { transform: [{ scaleX: v }], opacity: v > 0 ? 1 : 0 };
  });

  const mid =
    line.xHeight && line.ascender
      ? line.ascender - line.xHeight / 2
      : line.height / 2;

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: 'absolute',
          left: line.x,
          top: line.y + mid,
          width: line.width,
          height: 1.4,
          borderRadius: 1,
          backgroundColor: color,
          // Grows from the start of the line, like a pen. Without this it would
          // expand from the middle outwards, which is a wipe, not a stroke.
          transformOrigin: 'left',
        },
        anim,
      ]}
    />
  );
}
