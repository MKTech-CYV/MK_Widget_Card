import React, { useCallback, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ChevronRight, Info, Landmark, LogIn, Settings as SettingsIcon, ShieldCheck, User as UserIcon } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ProfileAvatar from '../components/ProfileAvatar';
import Footer from '../components/Footer';
import { useTheme, Spacing } from '../constants/Theme';
import { useAppPreferences } from '../context/AppPreferencesContext';
import { useAuth } from '../context/AuthContext';
import { getTranslation } from '../constants/i18n';
import { getUserProfile } from '../utils/userProfile';

export default function AccountScreen({ navigation }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { language } = useAppPreferences();
  const { user, isAuthReady, refreshSession } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const t = (key) => getTranslation(language, key);
  const profile = getUserProfile(user);

  const openMyCardEditor = useCallback((editSection) => {
    navigation.getParent()?.navigate('MyCardTab', {
      editSection,
      editRequestId: Date.now(),
    });
  }, [navigation]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refreshSession?.().catch(() => null);
    } finally {
      setRefreshing(false);
    }
  }, [refreshSession]);

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
        <AccountEntryCard
          colors={colors}
          profile={profile}
          user={user}
          isAuthReady={isAuthReady}
          t={t}
          onPress={() => navigation.navigate('AccountDetail')}
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
            icon={<Landmark size={22} color={colors.primary} />}
            label={t('settings.editBankInfo')}
            onPress={() => openMyCardEditor('bank')}
            colors={colors}
          />
        </View>

        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <Text style={[styles.sectionHeader, { color: colors.textSecondary }]}>{t('settings.preferencesSection')}</Text>
          <SettingItem
            icon={<SettingsIcon size={22} color={colors.primary} />}
            label={t('auth.settingsShortcut')}
            subtitle={t('auth.settingsShortcutDesc')}
            onPress={() => navigation.navigate('AccountSettings')}
            colors={colors}
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

const AccountEntryCard = ({ colors, profile, user, isAuthReady, t, onPress }) => (
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
        {user ? t('settings.accountSignedIn') : t('auth.signIn')}
      </Text>
      <Text style={[styles.accountName, { color: colors.text }]} numberOfLines={1}>
        {user ? profile.displayName : t('auth.signInPrompt')}
      </Text>
      <Text style={[styles.accountEmail, { color: colors.textSecondary }]} numberOfLines={1}>
        {user ? profile.email : t('auth.signInPromptDesc')}
      </Text>
    </View>
    <ChevronRight color={colors.border} size={22} />
  </TouchableOpacity>
);

const SettingItem = ({ icon, label, right, subtitle, onPress, colors }) => (
  <TouchableOpacity
    style={[styles.settingItem, { borderBottomColor: colors.background }]}
    onPress={onPress}
    disabled={!onPress}
    activeOpacity={onPress ? 0.82 : 1}
  >
    <View style={styles.settingLeft}>
      <View style={[styles.iconBox, { backgroundColor: colors.background }]}>{icon}</View>
      <View style={styles.settingTextBlock}>
        <Text style={[styles.settingLabel, { color: colors.text }]} numberOfLines={1}>{label}</Text>
        {!!subtitle && (
          <Text style={[styles.settingSubtitle, { color: colors.textSecondary }]} numberOfLines={2}>
            {subtitle}
          </Text>
        )}
      </View>
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
  accountCard: { borderRadius: 24, padding: 16, marginBottom: Spacing.lg, flexDirection: 'row', alignItems: 'center' },
  loginAvatar: { width: 62, height: 62, borderRadius: 31, alignItems: 'center', justifyContent: 'center' },
  accountBody: { flex: 1, minWidth: 0, marginLeft: 14 },
  accountEyebrow: { fontSize: 11, fontWeight: '900', textTransform: 'uppercase', marginBottom: 4 },
  accountName: { fontSize: 18, fontWeight: '900' },
  accountEmail: { fontSize: 13, fontWeight: '700', marginTop: 3 },
  section: { borderRadius: 24, marginBottom: Spacing.lg, overflow: 'hidden' },
  sectionHeader: { fontSize: 12, fontWeight: '800', marginLeft: 18, marginBottom: 8, marginTop: 16, textTransform: 'uppercase' },
  settingItem: { minHeight: 68, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingVertical: 12, borderBottomWidth: 0.5 },
  settingLeft: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center' },
  settingRight: { flexDirection: 'row', alignItems: 'center', flexShrink: 1 },
  iconBox: { width: 38, height: 38, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  settingLabel: { fontSize: 16, fontWeight: '700', lineHeight: 21 },
  settingTextBlock: { flex: 1, minWidth: 0, minHeight: 38, justifyContent: 'center' },
  settingSubtitle: { marginTop: 2, fontSize: 12, lineHeight: 17, fontWeight: '600' },
  versionText: { fontSize: 15, fontWeight: '700' },
});
