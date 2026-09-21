import { useEffect, type ReactNode } from 'react';
import { View, ActivityIndicator } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withSpring, withTiming,
  interpolateColor, useReducedMotion,
} from 'react-native-reanimated';
import { Txt } from './Txt';
import { Icon } from './Icon';
import { EmojiAvatar } from './EmojiAvatar';
import { PressScale } from './Press';
import { useTheme } from '../theme/useTheme';
import { motion, radius, space, type TintName } from '../theme/tokens';
import type { SymbolViewProps } from 'expo-symbols';

type Variant = 'solid' | 'soft' | 'ghost' | 'outline';

export function Button({
  label, onPress, variant = 'solid', icon, trailingIcon, disabled, loading, fullWidth = true,
}: {
  label: string;
  onPress: () => void;
  variant?: Variant;
  icon?: SymbolViewProps['name'];
  trailingIcon?: SymbolViewProps['name'];
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
}) {
  const { c } = useTheme();

  const skin: Record<Variant, { bg: string; fg: string; border?: string }> = {
    solid:   { bg: c.solid, fg: c.onSolid },
    soft:    { bg: c.accentSoft, fg: c.accentInk },
    ghost:   { bg: 'transparent', fg: c.ink },
    outline: { bg: 'transparent', fg: c.ink, border: c.hairline },
  };
  const s = skin[variant];
  const off = disabled || loading;

  return (
    <PressScale
      onPress={onPress}
      disabled={off}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!off, busy: !!loading }}
      style={{
        height: 54,
        alignSelf: fullWidth ? 'stretch' : 'flex-start',
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        gap: space.sm, paddingHorizontal: space.xl,
        borderRadius: radius.pill,
        backgroundColor: s.bg,
        borderWidth: s.border ? 1.5 : 0,
        borderColor: s.border,
        opacity: off ? 0.45 : 1,
      }}
    >
      {loading ? (
        <ActivityIndicator color={s.fg} />
      ) : (
        <>
          {icon ? <Icon name={icon} size={17} color={s.fg} weight="semibold" /> : null}
          <Txt variant="title" color={s.fg}>{label}</Txt>
          {trailingIcon ? <Icon name={trailingIcon} size={15} color={s.fg} weight="semibold" /> : null}
        </>
      )}
    </PressScale>
  );
}

/**
 * How tall an answer may stretch when it is filling a screen.
 *
 * There has to be a ceiling, and it is lower than it looks like it should be.
 * A three-option question given the whole column would make each row 180pt
 * tall, and a card whose content sits in the middle of that much air reads as
 * a layout bug rather than as generosity — the reference screens all keep their
 * rows in the 56-72pt band and let the leftover be *space*.
 *
 * TWO CEILINGS, BECAUSE A ROW'S CONTENT DECIDES HOW MUCH AIR IT CAN CARRY. A
 * single line of text in a 96pt card is a line of text floating in a box; the
 * same card with a label, a gloss and a larger glyph in it is simply a generous
 * card. So a hinted answer is allowed to be half again as tall, and it also
 * grows its avatar and steps its label up a size to earn that height — which
 * happens to be exactly the screens that have fewer answers, and therefore more
 * column to spend on each one.
 */
const CHOICE_MAX = { plain: 80, hinted: 124 };

/**
 * AN ANSWER TO AN ONBOARDING QUESTION.
 *
 * ── WHAT THE FIRST VERSION GOT WRONG ───────────────────────────────────────
 * It was an outlined pill with the label centred inside it and nothing else: no
 * fill, no glyph, no indicator. At natural height that is merely plain; stretched
 * to fill a phone it reads as an EMPTY INPUT FIELD, because a tall rounded
 * rectangle with a hairline border and centred grey text is what an empty input
 * field looks like. Filling the column made the screen worse, not better — the
 * problem was never the leftover space, it was that the rows had no content in
 * them to fill it with.
 *
 * ── WHAT THE REFERENCE CLASS ACTUALLY DOES ─────────────────────────────────
 * Walking a spread of them — Udemy, Bumble, Strava, Opal, Headway, Deepstash,
 * MyFitnessPal, Alta — four things are near-unanimous, and the old row had none
 * of them:
 *
 *   1. **A filled surface, not an outline.** The answer is an object sitting on
 *      the canvas, not a hole cut in it.
 *   2. **The label is LEFT-ALIGNED.** Centred text in a full-width row has no
 *      edge to start from, so five of them give the eye no column to run down.
 *   3. **A leading glyph.** It is what makes the row read as content and gives
 *      the left edge something to hold.
 *   4. **A trailing selection indicator**, so "which one did I pick" survives
 *      being answered in colour alone.
 *
 * ── WHY EMOJI, GIVEN THE APP'S OWN RULE AGAINST EMOJI AS ICONOGRAPHY ───────
 * Because in this app emoji is not iconography, it is IDENTITY — every activity
 * carries one on a tinted disc, and the very next screens in this flow are the
 * routine chips, which are emoji too. An answer row drawn with SF Symbols here
 * would be the one screen in onboarding speaking a different language from the
 * two either side of it. `EmojiAvatar` is reused outright, so the answer to
 * "what do you need?" is drawn exactly like the activities that answer will
 * produce.
 *
 * The selection treatment is `RoutineChip`'s, deliberately unchanged: the same
 * tint fill, the same accent rim, the same tick. Picking something should look
 * identical on both halves of the flow.
 */
export function ChoiceRow({
  emoji, tint, label, hint, selected, onPress, grow,
}: {
  emoji: string;
  tint: TintName;
  label: string;
  /** A second line, for answers whose label would otherwise need an em-dash. */
  hint?: string;
  selected: boolean;
  onPress: () => void;
  /**
   * Let the row stretch into the space its `OptionList` has to give. The sizing
   * goes on `outerStyle` — the `Pressable` — because `style` lands on the inner
   * animated view, where a `flex` asks a parent that has already been sized to
   * its content. See the note in `Press.tsx`.
   */
  grow?: boolean;
}) {
  const { c, shadow } = useTheme();
  const reduced = useReducedMotion();
  const sel = useSharedValue(selected ? 1 : 0);

  useEffect(() => {
    sel.set(
      reduced
        ? withTiming(selected ? 1 : 0, { duration: motion.exit })
        : withSpring(selected ? 1 : 0, motion.settle)
    );
  }, [selected, reduced, sel]);

  /**
   * COLOUR ANIMATES; THE BORDER'S WIDTH NEVER DOES.
   *
   * The old row went from 1.25 to 2 points on selection, which is a LAYOUT
   * change: the content inside shifted by three quarters of a point the instant
   * you tapped, and with five rows in a column the neighbours nudged with it.
   * A constant width whose colour interpolates costs nothing and does not move
   * anything — the same rule `RoutineChip` already follows.
   */
  const skin = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(sel.get(), [0, 1], [c.surface, c.accentSoft]),
    borderColor: interpolateColor(sel.get(), [0, 1], [c.hairline, c.accent]),
  }));

  const ring = useAnimatedStyle(() => ({
    borderColor: interpolateColor(sel.get(), [0, 1], [c.hairline, c.accent]),
  }));

  /** The disc springs up from the centre rather than fading — the same beat the
   *  checkbox uses, so a completed thing always arrives the same way. */
  const disc = useAnimatedStyle(() => ({
    opacity: sel.get(),
    transform: [{ scale: 0.4 + 0.6 * sel.get() }],
  }));

  return (
    <PressScale
      onPress={onPress}
      scaleTo={0.985}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={hint ? `${label}. ${hint}` : label}
      outerStyle={grow ? { flex: 1, maxHeight: CHOICE_MAX[hint ? 'hinted' : 'plain'] } : undefined}
      style={[
        {
          minHeight: 64,
          flex: grow ? 1 : undefined,
          flexDirection: 'row', alignItems: 'center', gap: space.md,
          paddingHorizontal: space.md, paddingVertical: space.md,
          borderRadius: radius.card, borderCurve: 'continuous',
          borderWidth: 1.5,
          boxShadow: shadow[1],
        },
        skin,
      ]}
    >
      {/* The glyph grows with the card. A 40pt disc adrift in a 124pt row is
          what makes a tall card look like a mistake; scaling it is what makes
          the same height read as deliberate. */}
      <EmojiAvatar emoji={emoji} tint={tint} size={hint ? 52 : 40} />

      <View style={{ flex: 1, gap: 1 }}>
        <Txt variant={hint ? 'title' : 'bodyStrong'} numberOfLines={2}>{label}</Txt>
        {hint ? (
          <Txt variant="caption" tone="muted" numberOfLines={1}>{hint}</Txt>
        ) : null}
      </View>

      {/* The redundant channel. Selection is already carried by the fill and the
          rim, and neither of those survives being described to someone who
          cannot see them — nor, on a row this wide, a glance that lands on the
          right-hand end of it. */}
      <Animated.View
        pointerEvents="none"
        style={[
          {
            width: 22, height: 22, borderRadius: 11, borderWidth: 1.5,
            alignItems: 'center', justifyContent: 'center',
          },
          ring,
        ]}
      >
        <Animated.View
          style={[
            {
              width: 22, height: 22, borderRadius: 11,
              backgroundColor: c.accent,
              alignItems: 'center', justifyContent: 'center',
            },
            disc,
          ]}
        >
          <Icon name="checkmark" size={11} color={c.onAccent} weight="bold" />
        </Animated.View>
      </Animated.View>
    </PressScale>
  );
}

/**
 * THE ANSWERS TO A QUESTION, FILLING THE COLUMN THEY ARE GIVEN.
 *
 * ── THE PROBLEM THIS EXISTS TO FIX ─────────────────────────────────────────
 * The answers used to be a plain stack at their natural height under the
 * question, on a screen with a pinned button at the bottom — so every question
 * ended in a band of empty canvas. Nothing is wrong with any individual element
 * and the screen still reads as unfinished: the eye takes a blank as a signal
 * that something is missing or has not loaded.
 *
 * ── HOW IT DISTRIBUTES, AND WHY THE SLACK NEVER GOES BETWEEN THE ROWS ─────
 * Two mechanisms, in this order:
 *
 *   1. The rows GROW, equally, up to `CHOICE_MAX`. A five-option question has
 *      almost exactly the right amount of content for a phone, so this alone
 *      takes it to within a few points of the button.
 *   2. Anything left after the cap is spent ABOVE AND BELOW the group, never
 *      between the rows.
 *
 * That second rule was learned the expensive way. `space-evenly` was tried
 * first and it is wrong for exactly the case it was meant to rescue: with three
 * options it put ninety points between each row, and three cards ninety points
 * apart stop being a list. They read as three unrelated islands, and the user
 * has to work out for themselves that these are alternatives to one another —
 * which is the one thing the layout is supposed to say for free.
 *
 * Proximity is what groups things, so the gap between rows stays constant and
 * the block is centred in whatever column is left — BIASED UPWARDS. That bias
 * is the last piece and it matters: air above the group sits between a question
 * and its own answers, which is the one place it does damage, while air below
 * it merely separates the list from the button. Perfectly centring three rows
 * put nearly two hundred points between the question and the first thing that
 * answers it, and the two stopped looking related.
 *
 * There is no arrangement in which three rows genuinely fill a 6.9-inch phone.
 * The honest choice is between air in the wrong place and air in the right
 * place, and every reference screen with few answers (Alta, MyFitnessPal,
 * Strava) makes the same one.
 */
export function OptionList({ children }: { children: ReactNode }) {
  return (
    <View
      style={{
        flex: 1, gap: space.md,
        justifyContent: 'center',
        // The upward bias. `center` splits the slack evenly; reserving a band
        // at the bottom moves the group half of it back towards the question.
        paddingBottom: space.huge,
      }}
    >
      {children}
    </View>
  );
}

export function Row({ children, gap = space.sm }: { children: ReactNode; gap?: number }) {
  return <View style={{ flexDirection: 'row', alignItems: 'center', gap }}>{children}</View>;
}
