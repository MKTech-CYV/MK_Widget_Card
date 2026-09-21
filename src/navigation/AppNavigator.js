import React, { useEffect, useState } from 'react';
import { AppState, StyleSheet, Text, View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Bell, CircleUser, QrCode, Settings as SettingsIcon, User } from 'lucide-react-native';

import MyCardScreen from '../screens/MyCardScreen';
import ScanScreen from '../screens/ScanScreen';
import AboutScreen from '../screens/AboutScreen';
import AccountScreen from '../screens/AccountScreen';
import AppSettingsScreen from '../screens/AppSettingsScreen';
import AccountPresetsScreen from '../screens/AccountPresetsScreen';
import { TermsScreen } from '../screens/SettingsScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import AuthScreen from '../screens/AuthScreen';
import { useTheme } from '../constants/Theme';
import { useAppPreferences } from '../context/AppPreferencesContext';
import { getTranslation } from '../constants/i18n';
import QuickTourModal from '../components/QuickTourModal';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { promptForUpdateIfNeeded } from '../services/AppUpdateService';
import { AdMobService } from '../services/AdMobService';
import { useAuth } from '../context/AuthContext';
import { fetchAdFreeStatus } from '../services/AdFreeService';

const ADS_DISABLED_KEY = 'adsDisabled';
const AD_FREE_RECHECK_MS = 5 * 60 * 1000;

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const TAB_LABEL_KEYS = {
  MyCardTab: 'nav.myCard',
  NotificationsTab: 'nav.notifications',
  SettingsTab: 'nav.settings',
  AccountTab: 'nav.account',
};

function AccountStack() {
  const { colors } = useTheme();
  return (
    <Stack.Navigator screenOptions={{ 
      headerTitle: '', 
      headerTransparent: true, 
      headerTintColor: colors.primary,
      contentStyle: { backgroundColor: colors.background }
    }}>
      <Stack.Screen name="AccountMain" component={AccountScreen} />
      <Stack.Screen name="AccountDetail" component={AuthScreen} />
      <Stack.Screen name="AccountSettings" component={AppSettingsScreen} options={{ headerShown: false }} />
      <Stack.Screen name="AccountPresets" component={AccountPresetsScreen} options={{ headerShown: false }} />
      <Stack.Screen name="SystemNotifications" component={NotificationsScreen} initialParams={{ type: 'system' }} options={{ headerShown: false }} />
      <Stack.Screen name="About" component={AboutScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Terms" component={TermsScreen} options={{ headerShown: false }} />
    </Stack.Navigator>
  );
}

function SettingsStack() {
  const { colors } = useTheme();

  return (
    <Stack.Navigator screenOptions={{
      headerTitle: '',
      headerTransparent: true,
      headerTintColor: colors.primary,
      contentStyle: { backgroundColor: colors.background }
    }}>
      <Stack.Screen
        name="SettingsMain"
        component={AppSettingsScreen}
        initialParams={{ showBack: false }}
        options={{ headerShown: false }}
      />
      <Stack.Screen name="SystemNotifications" component={NotificationsScreen} initialParams={{ type: 'system' }} options={{ headerShown: false }} />
    </Stack.Navigator>
  );
}

const QrTabIcon = ({ focused, colors, isDark }) => (
  <View
    style={[
      styles.qrIconContainer,
      {
        backgroundColor: colors.primary,
        shadowColor: colors.primary,
      },
      focused && [
        styles.qrIconFocused,
        { backgroundColor: isDark ? '#1a8eff' : '#0056b3' },
      ],
    ]}
  >
    <QrCode color="#fff" size={30} />
  </View>
);

export default function AppNavigator() {
  const { colors, isDark } = useTheme();
  const { language, quickTourCompleted, isReady, completeQuickTour } = useAppPreferences();
  const [showTour, setShowTour] = useState(false);
  const { user, isAuthReady } = useAuth();
  const t = (key) => getTranslation(language, key);

  // Ad-free accounts (ad_free_users/{uid}, created by an admin): remember the last
  // known value so it still applies when the app starts offline, refresh it when
  // the app comes back to the foreground, and clear it when signed out.
  useEffect(() => {
    AsyncStorage.getItem(ADS_DISABLED_KEY)
      .then((value) => { if (value === '1') AdMobService.setAdsDisabled(true); })
      .catch(() => null);
  }, []);

  useEffect(() => {
    if (!isAuthReady) return undefined;

    if (!user?.id) {
      AdMobService.setAdsDisabled(false);
      AsyncStorage.removeItem(ADS_DISABLED_KEY).catch(() => null);
      return undefined;
    }

    let lastCheck = 0;
    const refresh = async () => {
      lastCheck = Date.now();
      const adFree = await fetchAdFreeStatus(user.id);
      if (adFree === null) return;

      AdMobService.setAdsDisabled(adFree);
      AsyncStorage.setItem(ADS_DISABLED_KEY, adFree ? '1' : '0').catch(() => null);
    };

    refresh();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active' && Date.now() - lastCheck > AD_FREE_RECHECK_MS) refresh();
    });
    return () => subscription.remove();
  }, [isAuthReady, user?.id]);

  useEffect(() => {
    if (isReady && !quickTourCompleted) {
      setShowTour(true);
    }
  }, [isReady, quickTourCompleted]);

  // Ask users on an older store build to update, once the quick tour (if any)
  // is out of the way.
  useEffect(() => {
    if (!isReady || showTour) return undefined;

    const timer = setTimeout(() => {
      promptForUpdateIfNeeded({ t, language }).catch(() => null);
    }, 3000);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReady, showTour]);

  return (
    <>
      <Tab.Navigator
        initialRouteName="MyCardTab"
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.textSecondary,
          tabBarStyle: [styles.tabBar, { backgroundColor: colors.card, borderTopColor: colors.border }],
          tabBarItemStyle: styles.tabBarItem,
          tabBarLabelStyle: styles.tabBarLabel,
          tabBarLabel: ({ color }) => {
            if (route.name === 'ScanTab') return null;

            return (
              <Text style={[styles.tabBarLabel, { color }]} numberOfLines={1}>
                {t(TAB_LABEL_KEYS[route.name])}
              </Text>
            );
          },
          tabBarIcon: ({ color, focused, size }) => {
            if (route.name === 'MyCardTab') return <User color={color} size={size} />;
            if (route.name === 'NotificationsTab') return <Bell color={color} size={size} />;
            if (route.name === 'ScanTab') return <QrTabIcon focused={focused} colors={colors} isDark={isDark} />;
            if (route.name === 'SettingsTab') return <SettingsIcon color={color} size={size} />;
            if (route.name === 'AccountTab') return <CircleUser color={color} size={size} />;
            return null;
          },
        })}
      >
        <Tab.Screen
          name="MyCardTab"
          component={MyCardScreen}
        />
        <Tab.Screen
          name="NotificationsTab"
          component={NotificationsScreen}
        />
        <Tab.Screen 
          name="ScanTab"
          component={ScanScreen} 
        />
        <Tab.Screen
          name="AccountTab"
          component={AccountStack}
        />
        <Tab.Screen
          name="SettingsTab"
          component={SettingsStack}
        />
      </Tab.Navigator>
      <QuickTourModal visible={showTour} onFinish={async () => { setShowTour(false); await completeQuickTour(); }} />
    </>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    paddingHorizontal: 12,
    paddingBottom: 8,
    paddingTop: 7,
    height: 78,
    borderTopWidth: 0,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 5
  },
  tabBarItem: {
    paddingHorizontal: 4,
  },
  tabBarLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 4
  },
  qrIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -28,
    shadowOpacity: 0.18,
    shadowRadius: 9,
    elevation: 6,
  },
  qrIconFocused: {
    transform: [{ scale: 1.06 }],
    shadowOpacity: 0.28,
  },
});
