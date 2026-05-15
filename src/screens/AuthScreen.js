import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Camera, Globe2, LogIn, LogOut, Mail, ShieldCheck } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ProfileAvatar from '../components/ProfileAvatar';
import { useTheme, Spacing } from '../constants/Theme';
import { useAppPreferences } from '../context/AppPreferencesContext';
import { useAuth } from '../context/AuthContext';
import { getTranslation } from '../constants/i18n';
import { getUserProfile } from '../utils/userProfile';
import { uploadImageToBucket } from '../services/SupabaseStorageService';
import { updateProfileAvatar } from '../services/ProfileService';

const formatAccountDate = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString();
};

export default function AuthScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { language } = useAppPreferences();
  const t = (key) => getTranslation(language, key);
  const {
    user,
    accountProfile,
    isAuthReady,
    isSupabaseConfigured,
    signInWithPassword,
    signInWithGoogle,
    refreshSession,
    cacheAccountProfile,
    signOut,
  } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loadingAction, setLoadingAction] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const profile = getUserProfile(user, accountProfile);
  const isEmailVerified = Boolean(user?.email_confirmed_at || user?.confirmed_at);
  const createdAt = formatAccountDate(user?.created_at);
  const lastSignInAt = formatAccountDate(user?.last_sign_in_at);
  const premiumExpiredAt = formatAccountDate(profile.premiumExpiredAt);

  const runAuthAction = async (action, fn) => {
    setLoadingAction(action);
    try {
      await fn();
    } catch (error) {
      Alert.alert(t('common.error'), error?.message || t('auth.genericError'));
    } finally {
      setLoadingAction(null);
    }
  };

  const handleEmailSubmit = () => runAuthAction('signin', async () => {
    if (!email.trim() || !password) {
      Alert.alert(t('common.error'), t('auth.emailPasswordRequired'));
      return;
    }

    await signInWithPassword({ email, password });
  });

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshSession?.();
    } catch {
      // Keep the current account view if refreshing the session fails.
    } finally {
      setRefreshing(false);
    }
  };

  const handleAvatarUpload = () => runAuthAction('avatar', async () => {
    if (!user?.id) return;

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(t('common.error'), t('auth.avatarPermissionDenied'));
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.72,
      base64: true,
    });

    if (result.canceled || !result.assets?.length) return;

    const upload = await uploadImageToBucket({
      bucket: 'avatars',
      userId: user.id,
      asset: result.assets[0],
      prefix: 'avatar',
    });
    const nextProfile = await updateProfileAvatar(user.id, upload.publicUrl);
    await cacheAccountProfile(nextProfile);
  });

  if (!isAuthReady) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (user) {
    return (
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 60 }]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            tintColor={colors.primary}
            onRefresh={handleRefresh}
          />
        }
      >
        <Text style={[styles.screenTitle, { color: colors.text }]}>{t('auth.accountTitle')}</Text>

        <View style={[styles.profileCard, { backgroundColor: colors.card }]}>
          <View style={styles.profileHeader}>
            <ProfileAvatar profile={profile} colors={colors} size={86} />
            <TouchableOpacity
              style={[styles.avatarEditButton, { backgroundColor: colors.primary }]}
              onPress={handleAvatarUpload}
              disabled={Boolean(loadingAction)}
              accessibilityRole="button"
              accessibilityLabel={t('auth.updateAvatar')}
            >
              {loadingAction === 'avatar' ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Camera color="#fff" size={16} />
              )}
            </TouchableOpacity>
          </View>

          <Text style={[styles.accountTitle, { color: colors.text }]} numberOfLines={2}>
            {profile.displayName}
          </Text>
          <Text style={[styles.accountEmail, { color: colors.textSecondary }]} numberOfLines={1}>
            {profile.email || user.id}
          </Text>

          <View style={styles.profilePillRow}>
            <View style={[styles.profilePill, { backgroundColor: `${colors.success}16` }]}>
              <ShieldCheck color={colors.success} size={14} />
              <Text style={[styles.profilePillText, { color: colors.success }]}>
                {t('auth.accountReady')}
              </Text>
            </View>
            <View style={[styles.profilePill, { backgroundColor: `${colors.primary}14` }]}>
              <Text style={[styles.profilePillText, { color: colors.primary }]}>
                {profile.provider === 'google' ? 'Google' : 'Email'}
              </Text>
            </View>
            <View style={[styles.profilePill, { backgroundColor: `${isEmailVerified ? colors.success : colors.textSecondary}14` }]}>
              <Text style={[styles.profilePillText, { color: isEmailVerified ? colors.success : colors.textSecondary }]}>
                {isEmailVerified ? t('auth.emailVerified') : t('auth.emailUnverified')}
              </Text>
            </View>
          </View>

          <View style={[styles.accountDetails, { backgroundColor: colors.background }]}>
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>
                {t('auth.userId')}
              </Text>
              <Text style={[styles.detailValue, { color: colors.text }]} numberOfLines={1}>
                {profile.shortId || user.id}
              </Text>
            </View>
            {!!createdAt && (
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>
                  {t('auth.createdAt')}
                </Text>
                <Text style={[styles.detailValue, { color: colors.text }]} numberOfLines={1}>
                  {createdAt}
                </Text>
              </View>
            )}
            {!!lastSignInAt && (
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>
                  {t('auth.lastSignIn')}
                </Text>
                <Text style={[styles.detailValue, { color: colors.text }]} numberOfLines={1}>
                  {lastSignInAt}
                </Text>
              </View>
            )}
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>
                {t('auth.premiumStatus')}
              </Text>
              <Text style={[styles.detailValue, { color: profile.isPremium ? colors.success : colors.text }]} numberOfLines={1}>
                {profile.isPremium ? t('auth.premiumActive') : t('auth.premiumInactive')}
              </Text>
            </View>
            {!!premiumExpiredAt && (
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>
                  {t('auth.premiumExpiredAt')}
                </Text>
                <Text style={[styles.detailValue, { color: colors.text }]} numberOfLines={1}>
                  {premiumExpiredAt}
                </Text>
              </View>
            )}
          </View>
        </View>

        <TouchableOpacity
          style={[styles.dangerButton, { backgroundColor: `${colors.error}14` }]}
          onPress={() => runAuthAction('signout', signOut)}
          disabled={Boolean(loadingAction)}
        >
          {loadingAction === 'signout' ? (
            <ActivityIndicator color={colors.error} />
          ) : (
            <LogOut color={colors.error} size={18} />
          )}
          <Text style={[styles.dangerButtonText, { color: colors.error }]}>{t('auth.signOut')}</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 60 }]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            tintColor={colors.primary}
            onRefresh={handleRefresh}
          />
        }
      >
        <Text style={[styles.screenTitle, { color: colors.text }]}>{t('auth.accountTitle')}</Text>

        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <Text style={[styles.authTitle, { color: colors.text }]}>{t('auth.signIn')}</Text>
          <Text style={[styles.authDesc, { color: colors.textSecondary }]}>{t('auth.signInOnlyDesc')}</Text>

          {!isSupabaseConfigured && (
            <Text style={[styles.configWarning, { color: colors.error }]}>
              {t('auth.missingConfig')}
            </Text>
          )}

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>{t('auth.email')}</Text>
            <View style={[styles.inputRow, { backgroundColor: colors.background }]}>
              <Mail color={colors.textSecondary} size={18} />
              <TextInput
                style={[styles.input, { color: colors.text }]}
                value={email}
                onChangeText={setEmail}
                placeholder={t('auth.emailPlaceholder')}
                placeholderTextColor={colors.textSecondary}
                autoCapitalize="none"
                keyboardType="email-address"
                textContentType="emailAddress"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>{t('auth.password')}</Text>
            <View style={[styles.inputRow, { backgroundColor: colors.background }]}>
              <ShieldCheck color={colors.textSecondary} size={18} />
              <TextInput
                style={[styles.input, { color: colors.text }]}
                value={password}
                onChangeText={setPassword}
                placeholder={t('auth.passwordPlaceholder')}
                placeholderTextColor={colors.textSecondary}
                autoCapitalize="none"
                secureTextEntry
                textContentType="password"
              />
            </View>
          </View>

          <TouchableOpacity
            style={[styles.primaryButton, { backgroundColor: colors.primary }, !isSupabaseConfigured && styles.disabledButton]}
            onPress={handleEmailSubmit}
            disabled={!isSupabaseConfigured || Boolean(loadingAction)}
          >
            {loadingAction === 'signin' ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <LogIn color="#fff" size={18} />
            )}
            <Text style={styles.primaryButtonText}>{t('auth.signIn')}</Text>
          </TouchableOpacity>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <TouchableOpacity
            style={[styles.googleButton, { borderColor: colors.border }, !isSupabaseConfigured && styles.disabledButton]}
            onPress={() => runAuthAction('google', signInWithGoogle)}
            disabled={!isSupabaseConfigured || Boolean(loadingAction)}
          >
            {loadingAction === 'google' ? (
              <ActivityIndicator color={colors.primary} />
            ) : (
              <Globe2 color={colors.primary} size={18} />
            )}
            <Text style={[styles.googleButtonText, { color: colors.text }]}>{t('auth.continueWithGoogle')}</Text>
          </TouchableOpacity>

        </View>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centerContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scrollContent: { padding: Spacing.lg },
  screenTitle: { fontSize: 32, fontWeight: '800', marginBottom: Spacing.xl },
  card: { borderRadius: 24, padding: Spacing.lg, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 16, elevation: 4 },
  authTitle: { fontSize: 24, fontWeight: '900', marginBottom: 6 },
  authDesc: { fontSize: 14, lineHeight: 20, fontWeight: '600', marginBottom: Spacing.lg },
  profileCard: {
    borderRadius: 28,
    padding: Spacing.lg,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  profileHeader: { alignItems: 'center', marginBottom: Spacing.lg, position: 'relative' },
  avatarEditButton: { position: 'absolute', right: -4, bottom: -4, width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: '#fff' },
  configWarning: { fontSize: 14, fontWeight: '700', lineHeight: 20, marginBottom: Spacing.md },
  inputGroup: { marginBottom: Spacing.md },
  label: { fontSize: 12, fontWeight: '800', textTransform: 'uppercase', marginBottom: 8, marginLeft: 4 },
  inputRow: { flexDirection: 'row', alignItems: 'center', borderRadius: 15, paddingHorizontal: 14, height: 56 },
  input: { flex: 1, fontSize: 16, marginLeft: 10 },
  primaryButton: { height: 54, borderRadius: 16, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', marginTop: 4 },
  primaryButtonText: { color: '#fff', fontSize: 16, fontWeight: '800', marginLeft: 8 },
  disabledButton: { opacity: 0.58 },
  divider: { height: StyleSheet.hairlineWidth, marginVertical: Spacing.lg },
  googleButton: { height: 54, borderRadius: 16, borderWidth: 1, alignItems: 'center', justifyContent: 'center', flexDirection: 'row' },
  googleButtonText: { fontSize: 16, fontWeight: '800', marginLeft: 8 },
  redirectHint: { marginTop: Spacing.md, fontSize: 12, lineHeight: 17 },
  accountTitle: { fontSize: 26, fontWeight: '900', marginBottom: 6, textAlign: 'center' },
  accountEmail: { fontSize: 16, fontWeight: '700', marginBottom: Spacing.md, textAlign: 'center' },
  profilePillRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', gap: 8, marginBottom: Spacing.lg },
  profilePill: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7, flexDirection: 'row', alignItems: 'center', gap: 5 },
  profilePillText: { fontSize: 12, fontWeight: '900' },
  accountDetails: { alignSelf: 'stretch', borderRadius: 18, padding: Spacing.md, marginBottom: Spacing.lg },
  detailRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 30 },
  detailLabel: { fontSize: 13, fontWeight: '800' },
  detailValue: { flex: 1, textAlign: 'right', fontSize: 14, fontWeight: '800', marginLeft: Spacing.md },
  dangerButton: { height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', marginTop: Spacing.lg },
  dangerButtonText: { fontSize: 16, fontWeight: '800', marginLeft: 8 },
});
