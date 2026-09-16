import { View } from 'react-native';
import { Txt } from '../src/components/Txt';
import { SettingsScreen, Section, ChoiceRow } from '../src/components/Settings';
import { space } from '../src/theme/tokens';
import {
  useT, useLanguageStore, LOCALES, LOCALE_NAME, type Language,
} from '../src/i18n';
import { haptic } from '../src/lib/haptics';

/**
 * The language picker.
 *
 * Built on the same `SettingsScreen` / `Section` / `ChoiceRow` primitives as
 * Appearance and Reminders, because it is the same kind of screen and sits
 * beside them in Me. A hand-rolled list here would be a one-off that drifts the
 * first time those rows are restyled.
 *
 * Two details are specific to language, and both matter:
 *
 * 1. EVERY LANGUAGE IS NAMED IN ITSELF. "Tiếng Việt", never "Vietnamese", and
 *    never translated. The person most likely to open this screen is someone
 *    who has landed in a language they cannot read, and they are looking for
 *    the shape of their own word, not for our name for it.
 *
 * 2. THERE IS A "SYSTEM" ROW, AND IT IS FIRST. Following the phone is the
 *    default and a real, distinct state — not the same as having picked the
 *    language the phone happens to be set to today. Someone who travels, or who
 *    changes their phone next month, should get the new language without coming
 *    back here. Its hint carries the language it currently resolves to, so the
 *    indirection is never opaque.
 */
export default function LanguageScreen() {
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
    <SettingsScreen title={t('language.title')} subtitle={t('language.footnote')}>
      {/* No section title: the screen's own title already says it, and
          Appearance only has one because it shows the same three choices
          twice. */}
      <Section>
        <ChoiceRow
          icon="globe"
          label={t('language.system')}
          hint={`${t('language.systemSub')} · ${LOCALE_NAME[device]}`}
          selected={language === 'system'}
          first
          onPress={() => pick('system')}
        />
        {LOCALES.map((l) => (
          <ChoiceRow
            key={l}
            label={LOCALE_NAME[l]}
            selected={language === l}
            onPress={() => pick(l)}
          />
        ))}
      </Section>

      {/* Proof the switch took effect, in the language just chosen. Without it
          the only confirmation on this screen is a tick moving one row, which
          is a weak signal for a change that reaches the whole app. */}
      <View style={{ alignItems: 'center', paddingTop: space.sm }}>
        <Txt variant="caption" tone="muted">{LOCALE_NAME[locale]}</Txt>
      </View>
    </SettingsScreen>
  );
}
