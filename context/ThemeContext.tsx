import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useColorScheme } from 'react-native';

import { darkColors, lightColors } from '@/theme/colors';
import { Theme, ThemePreference } from '@/theme/theme';

type ThemeContextValue = {
  theme: Theme;
  mode: ThemePreference;
  setMode: (mode: ThemePreference) => Promise<void>;
};

const STORAGE_KEY = 'themePreference';
const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const isValidPreference = (value: string): value is ThemePreference =>
  value === 'light' || value === 'dark' || value === 'system';

type ThemeProviderProps = {
  children: React.ReactNode;
};

export const ThemeProvider = ({ children }: ThemeProviderProps) => {
  const systemScheme = useColorScheme();
  const [mode, setModeState] = useState<ThemePreference>('system');

  useEffect(() => {
    let isMounted = true;

    const loadPreference = async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored && isValidPreference(stored) && isMounted) {
          setModeState(stored);
        }
      } catch (error) {
        console.warn('Failed to load theme preference', error);
      }
    };

    loadPreference();

    return () => {
      isMounted = false;
    };
  }, []);

  const setMode = useCallback(async (nextMode: ThemePreference) => {
    setModeState(nextMode);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, nextMode);
    } catch (error) {
      console.warn('Failed to persist theme preference', error);
    }
  }, []);

  const theme = useMemo<Theme>(() => {
    const resolvedMode =
      mode === 'system'
        ? systemScheme === 'dark'
          ? 'dark'
          : 'light'
        : mode;
    const colors = resolvedMode === 'dark' ? darkColors : lightColors;

    return { mode: resolvedMode, colors };
  }, [mode, systemScheme]);

  const value = useMemo(
    () => ({
      theme,
      mode,
      setMode,
    }),
    [mode, setMode, theme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useThemeContext = (): ThemeContextValue => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useThemeContext must be used within a ThemeProvider');
  }
  return context;
};
