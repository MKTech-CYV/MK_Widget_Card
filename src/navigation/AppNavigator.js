import React from 'react';
import { View, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { User, Scan, Settings, Info } from 'lucide-react-native';

import MyCardScreen from '../screens/MyCardScreen';
import ScanScreen from '../screens/ScanScreen';
import AboutScreen from '../screens/AboutScreen';
import SettingsScreen, { TermsScreen } from '../screens/SettingsScreen';
import { useTheme } from '../constants/Theme';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function SettingsStack() {
  const { colors } = useTheme();
  return (
    <Stack.Navigator screenOptions={{ 
      headerTitle: '', 
      headerTransparent: true, 
      headerTintColor: colors.primary,
      contentStyle: { backgroundColor: colors.background }
    }}>
      <Stack.Screen name="SettingsMain" component={SettingsScreen} />
      <Stack.Screen name="Terms" component={TermsScreen} />
    </Stack.Navigator>
  );
}

const ScanTabIcon = ({ focused, colors, isDark }) => (
  <View style={[
    styles.scanIconContainer, 
    { 
      backgroundColor: colors.primary, 
      shadowColor: colors.primary 
    },
    focused && { 
      backgroundColor: isDark ? '#1a8eff' : '#0056b3', 
      transform: [{ scale: 1.1 }] 
    }
  ]}>
    <Scan color="#fff" size={30} />
  </View>
);

export default function AppNavigator() {
  const { colors, isDark } = useTheme();

  return (
    <Tab.Navigator
      initialRouteName="My eCard"
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: [styles.tabBar, { backgroundColor: colors.card, borderTopColor: colors.border }],
        tabBarLabelStyle: styles.tabBarLabel,
        tabBarIcon: ({ color, size, focused }) => {
          if (route.name === 'My eCard') return <User color={color} size={size} />;
          if (route.name === 'Scan') return <ScanTabIcon focused={focused} colors={colors} isDark={isDark} />;
          if (route.name === 'About') return <Info color={color} size={size} />;
          if (route.name === 'Settings') return <Settings color={color} size={size} />;
        },
      })}
    >
      <Tab.Screen name="My eCard" component={MyCardScreen} />
      <Tab.Screen 
        name="Scan" 
        component={ScanScreen} 
        options={{ tabBarLabel: () => null }}
      />
      <Tab.Screen name="About" component={AboutScreen} />
      <Tab.Screen name="Settings" component={SettingsStack} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    paddingBottom: 8,
    height: 70,
    borderTopWidth: 0,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 5
  },
  tabBarLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 4
  },
  scanIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: -25,
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4
  }
});
