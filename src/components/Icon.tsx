import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { View } from 'react-native';

type Props = {
  name: SymbolViewProps['name'];
  size?: number;
  color: string;
  weight?: SymbolViewProps['weight'];
};

/**
 * One icon family for all chrome: SF Symbols. They inherit optical sizing and
 * weight, which hand-drawn SVG chrome never does. A sized spacer is rendered as
 * the fallback so layout never shifts if a symbol is unavailable.
 */
export function Icon({ name, size = 20, color, weight = 'medium' }: Props) {
  return (
    <SymbolView
      name={name}
      size={size}
      tintColor={color}
      weight={weight}
      resizeMode="scaleAspectFit"
      fallback={<View style={{ width: size, height: size }} />}
      style={{ width: size, height: size }}
    />
  );
}
