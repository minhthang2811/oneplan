import { Txt } from './Txt';
import { Icon } from './Icon';
import { PressScale } from './Press';
import { useTheme } from '../theme/useTheme';
import { radius, space } from '../theme/tokens';
import type { SymbolViewProps } from 'expo-symbols';

/** Selectable pill. The only selection control in the app, so selection always
 *  looks the same: accent-tinted fill plus accent text. */
export function Chip({
  label, selected, onPress, icon, tintBg, tintFg,
}: {
  label: string;
  selected?: boolean;
  onPress: () => void;
  icon?: SymbolViewProps['name'];
  tintBg?: string;
  tintFg?: string;
}) {
  const { c } = useTheme();
  const bg = selected ? (tintBg ?? c.accentSoft) : c.surfaceSunken;
  const fg = selected ? (tintFg ?? c.accentInk) : c.inkMuted;

  return (
    <PressScale
      onPress={onPress}
      scaleTo={0.95}
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected }}
      accessibilityLabel={label}
      hitSlop={4}
      style={{
        flexDirection: 'row', alignItems: 'center', gap: 6,
        minHeight: 40, paddingHorizontal: 14, justifyContent: 'center',
        borderRadius: radius.pill, backgroundColor: bg,
        borderWidth: selected ? 1.5 : 0,
        borderColor: selected ? fg : 'transparent',
      }}
    >
      {icon ? <Icon name={icon} size={12} color={fg} weight="semibold" /> : null}
      <Txt variant="captionStrong" color={fg} numberOfLines={1}>{label}</Txt>
    </PressScale>
  );
}

export function FieldLabel({ children }: { children: string }) {
  return (
    <Txt variant="micro" tone="faint" style={{ marginBottom: space.sm }}>
      {children.toUpperCase()}
    </Txt>
  );
}
