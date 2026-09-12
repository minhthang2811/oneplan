import { View } from 'react-native';
import { router } from 'expo-router';
import { Pressable } from 'react-native';
import { OnboardingScaffold } from '../../src/components/OnboardingScaffold';
import { Txt } from '../../src/components/Txt';
import { EmojiAvatar } from '../../src/components/EmojiAvatar';
import { useTheme } from '../../src/theme/useTheme';
import { radius, space } from '../../src/theme/tokens';
import { haptic } from '../../src/lib/haptics';
import { requestNotificationPermission } from '../../src/lib/notifications';
import { usePlanStore } from '../../src/store/usePlanStore';

const PREVIEW = [
  { emoji: '🌅', tint: 'peach' as const, title: 'Morning routine', body: 'Starting now — 30m' },
  { emoji: '🥪', tint: 'mint' as const, title: 'Lunch', body: 'Coming up at 12:30' },
];

export default function Reminders() {
  const { c, shadow } = useTheme();

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
      title={'A nudge when\nsomething starts'}
      subtitle="Oneplan can tell you when an activity begins, so the plan does the remembering instead of you."
      ctaLabel="Turn on reminders"
      onCta={() => finish(true)}
      footer={
        <Pressable
          onPress={() => finish(false)}
          hitSlop={10}
          accessibilityRole="button"
          style={{ alignSelf: 'center', paddingVertical: space.sm }}
        >
          <Txt variant="captionStrong" tone="muted" style={{ textDecorationLine: 'underline' }}>
            Not right now
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
              <Txt variant="micro" tone="faint">ONEPLAN</Txt>
              <Txt variant="bodyStrong">{p.title}</Txt>
              <Txt variant="caption" tone="muted">{p.body}</Txt>
            </View>
          </View>
        ))}
      </View>
    </OnboardingScaffold>
  );
}
