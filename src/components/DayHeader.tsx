import { View, Pressable } from 'react-native';
import { Txt } from './Txt';
import { Icon } from './Icon';
import { RingValue } from './Ring';
import { PressScale } from './Press';
import { useTheme } from '../theme/useTheme';
import { useT } from '../i18n';
import { radius, space } from '../theme/tokens';
import { weekdayLong, longDate, weekAround, dateKey, isToday, addDays } from '../lib/time';
import { haptic } from '../lib/haptics';

export function DayHeader({
  date, onChangeDate, doneCount, total, onAdd, onMenu,
}: {
  date: Date;
  onChangeDate: (d: Date) => void;
  doneCount: number;
  total: number;
  onAdd: () => void;
  onMenu: () => void;
}) {
  const { c, shadow } = useTheme();
  const { t, tag } = useT();
  const week = weekAround(date);
  const activeKey = dateKey(date);

  return (
    <View style={{ gap: space.base, paddingBottom: space.sm }}>
      {/* Utility row — the progress ring reuses the focus-timer motif rather
          than introducing an emoji or a second visual language. */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View
          style={{
            flexDirection: 'row', alignItems: 'center', gap: space.sm,
            paddingVertical: 7, paddingLeft: space.md, paddingRight: 14,
            borderRadius: radius.pill, backgroundColor: c.surface, boxShadow: shadow[1],
          }}
          accessibilityLabel={t('today.a11yProgress', { done: doneCount, total })}
        >
          <RingValue
            size={16} strokeWidth={3}
            value={total ? doneCount / total : 0}
            color={c.accent} track={c.hairline}
          />
          <Txt variant="captionStrong" tabular>{doneCount}/{total}</Txt>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
          <CircleButton icon="ellipsis" onPress={onMenu} label={t('today.dayOptions')} />
          <CircleButton icon="plus" onPress={onAdd} label={t('today.addActivity')} />
        </View>
      </View>

      {/* Date nav. The weekday is the one display-size element on this screen. */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        {/*
          `addDays`, NOT `date.getTime() ± 86400000`.

          A local day is not always 24 hours. On the day a clock goes back it is
          25, so adding a fixed 86400000ms to a morning timestamp lands later
          the SAME day — `dateKey` returns the day it started on and the Next
          button silently does nothing. `addDays` goes through `setDate`, which
          is calendar arithmetic and lands on the next date whatever its length.
          `weekAround` already used it; these two were the holdouts.
        */}
        <Pressable
          onPress={() => { haptic.tick(); onChangeDate(addDays(date, -1)); }}
          hitSlop={16} accessibilityRole="button" accessibilityLabel={t('today.prevDay')}
        >
          <Icon name="chevron.left" size={17} color={c.inkFaint} weight="semibold" />
        </Pressable>

        <Pressable
          onPress={() => { if (!isToday(activeKey)) { haptic.tap(); onChangeDate(new Date()); } }}
          accessibilityRole="button"
          accessibilityLabel={t('today.jumpToToday', {
            weekday: weekdayLong(date),
            date: longDate(date),
          })}
          style={{ alignItems: 'center', gap: 1, flex: 1 }}
        >
          <Txt
            variant="displayLg"
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.7}
          >
            {weekdayLong(date)}
          </Txt>
          <Txt variant="caption" tone="muted">{longDate(date)}</Txt>
        </Pressable>

        <Pressable
          onPress={() => { haptic.tick(); onChangeDate(addDays(date, 1)); }}
          hitSlop={16} accessibilityRole="button" accessibilityLabel={t('today.nextDay')}
        >
          <Icon name="chevron.right" size={17} color={c.inkFaint} weight="semibold" />
        </Pressable>
      </View>

      {/* Week strip */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        {week.map((d) => {
          const key = dateKey(d);
          const active = key === activeKey;
          const today = isToday(key);
          return (
            <Pressable
              key={key}
              onPress={() => { haptic.tick(); onChangeDate(d); }}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              accessibilityLabel={longDate(d)}
              hitSlop={{ top: 6, bottom: 6 }}
              style={{ alignItems: 'center', gap: 5, width: 40, paddingVertical: 4 }}
            >
              <Txt variant="micro" tone={active ? 'ink' : 'faint'} style={{ fontSize: 10 }}>
                {d.toLocaleDateString(tag, { weekday: 'narrow' }).toUpperCase()}
              </Txt>
              <View
                style={{
                  width: 30, height: 30, borderRadius: 15,
                  alignItems: 'center', justifyContent: 'center',
                  backgroundColor: active ? c.solid : 'transparent',
                  borderWidth: !active && today ? 1.5 : 0,
                  borderColor: c.accent,
                }}
              >
                <Txt
                  variant="captionStrong"
                  tabular
                  color={active ? c.onSolid : today ? c.accentInk : c.inkMuted}
                >
                  {d.getDate()}
                </Txt>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export function CircleButton({
  icon, onPress, label, size = 38,
}: { icon: Parameters<typeof Icon>[0]['name']; onPress: () => void; label: string; size?: number }) {
  const { c, shadow } = useTheme();
  return (
    <PressScale
      onPress={() => { haptic.tap(); onPress(); }}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={6}
      style={{
        width: size, height: size, borderRadius: size / 2,
        alignItems: 'center', justifyContent: 'center',
        backgroundColor: c.surface, boxShadow: shadow[1],
      }}
    >
      <Icon name={icon} size={17} color={c.ink} weight="semibold" />
    </PressScale>
  );
}
