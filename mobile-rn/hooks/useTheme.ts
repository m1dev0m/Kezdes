import { useColorScheme } from 'react-native';
import * as tokens from '../theme';

export const useTheme = () => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  return {
    ...tokens,
    isDark,
    colors: tokens.colors,
    spacing: tokens.spacing,
    fontSize: tokens.fontSize,
    fontWeight: tokens.fontWeight,
    fontFamily: tokens.fontFamily,
  };
};
