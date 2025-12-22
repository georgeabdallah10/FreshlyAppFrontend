import { Appearance, ColorSchemeName, useColorScheme } from 'react-native';
import { ColorTokens, darkColors, lightColors } from './colors';

export type ThemeMode = 'light' | 'dark';
export type ThemePreference = ThemeMode | 'system';

export type Theme = {
  mode: ThemeMode;
  colors: ColorTokens;
};

const resolveSystemScheme = (): ThemeMode => {
  const scheme: ColorSchemeName = Appearance.getColorScheme();
  return scheme === 'dark' ? 'dark' : 'light';
};

export const getTheme = (preference: ThemePreference = 'system'): Theme => {
  const resolvedMode = preference === 'system' ? resolveSystemScheme() : preference;
  const colors = resolvedMode === 'dark' ? darkColors : lightColors;

  return { mode: resolvedMode, colors };
};

export const useAppTheme = (preference: ThemePreference = 'system'): Theme => {
  const systemScheme = useColorScheme();
  const resolvedMode =
    preference === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : preference;
  const colors = resolvedMode === 'dark' ? darkColors : lightColors;

  return { mode: resolvedMode, colors };
};
