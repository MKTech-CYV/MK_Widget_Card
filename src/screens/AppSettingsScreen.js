import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Bell, ChevronRight, Languages, Monitor, Moon, Sun } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Footer from '../components/Footer';
import { useTheme, Spacing } from '../constants/Theme';
import { useAppPreferences } from '../context/AppPreferencesContext';
import { getTranslation } from '../constants/i18n';
import { fetchPublicNotifications } from '../services/NotificationService';

export default function AppSettingsScreen({ navigation }) {
  const { colors, mode, setTheme } = useTheme();
  const insets = useSafeAreaInsets();
  const { language, setLanguage } = useAppPreferences();
  const [changingLanguage, setChangingLanguage] = useState(null);
  const [remoteNotifications, setRemoteNotifications] = useState([]);
  const [notificationLoading, setNotificationLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const t = (key) => getTranslation(language, key);

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

  const handleLanguageChange = async (nextLanguage) => {
    if (nextLanguage === language || changingLanguage) return;

    setChangingLanguage(nextLanguage);
    try {
      await Promise.all([
        setLanguage(nextLanguage),
        new Promise(resolve => setTimeout(resolve, 350)),
      ]);
    } finally {
      setChangingLanguage(null);
    }
  };

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadRemoteNotifications();
    } finally {
      setRefreshing(false);
    }
  }, [loadRemoteNotifications]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 58 }]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            tintColor={colors.primary}
            onRefresh={handleRefresh}
          />
        }
      >
        <Text style={[styles.screenTitle, { color: colors.text }]}>{t('settings.title')}</Text>

        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <Text style={[styles.sectionHeader, { color: colors.textSecondary }]}>{t('settings.preferencesSection')}</Text>
          <View style={styles.subsection}>
            <Text style={[styles.subsectionTitle, { color: colors.text }]}>{t('settings.displayMode')}</Text>
            <View style={styles.optionRow}>
              <ThemeOption
                active={mode === 'light'}
                icon={<Sun size={20} color={mode === 'light' ? '#fff' : colors.primary} />}
                label={t('settings.light')}
                onPress={() => setTheme('light')}
                colors={colors}
              />
              <ThemeOption
                active={mode === 'dark'}
                icon={<Moon size={20} color={mode === 'dark' ? '#fff' : colors.primary} />}
                label={t('settings.dark')}
                onPress={() => setTheme('dark')}
                colors={colors}
              />
              <ThemeOption
                active={mode === 'system'}
                icon={<Monitor size={20} color={mode === 'system' ? '#fff' : colors.primary} />}
                label={t('settings.system')}
                onPress={() => setTheme('system')}
                colors={colors}
              />
            </View>
          </View>
          <View style={[styles.preferenceDivider, { backgroundColor: colors.background }]} />
          <View style={styles.subsection}>
            <Text style={[styles.subsectionTitle, { color: colors.text }]}>{t('settings.languageLabel')}</Text>
            <Text style={[styles.languageNote, { color: colors.textSecondary }]}>{t('settings.languageNote')}</Text>
            <View style={styles.optionRow}>
              <ThemeOption
                active={language === 'vi'}
                icon={<Languages size={20} color={language === 'vi' ? '#fff' : colors.primary} />}
                label={t('common.vietnamese')}
                onPress={() => handleLanguageChange('vi')}
                loading={changingLanguage === 'vi'}
                disabled={Boolean(changingLanguage)}
                colors={colors}
              />
              <ThemeOption
                active={language === 'en'}
                icon={<Languages size={20} color={language === 'en' ? '#fff' : colors.primary} />}
                label={t('common.english')}
                onPress={() => handleLanguageChange('en')}
                loading={changingLanguage === 'en'}
                disabled={Boolean(changingLanguage)}
                colors={colors}
              />
            </View>
          </View>
        </View>

        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <Text style={[styles.sectionHeader, { color: colors.textSecondary }]}>{t('settings.updatesSection')}</Text>
          <NotificationSettingItem
            colors={colors}
            notifications={remoteNotifications}
            loading={notificationLoading}
            t={t}
            onPress={() => navigation.navigate('SystemNotifications', { type: 'system' })}
          />
        </View>

        <Footer />
      </ScrollView>
    </View>
  );
}

const ThemeOption = ({ active, icon, label, onPress, colors, loading = false, disabled = false }) => (
  <TouchableOpacity
    style={[
      styles.themeOption,
      { backgroundColor: colors.background },
      active && { backgroundColor: colors.primary },
      disabled && !loading && { opacity: 0.62 },
    ]}
    onPress={onPress}
    disabled={disabled || loading}
    accessibilityState={{ selected: active, busy: loading, disabled: disabled || loading }}
  >
    {loading ? <ActivityIndicator color={active ? '#fff' : colors.primary} /> : icon}
    <Text style={[styles.themeOptionLabel, { color: colors.text }, active && { color: '#fff' }]}>
      {label}
    </Text>
  </TouchableOpacity>
);

const NotificationSettingItem = ({ colors, notifications, loading, t, onPress }) => {
  const latest = notifications[0];

  return (
    <TouchableOpacity style={styles.settingItem} onPress={onPress} activeOpacity={0.82}>
      <View style={[styles.iconBox, { backgroundColor: colors.background }]}>
        {loading ? <ActivityIndicator color={colors.primary} /> : <Bell size={22} color="#FF9500" />}
      </View>
      <View style={styles.notificationBody}>
        <Text style={[styles.settingLabel, { color: colors.text }]}>{t('settings.notifications')}</Text>
        <Text style={[styles.notificationText, { color: colors.textSecondary }]} numberOfLines={1}>
          {latest?.shortBody || latest?.title || t('settings.notificationsEmpty')}
        </Text>
      </View>
      {!!notifications.length && (
        <View style={[styles.badge, { backgroundColor: colors.primary }]}>
          <Text style={styles.badgeText}>{notifications.length}</Text>
        </View>
      )}
      <ChevronRight color={colors.border} size={20} />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: Spacing.lg },
  screenTitle: { fontSize: 32, fontWeight: '900', marginBottom: Spacing.lg },
  section: { borderRadius: 24, marginBottom: Spacing.lg, overflow: 'hidden' },
  sectionHeader: { fontSize: 12, fontWeight: '800', marginLeft: 18, marginBottom: 8, marginTop: 16, textTransform: 'uppercase' },
  subsection: { paddingHorizontal: 8, paddingBottom: 14 },
  subsectionTitle: { fontSize: 15, fontWeight: '800', marginLeft: 10, marginBottom: 8 },
  preferenceDivider: { height: 1, marginHorizontal: 18, marginBottom: 14 },
  optionRow: { flexDirection: 'row', paddingHorizontal: 10, justifyContent: 'space-between' },
  languageNote: { fontSize: 13, lineHeight: 18, paddingHorizontal: 10, marginBottom: 8 },
  themeOption: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 58, paddingVertical: 10, marginHorizontal: 5, borderRadius: 14 },
  themeOptionLabel: { fontSize: 12, fontWeight: '700', marginTop: 4 },
  settingItem: { minHeight: 68, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingVertical: 12 },
  iconBox: { width: 38, height: 38, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  settingLabel: { fontSize: 16, fontWeight: '700' },
  notificationBody: { flex: 1, minWidth: 0 },
  notificationText: { marginTop: 2, fontSize: 12, fontWeight: '600' },
  badge: { minWidth: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6, marginHorizontal: 8 },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '900' },
});
