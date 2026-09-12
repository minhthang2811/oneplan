import type { ReactNode } from 'react';
import { View, ScrollView, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown, useReducedMotion } from 'react-native-reanimated';
import { router } from 'expo-router';
import { Txt } from './Txt';
import { Icon } from './Icon';
import { Button } from './Button';
import { useTheme } from '../theme/useTheme';
import { radius, space } from '../theme/tokens';
import { haptic } from '../lib/haptics';

export const ONBOARDING_STEPS = 4;

export function OnboardingScaffold({
  step, title, subtitle, children, ctaLabel, onCta, ctaDisabled, onSkip, footer,
}: {
  step?: number;
  title: string;
  subtitle?: string;
  children?: ReactNode;
  ctaLabel: string;
  onCta: () => void;
  ctaDisabled?: boolean;
  onSkip?: () => void;
  footer?: ReactNode;
}) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const canGoBack = router.canGoBack();

  return (
    <View style={{ flex: 1, backgroundColor: c.canvas }}>
      <View
        style={{
          paddingTop: insets.top + space.sm,
          paddingHorizontal: space.lg,
          paddingBottom: space.md,
          flexDirection: 'row', alignItems: 'center', gap: space.base,
          minHeight: 44,
        }}
      >
        {canGoBack ? (
          <Pressable
            onPress={() => { haptic.tap(); router.back(); }}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Back"
          >
            <Icon name="chevron.left" size={19} color={c.ink} weight="semibold" />
          </Pressable>
        ) : null}

        {step != null ? (
          <View
            style={{
              flex: 1, maxWidth: 148, height: 5,
              borderRadius: radius.bar, backgroundColor: c.accentSoft, overflow: 'hidden',
            }}
            accessibilityRole="progressbar"
            accessibilityLabel={`Step ${step} of ${ONBOARDING_STEPS}`}
          >
            <View
              style={{
                width: `${(step / ONBOARDING_STEPS) * 100}%`,
                height: '100%', borderRadius: radius.bar, backgroundColor: c.accent,
              }}
            />
          </View>
        ) : (
          <View style={{ flex: 1 }} />
        )}

        {onSkip ? (
          <Pressable onPress={onSkip} hitSlop={12} accessibilityRole="button">
            <Txt variant="captionStrong" tone="muted">Skip</Txt>
          </Pressable>
        ) : null}
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: space.lg,
          paddingTop: space.sm,
          paddingBottom: space.xxl,
          gap: space.xl,
        }}
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Animated.View
          entering={reduced ? undefined : FadeInDown.duration(320).springify().damping(18)}
          style={{ gap: space.md }}
        >
          <Txt variant="displayLg">{title}</Txt>
          {subtitle ? <Txt variant="body" tone="muted">{subtitle}</Txt> : null}
        </Animated.View>

        {children}
      </ScrollView>

      <View
        style={{
          paddingHorizontal: space.lg,
          paddingBottom: Math.max(insets.bottom, space.base),
          paddingTop: space.md,
          gap: space.md,
          backgroundColor: c.canvas,
        }}
      >
        <Button label={ctaLabel} onPress={onCta} disabled={ctaDisabled} />
        {footer}
      </View>
    </View>
  );
}
