import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Bell, Image as ImageIcon } from 'lucide-react-native';
import PreferencesSection from '../components/PreferencesSection';
import ScreenScaffold from '../components/ScreenScaffold';
import { SettingsItem, SettingsSection } from '../components/SettingsList';
import Footer from '../components/Footer';
import { useTheme } from '../constants/Theme';
import { useAppPreferences } from '../context/AppPreferencesContext';
import { useAuth } from '../context/AuthContext';
import { getTranslation } from '../constants/i18n';
import { fetchPublicNotifications } from '../services/NotificationService';
import { fetchECardPresets, updateECardPreset } from '../services/AccountPresetService';
import { deleteStorageFile, uploadImageToBucket } from '../services/FirebaseStorageService';
import { StorageService } from '../services/StorageService';

export default function AppSettingsScreen({ navigation, route }) {
  const { colors } = useTheme();
  const { language } = useAppPreferences();
  const { user, accountProfile } = useAuth();
  const [remoteNotifications, setRemoteNotifications] = useState([]);
  const [notificationLoading, setNotificationLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [changingLogo, setChangingLogo] = useState(false);
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

  const promptSignInForLogo = useCallback(() => {
    Alert.alert(
      t('auth.signInPrompt'),
      t('auth.signInPromptDesc'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('auth.signIn'),
          onPress: () => navigation.getParent()?.navigate('AccountTab', { screen: 'AccountDetail' }),
        },
      ]
    );
  }, [navigation, t]);

  const handleChangeLogo = useCallback(async () => {
    if (changingLogo) return;

    if (!user?.id) {
      promptSignInForLogo();
      return;
    }

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(t('common.error'), t('myCard.imagePermissionDenied'));
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.6,
      base64: false,
    });

    if (result.canceled || !result.assets?.length) return;

    setChangingLogo(true);
    let upload = null;
    try {
      upload = await uploadImageToBucket({
        bucket: 'ecards',
        userId: user.id,
        asset: result.assets[0],
        prefix: 'ecard-logo',
      });

      StorageService.init();
      const currentData = await StorageService.getUserData().catch(() => null) || {};
      await StorageService.setUserData({ ...currentData, logoUrl: upload.publicUrl });

      const selectedEcardId = accountProfile?.selected_ecard_id;
      if (selectedEcardId) {
        const presets = await fetchECardPresets().catch(() => []);
        const existing = presets.find((item) => item.id === selectedEcardId);
        if (existing) {
          await updateECardPreset(selectedEcardId, { logo_url: upload.publicUrl }, existing);
        }
      }

      Alert.alert(t('common.success'), t('myCard.logoUpdateSuccess'));
    } catch (error) {
      if (upload?.path) {
        await deleteStorageFile({ bucket: 'ecards', path: upload.path }).catch(() => null);
      }
      Alert.alert(t('common.error'), error?.message || t('myCard.logoUpdateFailed'));
    } finally {
      setChangingLogo(false);
    }
  }, [accountProfile?.selected_ecard_id, changingLogo, promptSignInForLogo, t, user?.id]);

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

      <SettingsSection title={t('settings.ecardSection')} colors={colors}>
        <SettingsItem
          icon={changingLogo ? <ActivityIndicator color={colors.primary} /> : <ImageIcon size={22} color={colors.primary} />}
          label={t('settings.changeLogo')}
          subtitle={t('settings.changeLogoDesc')}
          onPress={handleChangeLogo}
          colors={colors}
        />
      </SettingsSection>

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
