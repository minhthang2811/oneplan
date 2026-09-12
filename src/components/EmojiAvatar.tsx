import { View, Text } from 'react-native';
import { useTheme } from '../theme/useTheme';
import type { TintName } from '../theme/tokens';

/**
 * The emoji IS the task's identity — this is content, not chrome iconography.
 * The tinted disc behind it is the second half of the encoding: colour lets a
 * whole day be scanned without reading a single word.
 */
export function EmojiAvatar({
  emoji, tint, size = 40, dimmed = false,
}: { emoji: string; tint: TintName; size?: number; dimmed?: boolean }) {
  const theme = useTheme();
  const t = theme.tint(tint);
  return (
    <View
      style={{
        width: size, height: size, borderRadius: size / 2,
        backgroundColor: t.bg,
        alignItems: 'center', justifyContent: 'center',
        opacity: dimmed ? 0.45 : 1,
      }}
    >
      <Text style={{ fontSize: size * 0.46, lineHeight: size * 0.58 }} allowFontScaling={false}>
        {emoji}
      </Text>
    </View>
  );
}
