import { View } from 'react-native';
import { router } from 'expo-router';
import { Pressable } from 'react-native';
import { OnboardingScaffold } from '../../src/components/OnboardingScaffold';
import { Txt } from '../../src/components/Txt';
import { EmojiAvatar } from '../../src/components/EmojiAvatar';
import { PipScene } from '../../src/components/mascot/PipScene';
import { useTheme } from '../../src/theme/useTheme';
import { radius, space } from '../../src/theme/tokens';
import { useT, type TKey } from '../../src/i18n';
import { haptic } from '../../src/lib/haptics';
import { requestNotificationPermission } from '../../src/lib/notifications';
import { usePlanStore } from '../../src/store/usePlanStore';

/** Fake notifications, so they are translated copy like any other. */
const PREVIEW: Array<{ emoji: string; tint: 'peach' | 'mint'; title: TKey; body: TKey }> = [
  {
    emoji: '🌅', tint: 'peach',
    title: 'onboarding.remindersPreview1Title',
    body: 'onboarding.remindersPreview1Body',
  },
  {
    emoji: '🥪', tint: 'mint',
    title: 'onboarding.remindersPreview2Title',
    body: 'onboarding.remindersPreview2Body',
  },
];

export default function Reminders() {
  const { c, shadow } = useTheme();
  const { t } = useT();

  const finish = async (ask: boolean) => {
    haptic.tap();
    // A real request — the button says "Turn on reminders", so it must.
    const granted = ask ? await requestNotificationPermission() : false;
    usePlanStore.setState((s) => ({ profile: { ...s.profile, reminders: granted } }));
    router.push('/onboarding/ready');
  };

  return (
    <OnboardingScaffold
      step={4}
      title={t('onboarding.remindersTitle')}
      subtitle={t('onboarding.remindersSubtitle')}
      ctaLabel={t('onboarding.remindersCta')}
      onCta={() => finish(true)}
      headerSlot={
        /* The notification marks are part of the artwork, so there is no
           separate pulsing overlay to add — drawing our own beside them would
           simply give the dog two sets of the same symbol. With nothing else
           moving here, Pip gets his ordinary slow breath rather than being held
           unnaturally still. */
        <View style={{ alignItems: 'center', paddingBottom: space.xs }}>
          <PipScene pose="phone" size={168} />
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
              <Txt variant="bodyStrong">{t(p.title)}</Txt>
              <Txt variant="caption" tone="muted">{t(p.body)}</Txt>
            </View>
          </View>
        ))}
      </View>
    </OnboardingScaffold>
  );
}
