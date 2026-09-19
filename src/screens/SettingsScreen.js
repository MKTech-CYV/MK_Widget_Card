import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View, ScrollView, TouchableOpacity } from 'react-native';
import { Bell, ChevronRight, Info, Landmark, LogIn, ShieldCheck, User as UserIcon } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ProfileAvatar from '../components/ProfileAvatar';
import AppRefreshControl from '../components/AppRefreshControl';
import PreferencesSection from '../components/PreferencesSection';
import ScreenScaffold from '../components/ScreenScaffold';
import { SettingsItem, SettingsSection } from '../components/SettingsList';
import { useTheme, Spacing } from '../constants/Theme';
import Footer from '../components/Footer';
import { useAppPreferences } from '../context/AppPreferencesContext';
import { useAuth } from '../context/AuthContext';
import { getTranslation } from '../constants/i18n';
import { fetchPublicNotifications } from '../services/NotificationService';
import { getUserProfile } from '../utils/userProfile';

export default function SettingsScreen({ navigation }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { language } = useAppPreferences();
  const { user, isAuthReady, refreshSession } = useAuth();
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
          <AppRefreshControl
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

        <SettingsSection title={t('settings.quickActions')} colors={colors}>
          <SettingsItem
            icon={<UserIcon size={22} color={colors.primary} />}
            label={t('settings.editECardInfo')}
            onPress={() => openMyCardEditor('ecard')}
            colors={colors}
          />
          <SettingsItem
            icon={<Landmark size={22} color="#34C759" />}
            label={t('settings.editBankInfo')}
            onPress={() => openMyCardEditor('bank')}
            colors={colors}
          />
        </SettingsSection>

        <PreferencesSection t={t} />

        <SettingsSection title={t('settings.updatesSection')} colors={colors}>
          <NotificationSettingItem
            colors={colors}
            notifications={remoteNotifications}
            loading={notificationLoading}
            t={t}
            onPress={openNotifications}
          />
        </SettingsSection>

        <SettingsSection title={t('settings.legalSection')} colors={colors}>
          <SettingsItem
            icon={<Info size={22} color={colors.primary} />}
            label={t('settings.about')}
            onPress={() => navigation.navigate('About')}
            colors={colors}
          />
          <SettingsItem
            icon={<ShieldCheck size={22} color={colors.success} />}
            label={t('settings.terms')}
            onPress={() => navigation.navigate('Terms')}
            colors={colors}
          />
          <SettingsItem
            icon={<Info size={22} color={colors.textSecondary} />}
            label={t('settings.versionLabel')}
            right={<Text style={[styles.versionText, { color: colors.textSecondary }]}>{getTranslation(language, 'about.appVersion')}</Text>}
            colors={colors}
            showChevron={false}
          />
        </SettingsSection>

        <Footer />
      </ScrollView>
    </View>
  );
}

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

export function TermsScreen({ navigation }) {
  const { colors } = useTheme();
  const { language } = useAppPreferences();
  const t = (key) => getTranslation(language, key);
  const termBlocks = ['block1', 'block2', 'block3', 'block4', 'block5', 'block6', 'block7', 'block8'];

  return (
    <ScreenScaffold
      navigation={navigation}
      showBack
      title={t('terms.title')}
      footer={<Footer />}
    >
      <View style={[styles.termsCard, { backgroundColor: colors.card }]}>
        <ShieldCheck color={colors.success} size={40} style={styles.termsIcon} />
        {termBlocks.map(block => (
          <TermBlock
            key={block}
            title={t(`terms.${block}Title`)}
            content={t(`terms.${block}Content`)}
            colors={colors}
          />
        ))}
      </View>
    </ScreenScaffold>
  );
}

const TermBlock = ({ title, content, colors }) => (
  <View style={styles.termBlock}>
    <Text style={[styles.termTitle, { color: colors.text }]}>{title}</Text>
    <Text style={[styles.termContent, { color: colors.textSecondary }]}>{content}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: Spacing.lg },
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
  versionText: { fontSize: 15 },
  termsCard: { borderRadius: 24, padding: 25 },
  termsIcon: { alignSelf: 'center', marginBottom: 20 },
  termBlock: { marginBottom: Spacing.lg },
  termTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 8 },
  termContent: { fontSize: 15, lineHeight: 22 }
});
