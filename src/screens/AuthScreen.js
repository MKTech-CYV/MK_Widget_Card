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
import { Globe2, LogIn, LogOut, Mail, ShieldCheck, UserPlus } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ProfileAvatar from '../components/ProfileAvatar';
import { useTheme, Spacing } from '../constants/Theme';
import { useAppPreferences } from '../context/AppPreferencesContext';
import { useAuth } from '../context/AuthContext';
import { getTranslation } from '../constants/i18n';
import { getUserProfile } from '../utils/userProfile';

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
    isAuthReady,
    isSupabaseConfigured,
    authRedirectUrl,
    signInWithPassword,
    signUpWithPassword,
    signInWithGoogle,
    refreshSession,
    signOut,
  } = useAuth();
  const [mode, setMode] = useState('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loadingAction, setLoadingAction] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const profile = getUserProfile(user);
  const isEmailVerified = Boolean(user?.email_confirmed_at || user?.confirmed_at);
  const createdAt = formatAccountDate(user?.created_at);
  const lastSignInAt = formatAccountDate(user?.last_sign_in_at);

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

  const handleEmailSubmit = () => runAuthAction(mode, async () => {
    if (!email.trim() || !password) {
      Alert.alert(t('common.error'), t('auth.emailPasswordRequired'));
      return;
    }

    if (mode === 'signup') {
      const data = await signUpWithPassword({ email, password });
      if (!data?.session) {
        Alert.alert(t('auth.checkEmailTitle'), t('auth.checkEmailDesc'));
      }
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
          <View style={styles.segmentedControl}>
            <TouchableOpacity
              style={[styles.segment, mode === 'signin' && { backgroundColor: colors.primary }]}
              onPress={() => setMode('signin')}
            >
              <Text style={[styles.segmentText, { color: mode === 'signin' ? '#fff' : colors.textSecondary }]}>
                {t('auth.signIn')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.segment, mode === 'signup' && { backgroundColor: colors.primary }]}
              onPress={() => setMode('signup')}
            >
              <Text style={[styles.segmentText, { color: mode === 'signup' ? '#fff' : colors.textSecondary }]}>
                {t('auth.signUp')}
              </Text>
            </TouchableOpacity>
          </View>

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
                textContentType={mode === 'signup' ? 'newPassword' : 'password'}
              />
            </View>
          </View>

          <TouchableOpacity
            style={[styles.primaryButton, { backgroundColor: colors.primary }, !isSupabaseConfigured && styles.disabledButton]}
            onPress={handleEmailSubmit}
            disabled={!isSupabaseConfigured || Boolean(loadingAction)}
          >
            {loadingAction === mode ? (
              <ActivityIndicator color="#fff" />
            ) : mode === 'signup' ? (
              <UserPlus color="#fff" size={18} />
            ) : (
              <LogIn color="#fff" size={18} />
            )}
            <Text style={styles.primaryButtonText}>{mode === 'signup' ? t('auth.createAccount') : t('auth.signIn')}</Text>
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

          <Text style={[styles.redirectHint, { color: colors.textSecondary }]}>
            {t('auth.redirectHint')}: {authRedirectUrl}
          </Text>
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
  profileCard: {
    borderRadius: 28,
    padding: Spacing.lg,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  profileHeader: { alignItems: 'center', marginBottom: Spacing.lg },
  segmentedControl: { flexDirection: 'row', padding: 5, borderRadius: 15, marginBottom: Spacing.lg, backgroundColor: 'rgba(142,142,147,0.12)' },
  segment: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 11, borderRadius: 12 },
  segmentText: { fontSize: 14, fontWeight: '800' },
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
