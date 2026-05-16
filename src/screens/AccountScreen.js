import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ChevronRight, Crown, Info, Landmark, LogIn, RefreshCcw, ShieldCheck, User as UserIcon } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ProfileAvatar from '../components/ProfileAvatar';
import AppRefreshControl from '../components/AppRefreshControl';
import { SettingsItem, SettingsSection } from '../components/SettingsList';
import Footer from '../components/Footer';
import { useTheme, Spacing } from '../constants/Theme';
import { useAppPreferences } from '../context/AppPreferencesContext';
import { useAuth } from '../context/AuthContext';
import { useRemoteSettings } from '../context/RemoteSettingsContext';
import { useRevenueCat } from '../context/RevenueCatContext';
import { getTranslation } from '../constants/i18n';
import { REVENUECAT_ENTITLEMENT_ID } from '../constants/revenueCat';
import { REVENUECAT_NATIVE_MODULE_UNAVAILABLE } from '../services/RevenueCatService';
import { getUserProfile } from '../utils/userProfile';

export default function AccountScreen({ navigation }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { language } = useAppPreferences();
  const { user, accountProfile, isAuthReady, refreshSession } = useAuth();
  const { paymentEnabled, refreshRemoteSettings } = useRemoteSettings();
  const { isPremium, openCustomerCenter, openPaywall, restorePurchases } = useRevenueCat();
  const [refreshing, setRefreshing] = useState(false);
  const [premiumAction, setPremiumAction] = useState(null);
  const t = (key) => getTranslation(language, key);
  const profile = getUserProfile(user, {
    ...(accountProfile || {}),
    is_premium: Boolean(accountProfile?.is_premium || isPremium),
  });

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        refreshSession?.().catch(() => null),
        refreshRemoteSettings?.().catch(() => null),
      ]);
    } finally {
      setRefreshing(false);
    }
  }, [refreshRemoteSettings, refreshSession]);

  const runPremiumAction = useCallback(async (action, fn) => {
    setPremiumAction(action);
    try {
      await fn();
    } catch (error) {
      Alert.alert(
        t('common.error'),
        error?.code === REVENUECAT_NATIVE_MODULE_UNAVAILABLE
          ? t('revenueCat.paywallUnavailable')
          : error?.message || t('revenueCat.paywallUnavailable')
      );
    } finally {
      setPremiumAction(null);
    }
  }, [t]);

  const handlePremiumPress = useCallback(() => {
    if (!user) {
      navigation.navigate('AccountDetail');
      return;
    }

    runPremiumAction('premium', async () => {
      if (isPremium) {
        await openCustomerCenter();
        return;
      }

      const result = await openPaywall({ onlyIfNeeded: true });
      if (result?.entitlementActive) {
        Alert.alert(t('common.success'), t('revenueCat.purchaseSuccess'));
      }
    });
  }, [isPremium, navigation, openCustomerCenter, openPaywall, runPremiumAction, t, user]);

  const handleRestorePurchases = useCallback(() => {
    runPremiumAction('restore', async () => {
      const info = await restorePurchases();
      const active = Boolean(info?.entitlements?.active?.[REVENUECAT_ENTITLEMENT_ID]);
      Alert.alert(
        active ? t('common.success') : t('revenueCat.upgradeTitle'),
        active ? t('revenueCat.restoreSuccess') : t('revenueCat.restoreNoEntitlement')
      );
    });
  }, [restorePurchases, runPremiumAction, t]);

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
        <AccountEntryCard
          colors={colors}
          profile={profile}
          user={user}
          isAuthReady={isAuthReady}
          t={t}
          onPress={() => navigation.navigate('AccountDetail')}
        />

        {user && paymentEnabled && (
          <SettingsSection title={t('revenueCat.sectionTitle')} colors={colors}>
            <SettingsItem
              icon={<Crown size={22} color={isPremium ? colors.success : colors.primary} />}
              label={isPremium ? t('revenueCat.manageTitle') : t('revenueCat.upgradeTitle')}
              subtitle={isPremium ? t('revenueCat.manageDesc') : t('revenueCat.upgradeDesc')}
              right={premiumAction === 'premium' ? <ActivityIndicator color={colors.primary} /> : null}
              onPress={handlePremiumPress}
              colors={colors}
            />
            <SettingsItem
              icon={<RefreshCcw size={22} color={colors.primary} />}
              label={t('revenueCat.restorePurchases')}
              subtitle={t('revenueCat.restoreDesc')}
              right={premiumAction === 'restore' ? <ActivityIndicator color={colors.primary} /> : null}
              onPress={handleRestorePurchases}
              colors={colors}
            />
          </SettingsSection>
        )}

        {user && (
          <SettingsSection title={t('accountPresets.sectionTitle')} colors={colors}>
            <SettingsItem
              icon={<UserIcon size={22} color={colors.primary} />}
              label={t('accountPresets.ecardList')}
              subtitle={t('accountPresets.ecardListDesc')}
              onPress={() => navigation.navigate('AccountPresets', { kind: 'ecard' })}
              colors={colors}
            />
            <SettingsItem
              icon={<Landmark size={22} color={colors.primary} />}
              label={t('accountPresets.bankList')}
              subtitle={t('accountPresets.bankListDesc')}
              onPress={() => navigation.navigate('AccountPresets', { kind: 'bank' })}
              colors={colors}
            />
          </SettingsSection>
        )}

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

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: Spacing.lg },
  accountCard: { borderRadius: 24, padding: 16, marginBottom: Spacing.lg, flexDirection: 'row', alignItems: 'center' },
  loginAvatar: { width: 62, height: 62, borderRadius: 31, alignItems: 'center', justifyContent: 'center' },
  accountBody: { flex: 1, minWidth: 0, marginLeft: 14 },
  accountEyebrow: { fontSize: 11, fontWeight: '900', textTransform: 'uppercase', marginBottom: 4 },
  accountName: { fontSize: 18, fontWeight: '900' },
  accountEmail: { fontSize: 13, fontWeight: '700', marginTop: 3 },
  versionText: { fontSize: 15, fontWeight: '700' },
});
