import { View } from 'react-native';
import { router } from 'expo-router';
import { Pressable } from 'react-native';
import { OnboardingScaffold } from '../../src/components/OnboardingScaffold';
import { Txt } from '../../src/components/Txt';
import { EmojiAvatar } from '../../src/components/EmojiAvatar';
import { PupuScene } from '../../src/components/mascot/PupuScene';
import { useTheme } from '../../src/theme/useTheme';
import { radius, space } from '../../src/theme/tokens';
import { haptic } from '../../src/lib/haptics';
import { useT, type TKey } from '../../src/i18n';
import { requestNotificationPermission, reminderBody } from '../../src/lib/notifications';
import { usePlanStore } from '../../src/store/usePlanStore';

/**
 * Built from `reminderBody` — the same function that writes the real
 * notification — rather than from hand-typed strings.
 *
 * The strings here used to be literals, and they had already drifted: this
 * screen promised "Starting now — 30m" and "Coming up at 12:30", while the
 * scheduler sent something else entirely. A preview whose whole job is to say
 * "here is what you will get" is the one place a copy change must not be able
 * to go stale unnoticed.
 *
 * The lead shown is the default a new user will actually get — they have not
 * been to the settings screen yet, because it is reached from a tab that does
 * not exist until onboarding finishes.
 */
const PREVIEW_LEAD = 10;

/**
 * Built per render, not once at module load.
 *
 * `reminderBody` and the titles are translated, and a module-level array would
 * freeze both in whatever language the app happened to launch in — so a user
 * who switched to Vietnamese and re-ran onboarding would be shown an English
 * preview of a notification that will arrive in Vietnamese.
 */
function previews(t: (k: TKey) => string) {
  return [
    {
      emoji: '🌅', tint: 'peach' as const,
      title: t('onboarding.remindersPreview1Title'),
      body: reminderBody(30, PREVIEW_LEAD),
    },
    {
      emoji: '🥪', tint: 'mint' as const,
      title: t('onboarding.remindersPreview1Title2'),
      body: reminderBody(20, PREVIEW_LEAD),
    },
  ];
}

export default function Reminders() {
  const { c, shadow } = useTheme();
  const { t } = useT();
  const PREVIEW = previews(t);

  const finish = async (ask: boolean) => {
    haptic.tap();
    // A real request — the button says "Turn on reminders", so it must.
    const granted = ask ? await requestNotificationPermission() : false;
    // The ACTION, not a hand-rolled `setState`: it also clears any recorded
    // revocation, so a user who re-runs onboarding and grants permission is
    // not left with a stale "turned off in iOS Settings" notice behind them.
    usePlanStore.getState().setReminders(granted);
    router.push('/onboarding/ready');
  };

  return (
    <OnboardingScaffold
      step={4}
      // "BEFORE", not "when". The scheduler now fires ahead of the activity by
      // `PREVIEW_LEAD`, and a headline promising a nudge at the moment
      // something starts would be describing the behaviour this replaced.
      title={t('onboarding.remindersTitle')}
      subtitle={t('onboarding.remindersSubtitle')}
      ctaLabel={t('onboarding.remindersCta')}
      onCta={() => finish(true)}
      headerSlot={
        /* The notification marks are part of the artwork, so there is no
           separate pulsing overlay to add — drawing our own beside them would
           simply give the dog two sets of the same symbol. With nothing else
           moving here, Pupu gets his ordinary slow breath rather than being held
           unnaturally still. */
        <View style={{ alignItems: 'center', paddingBottom: space.xs }}>
          <PupuScene pose="phone" size={168} />
        </View>
      }
      footer={
        <Pressable
          onPress={() => finish(false)}
          hitSlop={10}
          accessibilityRole="button"
          style={{ alignSelf: 'center', paddingVertical: space.sm }}
        >
          <Txt variant="captionStrong" tone="muted" style={{ textDecorationLine: 'underline' }}>
            {t('onboarding.remindersSkip')}
          </Txt>
        </Pressable>
      }
    >
      <View style={{ gap: space.md }}>
        {PREVIEW.map((p) => (
          <View
            key={p.title}
            style={{
              flexDirection: 'row', alignItems: 'center', gap: space.md,
              padding: space.md, borderRadius: radius.card, borderCurve: 'continuous',
              backgroundColor: c.surface, boxShadow: shadow[1],
            }}
          >
            <EmojiAvatar emoji={p.emoji} tint={p.tint} size={38} />
            <View style={{ flex: 1, gap: 1 }}>
              <Txt variant="micro" tone="faint">{t('onboarding.remindersBrand')}</Txt>
              <Txt variant="bodyStrong">{p.title}</Txt>
              <Txt variant="caption" tone="muted">{p.body}</Txt>
            </View>
          </View>
        ))}
      </View>
    </OnboardingScaffold>
  );
}
