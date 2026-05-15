import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, StyleSheet, Text, View, ScrollView, TouchableOpacity } from 'react-native';
import { Bell, ChevronRight, Info, Landmark, Languages, LogIn, Monitor, Moon, ShieldCheck, Sun, User as UserIcon } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ProfileAvatar from '../components/ProfileAvatar';
import { useTheme, Spacing } from '../constants/Theme';
import Footer from '../components/Footer';
import { useAppPreferences } from '../context/AppPreferencesContext';
import { useAuth } from '../context/AuthContext';
import { getTranslation } from '../constants/i18n';
import { fetchPublicNotifications } from '../services/NotificationService';
import { getUserProfile } from '../utils/userProfile';

export default function SettingsScreen({ navigation }) {
  const { colors, mode, setTheme } = useTheme();
  const insets = useSafeAreaInsets();
  const { language, setLanguage } = useAppPreferences();
  const { user, isAuthReady, refreshSession } = useAuth();
  const [changingLanguage, setChangingLanguage] = useState(null);
  const [remoteNotifications, setRemoteNotifications] = useState([]);
  const [notificationLoading, setNotificationLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const t = (key) => getTranslation(language, key);
  const profile = getUserProfile(user);

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

  const openAccountDetail = () => {
    navigation.navigate('AccountMain');
  };

  const openNotifications = () => {
    const parent = navigation.getParent();
    if (parent) {
      parent.navigate('NotificationsTab');
      return;
    }
    navigation.navigate('Notifications');
  };

  const openMyCardEditor = (section) => {
    navigation.getParent()?.navigate('MyCardTab', {
      editSection: section,
      editRequestId: Date.now(),
    });
  };

  const handleLanguageChange = async (nextLanguage) => {
    if (nextLanguage === language || changingLanguage) {
      return;
    }

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
      await Promise.all([
        loadRemoteNotifications(),
        refreshSession?.().catch(() => null),
      ]);
    } finally {
      setRefreshing(false);
    }
  }, [loadRemoteNotifications, refreshSession]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 16 }]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            tintColor={colors.primary}
            onRefresh={handleRefresh}
          />
        }
      >
        <AccountSummaryCard
          colors={colors}
          profile={profile}
          user={user}
          isAuthReady={isAuthReady}
          t={t}
          onPress={openAccountDetail}
        />

        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <Text style={[styles.sectionHeader, { color: colors.textSecondary }]}>{t('settings.quickActions')}</Text>
          <SettingItem
            icon={<UserIcon size={22} color={colors.primary} />}
            label={t('settings.editECardInfo')}
            onPress={() => openMyCardEditor('ecard')}
            colors={colors}
          />
          <SettingItem
            icon={<Landmark size={22} color="#34C759" />}
            label={t('settings.editBankInfo')}
            onPress={() => openMyCardEditor('bank')}
            colors={colors}
          />
        </View>

        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <Text style={[styles.sectionHeader, { color: colors.textSecondary }]}>{t('settings.preferencesSection')}</Text>
          <View style={styles.subsection}>
            <Text style={[styles.subsectionTitle, { color: colors.text }]}>{t('settings.displayMode')}</Text>
            <View style={styles.themeSelector}>
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
            <View style={styles.languageSelector}>
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
            onPress={openNotifications}
          />
        </View>

        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <Text style={[styles.sectionHeader, { color: colors.textSecondary }]}>{t('settings.legalSection')}</Text>
          <SettingItem
            icon={<Info size={22} color={colors.primary} />}
            label={t('settings.about')}
            onPress={() => navigation.navigate('About')}
            colors={colors}
          />
          <SettingItem 
            icon={<ShieldCheck size={22} color={colors.success} />} 
            label={t('settings.terms')} 
            onPress={() => navigation.navigate('Terms')}
            colors={colors}
          />
          <SettingItem 
            icon={<Info size={22} color={colors.textSecondary} />} 
            label={t('settings.versionLabel')} 
            right={<Text style={[styles.versionText, { color: colors.textSecondary }]}>{getTranslation(language, 'about.appVersion')}</Text>}
            colors={colors}
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
      disabled && !loading && { opacity: 0.62 }
    ]} 
    onPress={onPress}
    disabled={disabled || loading}
    accessibilityState={{ selected: active, busy: loading, disabled: disabled || loading }}
  >
    {loading ? <ActivityIndicator color={active ? '#fff' : colors.primary} /> : icon}
    <Text style={[
      styles.themeOptionLabel, 
      { color: colors.text },
      active && { color: '#fff' }
    ]}>{label}</Text>
  </TouchableOpacity>
);

const AccountSummaryCard = ({ colors, profile, user, isAuthReady, t, onPress }) => (
  <TouchableOpacity
    style={[styles.accountCard, { backgroundColor: colors.card }]}
    onPress={onPress}
    activeOpacity={0.82}
  >
    {isAuthReady && user ? (
      <ProfileAvatar profile={profile} colors={colors} size={62} />
    ) : (
      <View style={[styles.loginAvatar, { backgroundColor: `${colors.primary}14` }]}>
        {isAuthReady ? <LogIn color={colors.primary} size={26} /> : <ActivityIndicator color={colors.primary} />}
      </View>
    )}
    <View style={styles.accountBody}>
      <Text style={[styles.accountEyebrow, { color: colors.textSecondary }]}>
        {user ? t('settings.accountSignedIn') : t('settings.account')}
      </Text>
      <Text style={[styles.accountName, { color: colors.text }]} numberOfLines={1}>
        {user ? profile.displayName : t('settings.accountSignedOut')}
      </Text>
      <Text style={[styles.accountEmail, { color: colors.textSecondary }]} numberOfLines={1}>
        {user ? profile.email : t('settings.accountCta')}
      </Text>
    </View>
    <ChevronRight color={colors.border} size={22} />
  </TouchableOpacity>
);

const NotificationSettingItem = ({ colors, notifications, loading, t, onPress }) => {
  const latest = notifications[0];

  return (
    <TouchableOpacity
      style={[styles.notificationItem, { borderBottomColor: colors.background }]}
      onPress={onPress}
      activeOpacity={0.82}
    >
      <View style={[styles.notificationIcon, { backgroundColor: `${colors.primary}14` }]}>
        {loading ? <ActivityIndicator color={colors.primary} /> : <Bell color={colors.primary} size={22} />}
      </View>
      <View style={styles.accountBody}>
        <Text style={[styles.accountEyebrow, { color: colors.textSecondary }]}>
          {t('settings.notifications')}
        </Text>
        <Text style={[styles.notificationTitle, { color: colors.text }]} numberOfLines={1}>
          {latest?.title || t('settings.notificationsEmpty')}
        </Text>
        {!!latest?.shortBody && (
          <Text style={[styles.notificationBody, { color: colors.textSecondary }]} numberOfLines={2}>
            {latest.shortBody}
          </Text>
        )}
      </View>
      <View style={styles.notificationRight}>
        {!!notifications.length && (
          <View style={[styles.badge, { backgroundColor: colors.primary }]}>
            <Text style={styles.badgeText}>{notifications.length}</Text>
          </View>
        )}
        <ChevronRight color={colors.border} size={22} />
      </View>
    </TouchableOpacity>
  );
};

export function TermsScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { language } = useAppPreferences();
  const t = (key) => getTranslation(language, key);
  const termBlocks = ['block1', 'block2', 'block3', 'block4', 'block5', 'block6', 'block7', 'block8'];
  
  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: colors.background }]} 
      contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 60 }]}
    >
      <Text style={[styles.screenTitle, { color: colors.text }]}>{t('terms.title')}</Text>
      <View style={[styles.termsCard, { backgroundColor: colors.card }]}>
        <ShieldCheck color={colors.success} size={40} style={{ alignSelf: 'center', marginBottom: 20 }} />
        {termBlocks.map(block => (
          <TermBlock
            key={block}
            title={t(`terms.${block}Title`)}
            content={t(`terms.${block}Content`)}
            colors={colors}
          />
        ))}
      </View>
      <Footer />
    </ScrollView>
  );
}

const TermBlock = ({ title, content, colors }) => (
  <View style={{ marginBottom: Spacing.lg }}>
    <Text style={[styles.termTitle, { color: colors.text }]}>{title}</Text>
    <Text style={[styles.termContent, { color: colors.textSecondary }]}>{content}</Text>
  </View>
);

const SettingItem = ({ icon, label, right, onPress, colors }) => (
  <TouchableOpacity 
    style={[styles.settingItem, { borderBottomColor: colors.background }]} 
    onPress={onPress} 
    disabled={!onPress}
  >
    <View style={styles.settingLeft}>
      <View style={[styles.iconBox, { backgroundColor: colors.background }]}>{icon}</View>
      <Text style={[styles.settingLabel, { color: colors.text }]}>{label}</Text>
    </View>
    <View style={styles.settingRight}>
      {right}
      {onPress && <ChevronRight color={colors.border} size={20} />}
    </View>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: Spacing.lg },
  screenTitle: { fontSize: 32, fontWeight: '800', marginBottom: Spacing.xl },
  accountCard: { borderRadius: 24, padding: 16, marginBottom: Spacing.md, flexDirection: 'row', alignItems: 'center' },
  loginAvatar: { width: 62, height: 62, borderRadius: 31, alignItems: 'center', justifyContent: 'center' },
  accountBody: { flex: 1, minWidth: 0, marginLeft: 14 },
  accountEyebrow: { fontSize: 11, fontWeight: '900', textTransform: 'uppercase', marginBottom: 4 },
  accountName: { fontSize: 18, fontWeight: '900' },
  accountEmail: { fontSize: 13, fontWeight: '700', marginTop: 3 },
  notificationItem: { paddingHorizontal: 18, paddingBottom: 18, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 0 },
  notificationIcon: { width: 46, height: 46, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  notificationTitle: { fontSize: 16, fontWeight: '900' },
  notificationBody: { fontSize: 13, lineHeight: 18, marginTop: 3 },
  notificationRight: { alignItems: 'center', justifyContent: 'center', marginLeft: 10 },
  badge: { minWidth: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6, marginBottom: 5 },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '900' },
  section: { borderRadius: 24, marginBottom: Spacing.lg, overflow: 'hidden' },
  sectionHeader: { fontSize: 12, fontWeight: '700', marginLeft: Spacing.lg, marginBottom: Spacing.sm, marginTop: Spacing.md, textTransform: 'uppercase' },
  subsection: { paddingHorizontal: 8, paddingBottom: 12 },
  subsectionTitle: { fontSize: 15, fontWeight: '800', marginLeft: 10, marginBottom: 8 },
  preferenceDivider: { height: 1, marginHorizontal: 18, marginBottom: 14 },
  themeSelector: { flexDirection: 'row', padding: 10, justifyContent: 'space-between' },
  languageSelector: { flexDirection: 'row', padding: 10, justifyContent: 'space-between' },
  languageNote: { fontSize: 13, lineHeight: 18, paddingHorizontal: 10, marginBottom: 8 },
  themeOption: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 12, marginHorizontal: 5, borderRadius: 14 },
  themeOptionLabel: { fontSize: 12, fontWeight: '600', marginTop: 4 },
  settingItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 18, borderBottomWidth: 0.5 },
  settingLeft: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center' },
  settingRight: { flexDirection: 'row', alignItems: 'center', flexShrink: 1 },
  iconBox: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  settingLabel: { flex: 1, fontSize: 17, fontWeight: '500' },
  versionText: { fontSize: 15 },
  termsCard: { borderRadius: 24, padding: 25 },
  termTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 8 },
  termContent: { fontSize: 15, lineHeight: 22 }
});
