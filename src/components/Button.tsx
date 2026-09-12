import type { ReactNode } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Txt } from './Txt';
import { Icon } from './Icon';
import { PressScale } from './Press';
import { useTheme } from '../theme/useTheme';
import { radius, space } from '../theme/tokens';
import type { SymbolViewProps } from 'expo-symbols';

type Variant = 'solid' | 'soft' | 'ghost' | 'outline';

export function Button({
  label, onPress, variant = 'solid', icon, trailingIcon, disabled, loading, fullWidth = true,
}: {
  label: string;
  onPress: () => void;
  variant?: Variant;
  icon?: SymbolViewProps['name'];
  trailingIcon?: SymbolViewProps['name'];
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
}) {
  const { c } = useTheme();

  const skin: Record<Variant, { bg: string; fg: string; border?: string }> = {
    solid:   { bg: c.solid, fg: c.onSolid },
    soft:    { bg: c.accentSoft, fg: c.accentInk },
    ghost:   { bg: 'transparent', fg: c.ink },
    outline: { bg: 'transparent', fg: c.ink, border: c.hairline },
  };
  const s = skin[variant];
  const off = disabled || loading;

  return (
    <PressScale
      onPress={onPress}
      disabled={off}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!off, busy: !!loading }}
      style={{
        height: 54,
        alignSelf: fullWidth ? 'stretch' : 'flex-start',
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        gap: space.sm, paddingHorizontal: space.xl,
        borderRadius: radius.pill,
        backgroundColor: s.bg,
        borderWidth: s.border ? 1.5 : 0,
        borderColor: s.border,
        opacity: off ? 0.45 : 1,
      }}
    >
      {loading ? (
        <ActivityIndicator color={s.fg} />
      ) : (
        <>
          {icon ? <Icon name={icon} size={17} color={s.fg} weight="semibold" /> : null}
          <Txt variant="title" color={s.fg}>{label}</Txt>
          {trailingIcon ? <Icon name={trailingIcon} size={15} color={s.fg} weight="semibold" /> : null}
        </>
      )}
    </PressScale>
  );
}

/** Onboarding answer — outlined pill that thickens and bolds when chosen. */
export function ChoiceRow({
  label, selected, onPress,
}: { label: string; selected: boolean; onPress: () => void }) {
  const { c } = useTheme();
  return (
    <PressScale
      onPress={onPress}
      scaleTo={0.985}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      style={{
        minHeight: 52, justifyContent: 'center', alignItems: 'center',
        paddingHorizontal: space.lg, paddingVertical: space.md,
        borderRadius: radius.pill,
        borderWidth: selected ? 2 : 1.25,
        borderColor: selected ? c.ink : c.hairline,
        backgroundColor: selected ? c.surface : 'transparent',
      }}
    >
      <Txt variant={selected ? 'title' : 'body'} tone={selected ? 'ink' : 'muted'} numberOfLines={2}>
        {label}
      </Txt>
    </PressScale>
  );
}

export function Row({ children, gap = space.sm }: { children: ReactNode; gap?: number }) {
  return <View style={{ flexDirection: 'row', alignItems: 'center', gap }}>{children}</View>;
}
