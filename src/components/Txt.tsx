import { Text as RNText, PixelRatio, type TextProps, type TextStyle } from 'react-native';
import { type } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';

type Variant = keyof typeof type;
type Tone = 'ink' | 'muted' | 'faint' | 'accent' | 'onAccent' | 'onSolid';

export type TxtProps = TextProps & {
  variant?: Variant;
  tone?: Tone;
  /** Tabular figures — required for anything that counts, times or prices. */
  tabular?: boolean;
  color?: string;
};

/**
 * Dynamic Type is respected but capped: display sizes are already large, so an
 * uncapped multiplier turns a headline into three lines of clipped serif.
 */
const MAX_SCALE: Partial<Record<Variant, number>> = {
  displayLg: 1.2, displayMd: 1.25, displaySm: 1.3, numeral: 1.15,
};
const DEFAULT_MAX = 1.6;

export function Txt({
  variant = 'body', tone = 'ink', tabular, color, style, allowFontScaling, ...rest
}: TxtProps) {
  const { c } = useTheme();
  const tones: Record<Tone, string> = {
    ink: c.ink, muted: c.inkMuted, faint: c.inkFaint,
    accent: c.accentInk, onAccent: c.onAccent, onSolid: c.onSolid,
  };

  const max = MAX_SCALE[variant] ?? DEFAULT_MAX;
  const preset = type[variant];

  /**
   * React Native scales `fontSize` with Dynamic Type but leaves an ABSOLUTE
   * `lineHeight` exactly where it was — so at large text sizes the glyphs
   * outgrow their line box and get clipped ("Quick tidy" renders as
   * "Quick tidv"). Scaling lineHeight by the same clamped factor keeps the
   * ratio intact at every size instead of only at 100%.
   */
  const scale = allowFontScaling === false ? 1 : Math.min(PixelRatio.getFontScale(), max);

  const base: TextStyle = {
    ...preset,
    lineHeight: preset.lineHeight * scale,
    color: color ?? tones[tone],
    ...(tabular ? { fontVariant: ['tabular-nums'] as TextStyle['fontVariant'] } : null),
  };

  return (
    <RNText
      allowFontScaling={allowFontScaling}
      maxFontSizeMultiplier={max}
      style={[base, style]}
      {...rest}
    />
  );
}
