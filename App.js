import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import AppNavigator from './src/navigation/AppNavigator';
import { ThemeProvider } from './src/constants/Theme';
import { AppPreferencesProvider } from './src/context/AppPreferencesContext';
import { AuthProvider } from './src/context/AuthContext';

/**
 * MK eCard - Production Version 2026
 * Architecture: Modular Screen-based with Native Stack
 */
export default function App() {
  return (
    <SafeAreaProvider>
      <AppPreferencesProvider>
        <ThemeProvider>
          <AuthProvider>
            <NavigationContainer>
              <AppNavigator />
              <StatusBar style="auto" />
            </NavigationContainer>
          </AuthProvider>
        </ThemeProvider>
      </AppPreferencesProvider>
    </SafeAreaProvider>
  );
}
