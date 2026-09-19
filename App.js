import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import AppNavigator from './src/navigation/AppNavigator';
import { ThemeProvider } from './src/constants/Theme';
import { AppPreferencesProvider } from './src/context/AppPreferencesContext';
import { AuthProvider } from './src/context/AuthContext';
import { RemoteSettingsProvider } from './src/context/RemoteSettingsContext';
import { AdMobService } from './src/services/AdMobService';

/**
 * MK eCard - Production Version 2026
 * Architecture: Modular Screen-based with Native Stack
 */
export default function App() {
  useEffect(() => {
    AdMobService.initialize();
    return () => {
      AdMobService.destroy();
    };
  }, []);
  return (
    <SafeAreaProvider>
      <AppPreferencesProvider>
        <ThemeProvider>
          <AuthProvider>
            <RemoteSettingsProvider>
              <NavigationContainer>
                <AppNavigator />
                <StatusBar style="auto" />
              </NavigationContainer>
            </RemoteSettingsProvider>
          </AuthProvider>
        </ThemeProvider>
      </AppPreferencesProvider>
    </SafeAreaProvider>
  );
}
