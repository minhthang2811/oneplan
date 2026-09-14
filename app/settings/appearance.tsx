import { View, Pressable, StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming, useReducedMotion } from 'react-native-reanimated';
import { useEffect } from 'react';
import { Txt } from '../../src/components/Txt';
import { Icon } from '../../src/components/Icon';
import { SettingsScreen, Section, ChoiceRow } from '../../src/components/Settings';
import { useTheme } from '../../src/theme/useTheme';
import { palette, radius, space, motion, type Colors } from '../../src/theme/tokens';
import { usePlanStore } from '../../src/store/usePlanStore';
import { haptic } from '../../src/lib/haptics';
import type { AppearancePref } from '../../src/store/types';

const OPTIONS: Array<{ key: AppearancePref; label: string; hint: string; icon: Parameters<typeof Icon>[0]['name'] }> = [
  { key: 'system', label: 'System', hint: 'Follows your device', icon: 'circle.lefthalf.filled' },
  { key: 'light', label: 'Light', hint: 'Always light', icon: 'sun.max' },
  { key: 'dark', label: 'Dark', hint: 'Always dark', icon: 'moon' },
];

export default function Appearance() {
  const pref = usePlanStore((s) => s.profile.appearance);
  const setAppearance = usePlanStore((s) => s.setAppearance);

  return (
    <SettingsScreen
      title="Appearance"
      subtitle="Oneplan follows your device by default. Pick a side if you would rather it did not change on you."
    >
      {/*
        THE PREVIEWS ARE DRAWN FROM THE REAL PALETTE, not from screenshots.

        A screenshot of a theme goes stale the first time a token changes, and
        it goes stale silently — the picker keeps showing the old colours while
        the app shows the new ones, and nobody notices until someone compares.
        These read `palette.light` and `palette.dark` directly, so the preview
        is not a picture OF the theme, it IS the theme, at 1/6 scale.
      */}
      <View style={{ flexDirection: 'row', gap: space.md }}>
        {OPTIONS.map((o) => (
          <ThemeCard
            key={o.key}
            option={o}
            selected={pref === o.key}
            onPress={() => { haptic.tap(); setAppearance(o.key); }}
          />
        ))}
      </View>

      {/*
        The same three choices AGAIN, as a plain list.

        Not redundancy — the cards carry the information in colour and layout,
        which is exactly the encoding that does not survive VoiceOver, a
        colour-vision difference, or a glance at 300% Dynamic Type. The rows
        carry it in words and a role. Either one alone would leave somebody
        guessing, and the cards are the reason the rows can stay this quiet.
      */}
      <Section title="Theme">
        {OPTIONS.map((o, i) => (
          <ChoiceRow
            key={o.key}
            icon={o.icon}
            label={o.label}
            hint={o.hint}
            first={i === 0}
            selected={pref === o.key}
            onPress={() => setAppearance(o.key)}
          />
        ))}
      </Section>
    </SettingsScreen>
  );
}

/**
 * One tappable preview.
 *
 * The selection ring springs in rather than appearing, for the same reason
 * every other commit in this app does: a state change you can watch land is
 * confirmation that the tap was received, and this particular tap also
 * repaints the entire screen underneath it — so without the ring's own motion
 * there is no way to tell "I chose dark" from "the app glitched".
 */
function ThemeCard({
  option, selected, onPress,
}: {
  option: (typeof OPTIONS)[number];
  selected: boolean;
  onPress: () => void;
}) {
  const { c } = useTheme();
  const reduced = useReducedMotion();
  const v = useSharedValue(selected ? 1 : 0);

  useEffect(() => {
    v.set(
      reduced
        ? withTiming(selected ? 1 : 0, { duration: motion.exit })
        : withSpring(selected ? 1 : 0, motion.release)
    );
  }, [selected, reduced, v]);

  const ring = useAnimatedStyle(() => ({
    opacity: v.get(),
    transform: reduced ? [] : [{ scale: 0.94 + 0.06 * v.get() }],
  }));

  const dot = useAnimatedStyle(() => ({
    opacity: v.get(),
    transform: reduced ? [] : [{ scale: 0.4 + 0.6 * v.get() }],
  }));

  return (
    <Pressable
      onPress={onPress}
      accessible={false}
      // The list below carries the semantics — see the note on the screen. A
      // second focusable copy of the same three choices would make a screen
      // reader read the whole picker twice.
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ flex: 1, gap: space.sm, alignItems: 'center' }}
    >
      <View
        style={{
          width: '100%', aspectRatio: 0.62,
          borderRadius: radius.card, borderCurve: 'continuous',
          overflow: 'hidden',
          /**
           * The frame needs its own edge. A light preview on the light canvas
           * is the SAME COLOUR as the screen behind it — `canvas` is `canvas` —
           * so without a hairline the Light card has no boundary at all and
           * reads as loose bars floating on the page rather than as a phone.
           */
          borderWidth: StyleSheet.hairlineWidth, borderColor: c.hairline,
          backgroundColor: c.surfaceSunken,
        }}
      >
        {option.key === 'system' ? (
          <View style={{ flex: 1 }}>
            {/*
              ONE full-width preview, with the dark one CLIPPED over its right
              half — not two half-width previews side by side.
              
              The distinction is the whole thing: two halves each lay out their
              own content to their own width, so the rows, the title and the tab
              bar all land at different places on the two sides and the split
              reads as two different screens rather than as one screen lit two
              ways. Here both sides are the same layout at the same size, and
              only the palette changes across the seam.
              
              The inner view is `width: '200%'` of the clipping half — exactly
              the card's width — pinned to `right: 0`, so its left edge lands on
              the card's left edge with no negative margins to get wrong.
            */}
            <MiniApp c={palette.light} />
            <View
              style={{
                position: 'absolute', top: 0, bottom: 0, right: 0,
                width: '50%', overflow: 'hidden',
              }}
            >
              <View style={{ position: 'absolute', top: 0, bottom: 0, right: 0, width: '200%' }}>
                <MiniApp c={palette.dark} />
              </View>
            </View>
          </View>
        ) : (
          <MiniApp c={option.key === 'dark' ? palette.dark : palette.light} />
        )}

        <Animated.View
          pointerEvents="none"
          style={[
            {
              ...{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
              borderRadius: radius.card, borderCurve: 'continuous',
              borderWidth: 2.5, borderColor: c.accent,
            },
            ring,
          ]}
        />
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
        <Animated.View style={dot}>
          <Icon name="checkmark.circle.fill" size={13} color={c.accent} weight="semibold" />
        </Animated.View>
        <Txt variant="captionStrong" tone={selected ? 'ink' : 'muted'}>{option.label}</Txt>
      </View>
    </Pressable>
  );
}

/**
 * A Today screen at 1/6 scale: canvas, a slot chip, three task rows.
 *
 * Deliberately built from the same tokens the real screen uses rather than
 * from a fixed set of greys — `canvas`, `surface`, `ink`, `hairline`, `accent`
 * — so that the difference a viewer sees between the two cards is precisely
 * the difference they will get.
 */
function MiniApp({ c }: { c: Colors }) {
  return (
    <View style={{ flex: 1, backgroundColor: c.canvas, padding: 7, gap: 5 }}>
      <View style={{ height: 7, width: '58%', borderRadius: 3, backgroundColor: c.ink }} />
      <View style={{ height: 4, width: '38%', borderRadius: 2, backgroundColor: c.inkFaint }} />
      <View style={{ height: 6, width: '46%', borderRadius: 3, backgroundColor: c.accentSoft, marginTop: 2 }} />
      {[0.92, 0.8, 0.86].map((w, i) => (
        <View
          key={i}
          style={{
            height: 16, width: `${w * 100}%`, borderRadius: 4,
            backgroundColor: c.surface, borderWidth: 0.5, borderColor: c.hairline,
            flexDirection: 'row', alignItems: 'center', paddingHorizontal: 3, gap: 3,
          }}
        >
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: c.accentSoft }} />
          <View style={{ flex: 1, height: 3, borderRadius: 2, backgroundColor: c.inkFaint }} />
        </View>
      ))}
      <View style={{ flex: 1 }} />
      {/* The floating bar, because it is the app's most recognisable shape and
          the thing most changed by the theme. */}
      <View
        style={{
          height: 13, borderRadius: 7, backgroundColor: c.surfaceRaised,
          borderWidth: 0.5, borderColor: c.glassEdge,
          flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around',
          paddingHorizontal: 4,
        }}
      >
        {[0, 1, 2, 3].map((i) => (
          <View
            key={i}
            style={{
              width: 5, height: 5, borderRadius: 2.5,
              backgroundColor: i === 1 ? c.ink : c.inkFaint,
            }}
          />
        ))}
      </View>
    </View>
  );
}
