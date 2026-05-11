import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import AppNavigator from './src/navigation/AppNavigator';
import { ThemeProvider } from './src/constants/Theme';
import { AppPreferencesProvider } from './src/context/AppPreferencesContext';
import * as Notifications from 'expo-notifications';
import { registerForPushNotificationsAsync, normalizeNotificationForStorage } from './src/services/NotificationService';
import { StorageService } from './src/services/StorageService';

/**
 * MK eCard - Production Version 2026
 * Architecture: Modular Screen-based with Native Stack
 */
function NotificationBootstrapper() {
  useEffect(() => {
    let responseSub;
    let receivedSub;
    let isMounted = true;

    const setup = async () => {
      try {
        const token = await registerForPushNotificationsAsync();
        if (token) {
          // Useful for testing: copy token from Metro logs.
          // eslint-disable-next-line no-console
          console.log('[push] expoPushToken:', token);
        }
      } catch (e) {
        // ignore: app can run without push permission
      }

      receivedSub = Notifications.addNotificationReceivedListener(async (notification) => {
        if (!isMounted) return;
        try {
          await StorageService.addNotification(normalizeNotificationForStorage(notification));
        } catch {
          // ignore
        }
      });

      responseSub = Notifications.addNotificationResponseReceivedListener(async (response) => {
        const notification = response?.notification;
        if (!notification) return;
        try {
          await StorageService.addNotification(normalizeNotificationForStorage(notification));
        } catch {
          // ignore
        }
      });
    };

    setup();

    return () => {
      isMounted = false;
      receivedSub?.remove?.();
      responseSub?.remove?.();
    };
  }, []);

  return null;
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AppPreferencesProvider>
        <ThemeProvider>
          <NavigationContainer>
            <AppNavigator />
            <NotificationBootstrapper />
            <StatusBar style="auto" />
          </NavigationContainer>
        </ThemeProvider>
      </AppPreferencesProvider>
    </SafeAreaProvider>
  );
}
