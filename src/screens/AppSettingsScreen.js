import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Bell } from 'lucide-react-native';
import PreferencesSection from '../components/PreferencesSection';
import ScreenScaffold from '../components/ScreenScaffold';
import { SettingsItem, SettingsSection } from '../components/SettingsList';
import Footer from '../components/Footer';
import { useTheme } from '../constants/Theme';
import { useAppPreferences } from '../context/AppPreferencesContext';
import { getTranslation } from '../constants/i18n';
import { fetchPublicNotifications } from '../services/NotificationService';

export default function AppSettingsScreen({ navigation, route }) {
  const { colors } = useTheme();
  const { language } = useAppPreferences();
  const [remoteNotifications, setRemoteNotifications] = useState([]);
  const [notificationLoading, setNotificationLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const t = (key) => getTranslation(language, key);
  const showBack = route?.params?.showBack !== false;

  const loadRemoteNotifications = useCallback(async () => {
    setNotificationLoading(true);
    try {
      const list = await fetchPublicNotifications({ limit: 3, type: 'system' });
      setRemoteNotifications(list);
    } catch {
      setRemoteNotifications([]);
    } finally {
      setNotificationLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRemoteNotifications();
  }, [loadRemoteNotifications]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadRemoteNotifications();
    } finally {
      setRefreshing(false);
    }
  }, [loadRemoteNotifications]);

  return (
    <ScreenScaffold
      navigation={navigation}
      showBack={showBack}
      title={t('settings.title')}
      refreshing={refreshing}
      onRefresh={handleRefresh}
      footer={<Footer />}
    >
      <PreferencesSection t={t} />

      <SettingsSection title={t('settings.updatesSection')} colors={colors}>
        <NotificationSettingItem
          colors={colors}
          notifications={remoteNotifications}
          loading={notificationLoading}
          t={t}
          onPress={() => navigation.navigate('SystemNotifications', { type: 'system' })}
        />
      </SettingsSection>
    </ScreenScaffold>
  );
}

const NotificationSettingItem = ({ colors, notifications, loading, t, onPress }) => {
  const latest = notifications[0];

  return (
    <SettingsItem
      icon={
        loading ? <ActivityIndicator color={colors.primary} /> : <Bell size={22} color="#FF9500" />
      }
      label={t('settings.notifications')}
      subtitle={latest?.shortBody || latest?.title || t('settings.notificationsEmpty')}
      right={!!notifications.length && (
        <View style={[styles.badge, { backgroundColor: colors.primary }]}>
          <Text style={styles.badgeText}>{notifications.length}</Text>
        </View>
      )}
      onPress={onPress}
      colors={colors}
    />
  );
};

const styles = StyleSheet.create({
  badge: { minWidth: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6, marginHorizontal: 8 },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '900' },
});
