import { View } from 'react-native';
import { Txt } from './Txt';

/**
 * The one bespoke glyph in the app's chrome. It has to be custom because it is
 * data-bearing — it shows today's date inside the calendar. Everything else in
 * the chrome is an SF Symbol.
 */
export function CalendarDayIcon({ size = 22, color, day }: { size?: number; color: string; day: number }) {
  return (
    <View
      style={{
        width: size, height: size, borderRadius: 5.5,
        borderWidth: 1.7, borderColor: color,
        alignItems: 'center', justifyContent: 'flex-end',
        paddingBottom: 1.5,
      }}
    >
      <View
        style={{
          position: 'absolute', top: 4.2, left: 1.5, right: 1.5,
          height: 1.6, backgroundColor: color,
        }}
      />
      <Txt
        variant="micro"
        color={color}
        tabular
        allowFontScaling={false}
        style={{ fontSize: size * 0.45, lineHeight: size * 0.52, letterSpacing: -0.3 }}
      >
        {day}
      </Txt>
    </View>
  );
}
