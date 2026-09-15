import type { ReactNode } from 'react';
import { View, ScrollView, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import type { SymbolViewProps } from 'expo-symbols';
import { Txt } from './Txt';
import { Icon } from './Icon';
import { Rise } from './Rise';
import { CircleButton } from './DayHeader';
import { ScrollEdge, SCROLL_EDGE_BAND } from './ScrollEdge';
import { useChromeScroll } from './Chrome';
import { useTheme } from '../theme/useTheme';
import { radius, space } from '../theme/tokens';
import { haptic } from '../lib/haptics';

/**
 * The shape every pushed settings screen takes.
 *
 * Extracted rather than copied because there are now three of them, and the
 * thing they have to agree on is not the padding — it is the CHROME: the back
 * affordance in the same place, the same large title collapsing into the same
 * blurred edge, the same bottom inset. Three hand-rolled copies of that is
 * three chances for one screen's title to collapse at a different scroll
 * offset from its neighbour's, which reads as sloppiness even when nobody can
 * say why.
 */
export function SettingsScreen({
  title, subtitle, children, action,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  /** Optional trailing control in the header row. */
  action?: ReactNode;
}) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const scroll = useChromeScroll();

  return (
    <View style={{ flex: 1, backgroundColor: c.canvas }}>
      <ScrollView
        {...scroll}
        // `never`, because the band above is doing this job by hand and the
        // automatic inset would add a second one on top of it.
        contentInsetAdjustmentBehavior="never"
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          paddingHorizontal: space.lg,
          // Clears the pinned band, so the large title starts BELOW the back
          // button rather than behind it.
          paddingTop: insets.top + SCROLL_EDGE_BAND + space.xs,
          paddingBottom: insets.bottom + space.huge,
          gap: space.xl,
        }}
      >
        <View style={{ gap: space.base }}>
          {/* Two beats overlapping the tail of the platform push, so the screen
              assembles as it lands rather than sliding in already finished. */}
          <Rise delay={60}>
            <Txt variant="displayLg">{title}</Txt>
          </Rise>
          {subtitle ? (
            <Rise delay={120}>
              <Txt variant="body" tone="muted">{subtitle}</Txt>
            </Rise>
          ) : null}
        </View>

        {children}
      </ScrollView>

      {/*
        Pinned above the scroll, so the content passes UNDER it — and carrying
        the back button, which is the one control on the screen that must never
        scroll away. The band's blur fades in and out with the scroll; the
        button inside it does not move at all.
      */}
      <ScrollEdge
        title={title}
        leading={<CircleButton icon="chevron.left" label="Back" onPress={() => router.back()} size={34} />}
        trailing={action}
      />
    </View>
  );
}

export function Section({
  title, footer, children,
}: {
  title?: string;
  footer?: string;
  children: ReactNode;
}) {
  const { c, shadow } = useTheme();
  return (
    <View style={{ gap: space.sm }}>
      {title ? <Txt variant="micro" tone="faint">{title.toUpperCase()}</Txt> : null}
      <View
        style={{
          borderRadius: radius.card, borderCurve: 'continuous',
          backgroundColor: c.surface, boxShadow: shadow[1], overflow: 'hidden',
        }}
      >
        {children}
      </View>
      {footer ? (
        <Txt variant="caption" tone="faint" style={{ paddingHorizontal: space.xs }}>
          {footer}
        </Txt>
      ) : null}
    </View>
  );
}

export function RowItem({
  icon, label, value, onPress, trailing,
}: {
  icon?: SymbolViewProps['name'];
  label: string;
  value?: string;
  onPress?: () => void;
  trailing?: ReactNode;
}) {
  const { c } = useTheme();
  const body = (
    <View
      style={{
        flexDirection: 'row', alignItems: 'center', gap: space.md,
        paddingHorizontal: space.base, paddingVertical: 14, minHeight: 54,
      }}
    >
      {icon ? <Icon name={icon} size={17} color={c.inkMuted} /> : null}
      {/* The label keeps priority on space and the value gives way. Without
          `flexShrink` on the value, a long one takes its full natural width and
          squeezes the label to nothing — at large Dynamic Type sizes the label
          then wraps to ONE CHARACTER PER LINE rather than truncating. */}
      <Txt variant="body" style={{ flex: 1 }} numberOfLines={2}>{label}</Txt>
      {value ? (
        <Txt
          variant="body"
          tone="muted"
          numberOfLines={1}
          style={{ flexShrink: 1, textAlign: 'right' }}
        >
          {value}
        </Txt>
      ) : null}
      {trailing}
      {onPress ? <Icon name="chevron.right" size={12} color={c.inkFaint} weight="semibold" /> : null}
    </View>
  );
  if (!onPress) return body;
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label}>
      {body}
    </Pressable>
  );
}

/**
 * One option in a list where exactly one is chosen.
 *
 * `accessibilityRole="radio"` with `checked` state, NOT a button with a tick
 * glyph. The glyph is what a sighted user reads as "this one"; the role and the
 * state are the same information for everyone else, and a row of buttons where
 * one happens to have a checkmark tells a screen reader nothing about the fact
 * that choosing one un-chooses the others.
 */
export function ChoiceRow({
  icon, label, hint, selected, onPress, first,
}: {
  icon?: SymbolViewProps['name'];
  label: string;
  hint?: string;
  selected: boolean;
  onPress: () => void;
  first?: boolean;
}) {
  const { c } = useTheme();
  return (
    <Pressable
      onPress={() => { haptic.tick(); onPress(); }}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={hint ? `${label}. ${hint}` : label}
      style={{
        flexDirection: 'row', alignItems: 'center', gap: space.md,
        paddingHorizontal: space.base, paddingVertical: 14, minHeight: 54,
        borderTopWidth: first ? 0 : 1, borderTopColor: c.hairline,
      }}
    >
      {icon ? <Icon name={icon} size={17} color={selected ? c.accentInk : c.inkMuted} /> : null}
      <View style={{ flex: 1, gap: 1 }}>
        <Txt variant="body">{label}</Txt>
        {hint ? <Txt variant="caption" tone="faint">{hint}</Txt> : null}
      </View>
      {selected ? <Icon name="checkmark" size={15} color={c.accentInk} weight="bold" /> : null}
    </Pressable>
  );
}
