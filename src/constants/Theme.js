import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import DefaultPreference from 'react-native-default-preference';

// Initial/Light colors as fallback
export const Colors = {
  primary: '#007AFF',
  secondary: '#5856D6',
  background: '#F2F2F7',
  card: '#FFFFFF',
  text: '#1C1C1E',
  textSecondary: '#8E8E93',
  success: '#34C759',
  error: '#FF3B30',
  border: '#C6C6C8',
};

const DarkColors = {
  primary: '#0A84FF',
  secondary: '#5E5CE6',
  background: '#000000',
  card: '#1C1C1E',
  text: '#FFFFFF',
  textSecondary: '#8E8E93',
  success: '#32D74B',
  error: '#FF453A',
  border: '#38383A',
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

const ThemeContext = createContext({
  mode: 'system',
  isDark: false,
  setTheme: () => {},
  colors: Colors,
});

export const ThemeProvider = ({ children }) => {
  const systemColorScheme = useColorScheme();
  const [themeMode, setThemeMode] = useState('system'); // 'light', 'dark', 'system'

  useEffect(() => {
    const loadTheme = async () => {
      try {
        const savedTheme = await DefaultPreference.get('themeMode');
        if (savedTheme) {
          setThemeMode(savedTheme);
        }
      } catch {
        // Keep the system theme if stored preferences cannot be read.
      }
    };
    loadTheme();
  }, []);

  const setTheme = async (mode) => {
    setThemeMode(mode);
    await DefaultPreference.set('themeMode', mode);
  };

  const isDark = themeMode === 'system' 
    ? systemColorScheme === 'dark' 
    : themeMode === 'dark';

  const theme = {
    mode: themeMode,
    isDark,
    setTheme,
    colors: isDark ? DarkColors : Colors,
  };

  return (
    <ThemeContext.Provider value={theme}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
