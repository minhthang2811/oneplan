import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { View, ScrollView, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  FadeInDown, useReducedMotion, useSharedValue, useAnimatedStyle, withTiming,
} from 'react-native-reanimated';
import { router } from 'expo-router';
import { Txt } from './Txt';
import { Icon } from './Icon';
import { Button } from './Button';
import { EASE } from './Press';
import { useTheme } from '../theme/useTheme';
import { useT } from '../i18n';
import { radius, space } from '../theme/tokens';
import { haptic } from '../lib/haptics';

export const ONBOARDING_STEPS = 5;

export function OnboardingScaffold({
  step, title, subtitle, children, ctaLabel, onCta, ctaDisabled, onSkip, onBack, footer, headerSlot,
}: {
  /** May be fractional — a screen with sub-steps advances the bar within its own step. */
  step?: number;
  title: string;
  subtitle?: string;
  children?: ReactNode;
  ctaLabel: string;
  onCta: () => void;
  ctaDisabled?: boolean;
  onSkip?: () => void;
  /** Overrides the back button — for screens that step backwards internally first. */
  onBack?: () => void;
  footer?: ReactNode;
  /** Rendered above the title, inside the same entrance animation. */
  headerSlot?: ReactNode;
}) {
  const { c } = useTheme();
  const { t } = useT();
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const canGoBack = onBack != null || router.canGoBack();

  /**
   * The bar GROWS rather than jumping. Progress that animates is the only
   * feedback that a sub-step inside one screen actually advanced the flow —
   * without it, picking a second routine set looks like nothing happened.
   */
  const pct = useSharedValue(step != null ? Math.min(1, step / ONBOARDING_STEPS) : 0);
  useEffect(() => {
    const next = step != null ? Math.min(1, step / ONBOARDING_STEPS) : 0;
    pct.set(reduced ? next : withTiming(next, { duration: 420, easing: EASE }));
  }, [step, reduced, pct]);
  const fill = useAnimatedStyle(() => ({ width: `${pct.get() * 100}%` }));

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
            onPress={() => { haptic.tap(); onBack ? onBack() : router.back(); }}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel={t('common.back')}
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
            accessibilityLabel={t('onboarding.stepOf', {
              step: Math.ceil(step),
              total: ONBOARDING_STEPS,
            })}
          >
            <Animated.View
              style={[
                { height: '100%', borderRadius: radius.bar, backgroundColor: c.accent },
                fill,
              ]}
            />
          </View>
        ) : (
          <View style={{ flex: 1 }} />
        )}

        {onSkip ? (
          <Pressable onPress={onSkip} hitSlop={12} accessibilityRole="button">
            <Txt variant="captionStrong" tone="muted">{t('common.skip')}</Txt>
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
          {headerSlot}
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
