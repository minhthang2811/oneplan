import { View, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Txt } from '../src/components/Txt';
import { Icon } from '../src/components/Icon';
import { CircleButton } from '../src/components/DayHeader';
import { PressHighlight } from '../src/components/Press';
import { useTheme } from '../src/theme/useTheme';
import { radius, space } from '../src/theme/tokens';
import {
  useT, useLanguageStore, LOCALES, LOCALE_NAME, type Language,
} from '../src/i18n';
import { haptic } from '../src/lib/haptics';

/**
 * The language picker.
 *
 * The shape is the one every top app converges on — a plain list, one row per
 * language, a checkmark on the active one — with the two details that separate
 * the good ones from the rest:
 *
 * 1. EVERY LANGUAGE IS NAMED IN ITSELF. "Tiếng Việt", never "Vietnamese". The
 *    person most likely to open this screen is someone who has landed in a
 *    language they cannot read, and they are looking for the shape of their own
 *    word, not for a translation of it.
 *
 * 2. THERE IS A "SYSTEM" ROW, AND IT IS FIRST. Following the phone is the
 *    default and a real, distinct state — not the same as having picked the
 *    language the phone currently happens to be set to. Someone who travels, or
 *    who changes their phone to Vietnamese next month, should get Vietnamese
 *    without coming back here. The row carries the language it currently
 *    resolves to on its right, so the abstraction is never opaque.
 *
 * A pushed screen rather than an action sheet, even for three rows: this is
 * where a list of languages is expected to be, it survives adding a fourth, and
 * a sheet cannot show the footnote that explains what "System" means.
 */
export default function LanguageScreen() {
  const insets = useSafeAreaInsets();
  const { c, shadow } = useTheme();
  const { t, locale } = useT();
  const language = useLanguageStore((s) => s.language);
  const device = useLanguageStore((s) => s.device);
  const setLanguage = useLanguageStore((s) => s.setLanguage);

  const pick = (next: Language) => {
    // No haptic when nothing changed — a tap on the row that is already ticked
    // has no result, and punctuating a no-op teaches the wrong thing.
    if (next === language) return;
    haptic.tap();
    setLanguage(next);
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.canvas }}>
      <View
        style={{
          flexDirection: 'row', alignItems: 'center', gap: space.md,
          paddingTop: insets.top + space.sm,
          paddingHorizontal: space.lg,
          paddingBottom: space.sm,
        }}
      >
        <CircleButton icon="chevron.left" label={t('common.back')} onPress={() => router.back()} />
        <Txt variant="title">{t('language.title')}</Txt>
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: space.lg,
          paddingTop: space.md,
          paddingBottom: insets.bottom + space.xxl,
          gap: space.md,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={{
            borderRadius: radius.card,
            borderCurve: 'continuous',
            backgroundColor: c.surface,
            boxShadow: shadow[1],
            overflow: 'hidden',
          }}
        >
          <Row
            label={t('language.system')}
            sub={t('language.systemSub')}
            value={LOCALE_NAME[device]}
            selected={language === 'system'}
            first
            onPress={() => pick('system')}
          />
          {LOCALES.map((l) => (
            <Row
              key={l}
              label={LOCALE_NAME[l]}
              selected={language === l}
              onPress={() => pick(l)}
            />
          ))}
        </View>

        <Txt variant="caption" tone="faint" style={{ paddingHorizontal: space.xs }}>
          {t('language.footnote')}
        </Txt>
      </ScrollView>

      {/* Proof the switch took effect, in the language just chosen. Without it
          the only confirmation on this screen is a tick moving one row, which
          is a weak signal for a change that reaches the whole app. */}
      <View style={{ alignItems: 'center', paddingBottom: insets.bottom + space.lg }}>
        <Txt variant="caption" tone="muted">{LOCALE_NAME[locale]}</Txt>
      </View>
    </View>
  );
}

function Row({
  label, sub, value, selected, first, onPress,
}: {
  label: string;
  sub?: string;
  value?: string;
  selected: boolean;
  first?: boolean;
  onPress: () => void;
}) {
  const { c } = useTheme();
  return (
    <PressHighlight
      onPress={onPress}
      baseColor={c.surface}
      pressColor={c.surfaceSunken}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
      style={{
        flexDirection: 'row', alignItems: 'center', gap: space.md,
        paddingHorizontal: space.base, paddingVertical: 14, minHeight: 58,
        borderTopWidth: first ? 0 : 1, borderTopColor: c.hairline,
      }}
    >
      <View style={{ flex: 1, gap: 1 }}>
        {/*
          `allowFontScaling` is left ON here even though the endonyms are short:
          this is the one screen someone may be navigating by shape alone, and
          shrinking it would be the wrong trade.
        */}
        <Txt variant="body" numberOfLines={1}>{label}</Txt>
        {sub ? <Txt variant="caption" tone="faint" numberOfLines={1}>{sub}</Txt> : null}
      </View>

      {value ? (
        <Txt variant="caption" tone="muted" numberOfLines={1} style={{ flexShrink: 1 }}>
          {value}
        </Txt>
      ) : null}

      {/* The tick occupies its slot whether or not it is drawn, so selecting a
          row does not shove the label sideways. */}
      <View style={{ width: 20, alignItems: 'center' }}>
        {selected ? <Icon name="checkmark" size={15} color={c.accentInk} weight="bold" /> : null}
      </View>
    </PressHighlight>
  );
}
