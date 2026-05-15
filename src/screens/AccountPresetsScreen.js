import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Image, Modal, RefreshControl, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect } from '@react-navigation/native';
import { Camera, Check, ChevronDown, CreditCard, Globe, Pencil, Save, Search, Share2, Trash2, User as UserIcon, X } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Footer from '../components/Footer';
import { useTheme, Spacing } from '../constants/Theme';
import { useAppPreferences } from '../context/AppPreferencesContext';
import { useAuth } from '../context/AuthContext';
import { getTranslation } from '../constants/i18n';
import { StorageService } from '../services/StorageService';
import {
  bankQrPresetToLocalData,
  deleteBankQrPreset,
  deleteECardPreset,
  ecardPresetToLocalData,
  fetchBankQrPresets,
  fetchECardPresets,
  fetchProfileWithSelectedPresets,
  setSelectedBankQrPreset,
  setSelectedECardPreset,
  updateBankQrPreset,
  updateECardPreset
} from '../services/AccountPresetService';
import { uploadImageToBucket } from '../services/SupabaseStorageService';
import { formatInternationalPhone, normalizeCountryCode, normalizePhoneForCountry } from '../utils/vcard';
import { buildBankQrShareUrl, buildECardShareUrl, shareUrl } from '../utils/ecardShareLink';

const formatDate = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString();
};

const compactText = (value) => `${value || ''}`.trim();

const ALL_COUNTRIES = [
  { code: '84', name: 'Việt Nam' }, { code: '1', name: 'United States' }, { code: '44', name: 'United Kingdom' },
  { code: '81', name: 'Japan' }, { code: '82', name: 'South Korea' }, { code: '65', name: 'Singapore' },
  { code: '61', name: 'Australia' }, { code: '33', name: 'France' }, { code: '49', name: 'Germany' },
  { code: '86', name: 'China' }, { code: '66', name: 'Thailand' }, { code: '60', name: 'Malaysia' },
  { code: '852', name: 'Hong Kong' }, { code: '886', name: 'Taiwan' }, { code: '7', name: 'Russia' },
  { code: '91', name: 'India' }, { code: '39', name: 'Italy' }, { code: '34', name: 'Spain' },
  { code: '1', name: 'Canada' }, { code: '62', name: 'Indonesia' }, { code: '63', name: 'Philippines' },
  { code: '855', name: 'Cambodia' }, { code: '856', name: 'Laos' }, { code: '95', name: 'Myanmar' },
  { code: '41', name: 'Switzerland' }, { code: '31', name: 'Netherlands' }, { code: '46', name: 'Sweden' },
  { code: '47', name: 'Norway' }, { code: '45', name: 'Denmark' }, { code: '358', name: 'Finland' },
  { code: '32', name: 'Belgium' }, { code: '43', name: 'Austria' }, { code: '351', name: 'Portugal' },
  { code: '30', name: 'Greece' }, { code: '90', name: 'Turkey' }, { code: '971', name: 'UAE' },
].sort((a, b) => a.name.localeCompare(b.name));

const SORTED_COUNTRIES = [
  { code: '84', name: 'Việt Nam' },
  ...ALL_COUNTRIES.filter(c => c.code !== '84' || c.name !== 'Việt Nam')
];

const ecardPresetToEditForm = (item = {}) => {
  const social = item.social || {};

  return {
    label: item.label || '',
    full_name: item.full_name || '',
    job_title: item.job_title || '',
    company: item.company || '',
    department: item.department || '',
    email: item.email || '',
    phone: item.phone || '',
    phone_country_code: item.phone_country_code || social.countryCode || social.country_code || '84',
    website: item.website || '',
    address: item.address || '',
    avatar_url: item.avatar_url || '',
    linkedin: social.linkedin || '',
    facebook: social.facebook || '',
    zalo: social.zalo || '',
    zaloCountryCode: social.zaloCountryCode || social.zalo_country_code || '84',
    whatsapp: social.whatsapp || '',
    whatsappCountryCode: social.whatsappCountryCode || social.whatsapp_country_code || '84',
    telegram: social.telegram || '',
    bio: social.bio || '',
    countryCode: item.phone_country_code || social.countryCode || social.country_code || '84',
  };
};

const bankPresetToEditForm = (item = {}) => ({
  label: item.label || '',
  bank_code: item.bank_code || '',
  bank_name: item.bank_name || '',
  account_number: item.account_number || '',
  account_holder_name: item.account_holder_name || '',
});

const ecardEditFormToPayload = (form = {}) => ({
  label: compactText(form.label) || compactText(form.full_name) || 'eCard',
  full_name: compactText(form.full_name),
  job_title: compactText(form.job_title),
  company: compactText(form.company),
  department: compactText(form.department),
  email: compactText(form.email),
  phone: normalizePhoneForCountry(form.phone, form.phone_country_code || form.countryCode || '84'),
  phone_country_code: normalizeCountryCode(form.phone_country_code || form.countryCode || '84'),
  website: compactText(form.website),
  address: compactText(form.address),
  avatar_url: compactText(form.avatar_url),
  social: {
    linkedin: compactText(form.linkedin),
    facebook: compactText(form.facebook),
    zalo: normalizePhoneForCountry(form.zalo, form.zaloCountryCode || form.phone_country_code || form.countryCode || '84'),
    zaloCountryCode: normalizeCountryCode(form.zaloCountryCode || form.phone_country_code || form.countryCode || '84'),
    whatsapp: normalizePhoneForCountry(form.whatsapp, form.whatsappCountryCode || form.phone_country_code || form.countryCode || '84'),
    whatsappCountryCode: normalizeCountryCode(form.whatsappCountryCode || form.phone_country_code || form.countryCode || '84'),
    telegram: compactText(form.telegram),
    bio: compactText(form.bio),
    countryCode: normalizeCountryCode(form.phone_country_code || form.countryCode || '84'),
    avatarUrl: compactText(form.avatar_url),
  },
});

const bankQrUrlFromForm = (form = {}) => {
  if (!compactText(form.bank_code) || !compactText(form.account_number)) return '';
  return `https://img.vietqr.io/image/${compactText(form.bank_code)}-${compactText(form.account_number)}-qr_only.png?accountName=${encodeURIComponent(compactText(form.account_holder_name))}`;
};

const bankEditFormToPayload = (form = {}) => ({
  label: compactText(form.label) || compactText(form.bank_name) || 'QR Bank',
  bank_code: compactText(form.bank_code),
  bank_name: compactText(form.bank_name),
  account_number: compactText(form.account_number).replace(/[^\d]/g, ''),
  account_holder_name: compactText(form.account_holder_name),
  qr_payload: {
    bankName: compactText(form.bank_code),
    bankAccount: compactText(form.account_number).replace(/[^\d]/g, ''),
    bankAccountHolderName: compactText(form.account_holder_name),
  },
  qr_url: bankQrUrlFromForm(form),
});

export default function AccountPresetsScreen({ navigation, route }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { language } = useAppPreferences();
  const { user, isAuthReady } = useAuth();
  const t = useCallback((key) => getTranslation(language, key), [language]);
  const kind = route?.params?.kind === 'bank' ? 'bank' : 'ecard';
  const isBank = kind === 'bank';
  const [items, setItems] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionId, setActionId] = useState(null);
  const [editingItem, setEditingItem] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [savingEdit, setSavingEdit] = useState(false);

  const load = useCallback(async () => {
    if (!user?.id) {
      setItems([]);
      setSelectedId(null);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    setLoading(true);
    try {
      const [presetList, profile] = await Promise.all([
        isBank ? fetchBankQrPresets() : fetchECardPresets(),
        fetchProfileWithSelectedPresets(user.id).catch(() => null),
      ]);

      setItems(presetList);
      setSelectedId(isBank ? profile?.selected_bank_qr_id : profile?.selected_ecard_id);
    } catch (error) {
      Alert.alert(t('common.error'), error?.message || t('accountPresets.loadFailed'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isBank, t, user?.id]);

  useFocusEffect(useCallback(() => {
    load();
  }, [load]));

  const handleRefresh = () => {
    setRefreshing(true);
    load();
  };

  const handleApply = async (item) => {
    if (!user?.id) return;

    setActionId(item.id);
    try {
      StorageService.init();
      const currentData = await StorageService.getUserData() || {};
      const patch = isBank ? bankQrPresetToLocalData(item) : ecardPresetToLocalData(item);
      const nextData = {
        ...currentData,
        ...patch,
      };

      if (isBank) {
        await setSelectedBankQrPreset(user.id, item.id);
      } else {
        await setSelectedECardPreset(user.id, item.id);
      }

      await StorageService.setUserData(nextData);
      setSelectedId(item.id);
      Alert.alert(t('common.success'), t('accountPresets.applySuccess'), [
        {
          text: t('common.close'),
          onPress: () => navigation.getParent()?.navigate('MyCardTab', { refreshRequestId: Date.now() }),
        },
      ]);
    } catch (error) {
      Alert.alert(t('common.error'), error?.message || t('accountPresets.applyFailed'));
    } finally {
      setActionId(null);
    }
  };

  const handleShareECard = async (item) => {
    try {
      const url = buildECardShareUrl(item, language);
      await shareUrl({ title: t('myCard.shareECard'), url });
    } catch (error) {
      Alert.alert(t('common.error'), t('myCard.shareFailed'));
    }
  };

  const handleShareBankQr = async (item) => {
    try {
      const url = buildBankQrShareUrl(item);
      if (!url) {
        Alert.alert(t('common.error'), t('myCard.noBankQr'));
        return;
      }
      await shareUrl({ title: t('myCard.shareBankQr'), url });
    } catch (error) {
      Alert.alert(t('common.error'), t('myCard.shareBankFailed'));
    }
  };

  const handleDelete = (item) => {
    Alert.alert(
      t('accountPresets.deleteTitle'),
      t('accountPresets.deleteDesc'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('accountPresets.deleteAction'),
          style: 'destructive',
          onPress: async () => {
            setActionId(item.id);
            try {
              if (isBank) {
                await deleteBankQrPreset(item.id);
              } else {
                await deleteECardPreset(item.id);
              }
              await load();
            } catch (error) {
              Alert.alert(t('common.error'), error?.message || t('accountPresets.deleteFailed'));
            } finally {
              setActionId(null);
            }
          }
        },
      ]
    );
  };

  const handleStartEdit = (item) => {
    setEditingItem(item);
    setEditForm(isBank ? bankPresetToEditForm(item) : ecardPresetToEditForm(item));
  };

  const handleSaveEdit = async () => {
    if (!editingItem) return;
    if (isBank && !compactText(editForm.account_holder_name)) {
      Alert.alert(t('common.error'), t('myCard.bankHolderRequired'));
      return;
    }

    setSavingEdit(true);
    try {
      const payload = isBank ? bankEditFormToPayload(editForm) : ecardEditFormToPayload(editForm);
      const updated = isBank
        ? await updateBankQrPreset(editingItem.id, payload)
        : await updateECardPreset(editingItem.id, payload);

      if (selectedId === editingItem.id && updated) {
        StorageService.init();
        const currentData = await StorageService.getUserData() || {};
        const patch = isBank ? bankQrPresetToLocalData(updated) : ecardPresetToLocalData(updated);
        await StorageService.setUserData({ ...currentData, ...patch });
      }

      setEditingItem(null);
      setEditForm({});
      await load();
      Alert.alert(t('common.success'), t('accountPresets.editSuccess'));
    } catch (error) {
      Alert.alert(t('common.error'), error?.message || t('accountPresets.editFailed'));
    } finally {
      setSavingEdit(false);
    }
  };

  if (!isAuthReady || loading) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 58 }]}
        refreshControl={
          <RefreshControl refreshing={refreshing} tintColor={colors.primary} onRefresh={handleRefresh} />
        }
      >
        <Text style={[styles.screenTitle, { color: colors.text }]}>
          {isBank ? t('accountPresets.bankTitle') : t('accountPresets.ecardTitle')}
        </Text>
        <Text style={[styles.screenDesc, { color: colors.textSecondary }]}>
          {isBank ? t('accountPresets.bankDesc') : t('accountPresets.ecardDesc')}
        </Text>

        {!user ? (
          <View style={[styles.emptyCard, { backgroundColor: colors.card }]}>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>{t('auth.signInPrompt')}</Text>
            <Text style={[styles.emptyDesc, { color: colors.textSecondary }]}>{t('auth.signInPromptDesc')}</Text>
          </View>
        ) : !items.length ? (
          <View style={[styles.emptyCard, { backgroundColor: colors.card }]}>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>{t('accountPresets.emptyTitle')}</Text>
            <Text style={[styles.emptyDesc, { color: colors.textSecondary }]}>
              {isBank ? t('accountPresets.emptyBankDesc') : t('accountPresets.emptyECardDesc')}
            </Text>
          </View>
        ) : (
          <View style={styles.list}>
            {items.map((item) => (
              <PresetCard
                key={item.id}
                item={item}
                isBank={isBank}
                selected={selectedId === item.id}
                loading={actionId === item.id}
                colors={colors}
                t={t}
                onApply={() => handleApply(item)}
                onShare={() => (isBank ? handleShareBankQr(item) : handleShareECard(item))}
                onEdit={() => handleStartEdit(item)}
                onDelete={() => handleDelete(item)}
              />
            ))}
          </View>
        )}

        <Footer />
      </ScrollView>
      <PresetEditModal
        visible={Boolean(editingItem)}
        isBank={isBank}
        form={editForm}
        saving={savingEdit}
        userId={user?.id}
        colors={colors}
        t={t}
        onChange={(key, value) => setEditForm(current => ({ ...current, [key]: value }))}
        onCancel={() => {
          if (savingEdit) return;
          setEditingItem(null);
          setEditForm({});
        }}
        onSave={handleSaveEdit}
      />
    </View>
  );
}

const PresetCard = ({ item, isBank, selected, loading, colors, t, onApply, onShare, onEdit, onDelete }) => {
  const social = item.social || {};
  const phoneDisplay = !isBank
    ? formatInternationalPhone(item.phone_country_code || social.countryCode || social.country_code || '84', item.phone)
    : '';
  const title = item.label || (isBank ? item.bank_name : item.full_name) || (isBank ? t('accountPresets.bankFallback') : t('accountPresets.ecardFallback'));
  const subtitle = isBank
    ? [item.bank_name || item.bank_code, item.account_number].filter(Boolean).join(' • ')
    : [item.job_title, item.company].filter(Boolean).join(' • ');
  const meta = isBank
    ? item.account_holder_name
    : [item.email, phoneDisplay].filter(Boolean).join(' • ');
  const avatarUrl = !isBank ? compactText(item.avatar_url || social.avatarUrl || social.avatar) : '';
  const date = formatDate(item.last_used_at || item.updated_at || item.created_at);
  const Icon = isBank ? CreditCard : UserIcon;

  return (
    <View style={[styles.presetCard, { backgroundColor: colors.card }]}>
      <View style={styles.presetTopBar}>
        <View style={[styles.iconBox, { backgroundColor: `${colors.primary}14` }]}>
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={styles.presetAvatar} />
          ) : (
            <Icon color={colors.primary} size={22} />
          )}
        </View>
        <View style={styles.presetTopMeta}>
          {selected && (
            <View style={[styles.selectedBadge, { backgroundColor: `${colors.success}18` }]}>
              <Check color={colors.success} size={14} />
              <Text style={[styles.selectedText, { color: colors.success }]}>{t('accountPresets.selected')}</Text>
            </View>
          )}
        </View>
        <View style={styles.presetIconActions}>
          <TouchableOpacity
            style={[styles.iconActionButton, { backgroundColor: `${colors.primary}14` }]}
            onPress={onShare}
            disabled={loading}
          >
            <Share2 color={colors.primary} size={18} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.iconActionButton, { backgroundColor: `${colors.primary}14` }]}
            onPress={onEdit}
            disabled={loading}
          >
            <Pencil color={colors.primary} size={18} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.iconActionButton, { backgroundColor: `${colors.error}14` }]}
            onPress={onDelete}
            disabled={loading}
          >
            <Trash2 color={colors.error} size={18} />
          </TouchableOpacity>
        </View>
      </View>
      <View style={styles.presetBody}>
        <Text style={[styles.presetTitle, { color: colors.text }]} numberOfLines={2}>{title}</Text>
        {!!subtitle && <Text style={[styles.presetSubtitle, { color: colors.textSecondary }]} numberOfLines={1}>{subtitle}</Text>}
        {!!meta && <Text style={[styles.presetMeta, { color: colors.textSecondary }]} numberOfLines={1}>{meta}</Text>}
        {!!date && <Text style={[styles.presetDate, { color: colors.textSecondary }]}>{date}</Text>}
      </View>
      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.applyButton, { backgroundColor: colors.primary }]}
          onPress={onApply}
          disabled={loading}
        >
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.applyText}>{t('accountPresets.apply')}</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const PresetEditModal = ({ visible, isBank, form, saving, userId, colors, t, onChange, onCancel, onSave }) => {
  const [countryPickerTarget, setCountryPickerTarget] = useState(null);
  const [showBankPicker, setShowBankPicker] = useState(false);
  const [banks, setBanks] = useState([]);
  const [loadingBanks, setLoadingBanks] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const countryTargets = {
    phone: { codeKey: 'phone_country_code', aliasKey: 'countryCode', phoneKey: 'phone' },
    zalo: { codeKey: 'zaloCountryCode', phoneKey: 'zalo' },
    whatsapp: { codeKey: 'whatsappCountryCode', phoneKey: 'whatsapp' },
  };
  const activeCountryTarget = countryTargets[countryPickerTarget] || countryTargets.phone;
  const activeCountryCode = normalizeCountryCode(form[activeCountryTarget.codeKey] || form.phone_country_code || form.countryCode || '84');
  const openCountryPicker = (target) => {
    setCountryPickerTarget(target);
  };
  const openBankPicker = async () => {
    setShowBankPicker(true);

    if (banks.length || loadingBanks) return;

    setLoadingBanks(true);
    try {
      const response = await fetch('https://api.vietqr.io/v2/banks');
      const result = await response.json();
      if (result.code === '00') {
        setBanks(result.data || []);
      }
    } catch (error) {
      Alert.alert(t('common.error'), error?.message || t('accountPresets.loadFailed'));
    } finally {
      setLoadingBanks(false);
    }
  };
  const closeCountryPicker = () => {
    setCountryPickerTarget(null);
  };
  const closeBankPicker = () => {
    setShowBankPicker(false);
  };
  const handleCancel = () => {
    closeCountryPicker();
    closeBankPicker();
    onCancel();
  };
  const handleCountrySelect = (code) => {
    const target = countryTargets[countryPickerTarget] || countryTargets.phone;
    const nextCode = normalizeCountryCode(code);
    onChange(target.codeKey, nextCode);
    if (target.aliasKey) {
      onChange(target.aliasKey, nextCode);
    }
    onChange(target.phoneKey, normalizePhoneForCountry(form[target.phoneKey], nextCode));
    closeCountryPicker();
  };
  const handleBankSelect = (bank) => {
    const bankCode = `${bank?.code || ''}`.trim();
    const bankName = `${bank?.shortName || bank?.name || bankCode}`.trim();
    onChange('bank_code', bankCode);
    onChange('bank_name', bankName);
    closeBankPicker();
  };
  const handleAvatarPick = async () => {
    if (!userId) return;

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(t('common.error'), t('myCard.imagePermissionDenied'));
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

    setAvatarUploading(true);
    try {
      const upload = await uploadImageToBucket({
        bucket: 'ecards',
        userId,
        asset: result.assets[0],
        prefix: 'ecard-avatar',
      });
      onChange('avatar_url', upload.publicUrl);
    } catch (error) {
      Alert.alert(t('common.error'), error?.message || t('myCard.imageUploadFailed'));
    } finally {
      setAvatarUploading(false);
    }
  };
  const renderPhoneInput = (key, label, target) => {
    const targetConfig = countryTargets[target];
    const countryCode = normalizeCountryCode(form[targetConfig.codeKey] || form.phone_country_code || form.countryCode || '84');

    return (
      <View key={key} style={styles.inputGroup}>
        <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>{label}</Text>
        <View style={styles.phoneInputRow}>
          <TouchableOpacity
            style={[styles.countrySelector, { backgroundColor: colors.background }]}
            onPress={() => openCountryPicker(target)}
          >
            <Text style={[styles.countryCodeText, { color: colors.text }]}>+{countryCode}</Text>
            <ChevronDown color={colors.textSecondary} size={14} style={{ marginLeft: 5 }} />
          </TouchableOpacity>
          <TextInput
            style={[styles.input, styles.phoneTextInput, { backgroundColor: colors.background, color: colors.text }]}
            value={`${form[key] || ''}`}
            onChangeText={(value) => onChange(key, normalizePhoneForCountry(value, countryCode))}
            placeholderTextColor={colors.textSecondary}
            keyboardType="phone-pad"
          />
        </View>
      </View>
    );
  };
  const renderBankSelector = () => (
    <View key="bank_selector" style={styles.inputGroup}>
      <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>{t('myCard.bank')}</Text>
      <TouchableOpacity
        style={[styles.bankSelector, { backgroundColor: colors.background }]}
        onPress={openBankPicker}
        disabled={saving}
      >
        <View style={styles.bankSelectorLeft}>
          <View style={[styles.bankSelectorIcon, { backgroundColor: colors.card }]}>
            <CreditCard color={colors.primary} size={18} />
          </View>
          <View style={styles.bankSelectorTextBlock}>
            <Text style={[styles.bankSelectorTitle, { color: colors.text }]} numberOfLines={1}>
              {form.bank_name || form.bank_code || t('myCard.chooseBank')}
            </Text>
            {!!form.bank_code && (
              <Text style={[styles.bankSelectorCode, { color: colors.textSecondary }]} numberOfLines={1}>
                {form.bank_code}
              </Text>
            )}
          </View>
        </View>
        <ChevronDown color={colors.textSecondary} size={18} />
      </TouchableOpacity>
    </View>
  );
  const fields = isBank
    ? [
      ['label', t('accountPresets.label')],
      ['bank_selector', t('myCard.bank'), 'default', false, 'bank'],
      ['account_holder_name', t('accountPresets.accountHolder')],
      ['account_number', t('accountPresets.accountNumber'), 'numeric'],
    ]
    : [
      ['label', t('accountPresets.label')],
      ['full_name', t('myCard.fullName')],
      ['job_title', t('myCard.titleField')],
      ['company', t('myCard.company')],
      ['department', t('myCard.department')],
      ['email', t('myCard.email'), 'email-address'],
      ['phone', t('myCard.phone'), 'phone-pad', false, 'phone'],
      ['website', t('myCard.website'), 'url'],
      ['address', t('myCard.address'), 'default', true],
      ['linkedin', t('myCard.linkedin')],
      ['facebook', t('myCard.facebook')],
      ['zalo', t('myCard.zalo'), 'phone-pad', false, 'zalo'],
      ['whatsapp', t('myCard.whatsapp'), 'phone-pad', false, 'whatsapp'],
      ['telegram', t('myCard.telegram')],
      ['bio', t('myCard.bio'), 'default', true],
    ];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleCancel}>
      <View style={styles.modalOverlay}>
        <View style={[styles.editSheet, { backgroundColor: colors.card }]}>
          <View style={styles.editHeader}>
            <Text style={[styles.editTitle, { color: colors.text }]}>
              {isBank ? t('accountPresets.editBankTitle') : t('accountPresets.editECardTitle')}
            </Text>
            <TouchableOpacity style={[styles.closeButton, { backgroundColor: colors.background }]} onPress={handleCancel}>
              <X color={colors.textSecondary} size={20} />
            </TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.editContent}>
            {!isBank && (
              <View style={styles.editAvatarBlock}>
                <TouchableOpacity
                  style={styles.editAvatarButton}
                  onPress={handleAvatarPick}
                  disabled={saving || avatarUploading}
                >
                  {form.avatar_url ? (
                    <Image source={{ uri: form.avatar_url }} style={styles.editAvatarImage} />
                  ) : (
                    <View style={[styles.editAvatarPlaceholder, { backgroundColor: colors.background }]}>
                      <Camera color={colors.textSecondary} size={30} />
                    </View>
                  )}
                  <View style={[styles.editAvatarBadge, { backgroundColor: colors.primary }]}>
                    {avatarUploading ? <ActivityIndicator color="#fff" /> : <Camera color="#fff" size={14} />}
                  </View>
                </TouchableOpacity>
                <Text style={[styles.editAvatarLabel, { color: colors.textSecondary }]}>{t('myCard.avatar')}</Text>
              </View>
            )}
            {fields.map(([key, label, keyboardType, multiline, type]) => {
              if (type === 'bank') {
                return renderBankSelector();
              }

              if (type === 'phone' || type === 'zalo' || type === 'whatsapp') {
                return renderPhoneInput(key, label, type);
              }

              return (
                <View key={key} style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>{label}</Text>
                  <TextInput
                    style={[
                      styles.input,
                      multiline && styles.multilineInput,
                      { backgroundColor: colors.background, color: colors.text }
                    ]}
                    value={`${form[key] || ''}`}
                    onChangeText={(value) => onChange(key, key === 'account_number' ? value.replace(/[^\d]/g, '') : value)}
                    placeholderTextColor={colors.textSecondary}
                    keyboardType={keyboardType || 'default'}
                    autoCapitalize="none"
                    multiline={Boolean(multiline)}
                    textAlignVertical={multiline ? 'top' : 'center'}
                  />
                </View>
              );
            })}
          </ScrollView>
          <TouchableOpacity style={[styles.saveEditButton, { backgroundColor: colors.primary }]} onPress={onSave} disabled={saving}>
            {saving ? <ActivityIndicator color="#fff" /> : <Save color="#fff" size={18} />}
            <Text style={styles.saveEditText}>{t('common.save')}</Text>
          </TouchableOpacity>
          <CountryPickerModal
            visible={Boolean(countryPickerTarget)}
            colors={colors}
            countries={SORTED_COUNTRIES}
            selectedCode={activeCountryCode}
            title={t('myCard.chooseCountry')}
            placeholder={t('myCard.searchPlaceholderCountry')}
            onClose={closeCountryPicker}
            onSelect={handleCountrySelect}
          />
          <BankPickerModal
            visible={showBankPicker}
            colors={colors}
            banks={banks}
            loading={loadingBanks}
            selectedCode={form.bank_code}
            title={t('myCard.chooseBank')}
            placeholder={t('myCard.searchPlaceholderBank')}
            onClose={closeBankPicker}
            onSelect={handleBankSelect}
          />
        </View>
      </View>
    </Modal>
  );
};

const CountryPickerModal = ({
  visible,
  colors,
  countries,
  selectedCode,
  title,
  placeholder,
  onClose,
  onSelect
}) => {
  const [query, setQuery] = useState('');
  const searchInputRef = useRef(null);
  const searchDebounceRef = useRef(null);

  useEffect(() => {
    if (visible) {
      setQuery('');
      searchInputRef.current?.clear();
    }
  }, [visible]);

  useEffect(() => () => {
    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }
  }, []);

  const handleSearchChange = (text) => {
    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }
    searchDebounceRef.current = setTimeout(() => setQuery(text), 120);
  };

  const trimmedQuery = query.trim();
  const normalizedQuery = trimmedQuery.toLowerCase();
  const filteredCountries = normalizedQuery
    ? countries.filter(country => (
      country.name.toLowerCase().includes(normalizedQuery) ||
      country.code.includes(trimmedQuery)
    ))
    : countries;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.countryModalOverlay}>
        <View style={[styles.countryModalContent, { backgroundColor: colors.card }]}>
          <View style={styles.countryModalHeader}>
            <Text style={[styles.countryModalTitle, { color: colors.text }]}>{title}</Text>
            <TouchableOpacity onPress={onClose}><X color={colors.textSecondary} size={24} /></TouchableOpacity>
          </View>
          <View style={[styles.searchBar, { backgroundColor: colors.background }]}>
            <Search color={colors.textSecondary} size={18} />
            <TextInput
              ref={searchInputRef}
              style={[styles.searchInput, { color: colors.text }]}
              placeholder={placeholder}
              placeholderTextColor={colors.textSecondary}
              autoCorrect={false}
              autoCapitalize="none"
              onChangeText={handleSearchChange}
            />
          </View>
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {filteredCountries.map((country, index) => {
              const isSelected = selectedCode === country.code;
              return (
                <TouchableOpacity
                  key={`${country.code}-${country.name}-${index}`}
                  style={[styles.countryItem, isSelected && { backgroundColor: colors.background }]}
                  onPress={() => onSelect(country.code)}
                >
                  <View style={styles.countryItemLeft}>
                    <View style={[styles.countryIconBox, { backgroundColor: colors.background }]}>
                      <Globe size={18} color={colors.primary} />
                    </View>
                    <View style={styles.countryTextBlock}>
                      <Text style={[styles.countryName, { color: colors.text }]} numberOfLines={1}>{country.name}</Text>
                      <Text style={[styles.countryCodeSub, { color: colors.textSecondary }]}>+{country.code}</Text>
                    </View>
                  </View>
                  {isSelected && <Check color={colors.primary} size={20} />}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const BankPickerModal = ({
  visible,
  colors,
  banks,
  loading,
  selectedCode,
  title,
  placeholder,
  onClose,
  onSelect
}) => {
  const [query, setQuery] = useState('');
  const searchInputRef = useRef(null);
  const searchDebounceRef = useRef(null);

  useEffect(() => {
    if (visible) {
      setQuery('');
      searchInputRef.current?.clear();
    }
  }, [visible]);

  useEffect(() => () => {
    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }
  }, []);

  const handleSearchChange = (text) => {
    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }
    searchDebounceRef.current = setTimeout(() => setQuery(text), 120);
  };

  const normalizedQuery = query.trim().toLowerCase();
  const filteredBanks = normalizedQuery
    ? banks.filter(bank => (
      `${bank.name || ''} ${bank.shortName || ''} ${bank.code || ''}`.toLowerCase().includes(normalizedQuery)
    ))
    : banks;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.countryModalOverlay}>
        <View style={[styles.countryModalContent, { backgroundColor: colors.card }]}>
          <View style={styles.countryModalHeader}>
            <Text style={[styles.countryModalTitle, { color: colors.text }]}>{title}</Text>
            <TouchableOpacity onPress={onClose}><X color={colors.textSecondary} size={24} /></TouchableOpacity>
          </View>
          <View style={[styles.searchBar, { backgroundColor: colors.background }]}>
            <Search color={colors.textSecondary} size={18} />
            <TextInput
              ref={searchInputRef}
              style={[styles.searchInput, { color: colors.text }]}
              placeholder={placeholder}
              placeholderTextColor={colors.textSecondary}
              autoCorrect={false}
              autoCapitalize="none"
              onChangeText={handleSearchChange}
            />
          </View>
          {loading ? (
            <ActivityIndicator style={{ marginTop: 24 }} color={colors.primary} />
          ) : (
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {filteredBanks.map((bank) => {
                const isSelected = selectedCode === bank.code;
                return (
                  <TouchableOpacity
                    key={`${bank.code}-${bank.name}`}
                    style={[styles.countryItem, isSelected && { backgroundColor: colors.background }]}
                    onPress={() => onSelect(bank)}
                  >
                    <View style={styles.countryItemLeft}>
                      {bank.logo ? (
                        <Image source={{ uri: bank.logo }} style={styles.bankLogoSmall} resizeMode="contain" />
                      ) : (
                        <View style={[styles.countryIconBox, { backgroundColor: colors.background }]}>
                          <CreditCard size={18} color={colors.primary} />
                        </View>
                      )}
                      <View style={styles.countryTextBlock}>
                        <Text style={[styles.countryName, { color: colors.text }]} numberOfLines={1}>
                          {bank.shortName || bank.name || bank.code}
                        </Text>
                        <Text style={[styles.countryCodeSub, { color: colors.textSecondary }]} numberOfLines={1}>
                          {bank.code}
                        </Text>
                      </View>
                    </View>
                    {isSelected && <Check color={colors.primary} size={20} />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  centerContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scrollContent: { padding: Spacing.lg },
  screenTitle: { fontSize: 30, fontWeight: '900' },
  screenDesc: { fontSize: 14, lineHeight: 20, fontWeight: '600', marginTop: 6, marginBottom: Spacing.lg },
  emptyCard: { borderRadius: 24, padding: 22, alignItems: 'center' },
  emptyTitle: { fontSize: 17, fontWeight: '900', textAlign: 'center' },
  emptyDesc: { marginTop: 6, fontSize: 13, lineHeight: 19, fontWeight: '600', textAlign: 'center' },
  list: { gap: 12 },
  presetCard: { borderRadius: 22, padding: 14 },
  presetTopBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  iconBox: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  presetAvatar: { width: 42, height: 42, borderRadius: 14 },
  presetTopMeta: { flex: 1, minWidth: 0, alignItems: 'flex-start' },
  presetIconActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  presetBody: { marginTop: 12, minWidth: 0 },
  presetTitle: { fontSize: 17, lineHeight: 22, fontWeight: '900' },
  presetSubtitle: { marginTop: 4, fontSize: 13, lineHeight: 18, fontWeight: '700' },
  presetMeta: { marginTop: 3, fontSize: 12, lineHeight: 17, fontWeight: '600' },
  presetDate: { marginTop: 6, fontSize: 11, fontWeight: '800' },
  selectedBadge: { flexDirection: 'row', alignItems: 'center', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4 },
  selectedText: { marginLeft: 4, fontSize: 11, fontWeight: '900' },
  actions: { flexDirection: 'row', gap: 10, marginTop: 14 },
  applyButton: { flex: 1, minHeight: 46, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  applyText: { color: '#fff', fontSize: 14, fontWeight: '900' },
  iconActionButton: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.48)', justifyContent: 'flex-end' },
  editSheet: { maxHeight: '88%', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20 },
  editHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  editTitle: { flex: 1, fontSize: 22, fontWeight: '900' },
  closeButton: { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  editContent: { paddingTop: 16, paddingBottom: 8 },
  editAvatarBlock: { alignItems: 'center', marginBottom: 18 },
  editAvatarButton: { width: 92, height: 92, borderRadius: 28, position: 'relative' },
  editAvatarImage: { width: 92, height: 92, borderRadius: 28 },
  editAvatarPlaceholder: { width: 92, height: 92, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  editAvatarBadge: { position: 'absolute', right: -3, bottom: -3, width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: '#fff' },
  editAvatarLabel: { marginTop: 9, fontSize: 12, fontWeight: '900', textTransform: 'uppercase' },
  inputGroup: { marginBottom: 12 },
  inputLabel: { fontSize: 12, fontWeight: '900', textTransform: 'uppercase', marginBottom: 7, marginLeft: 4 },
  input: { minHeight: 50, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, fontWeight: '600' },
  bankSelector: { minHeight: 56, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  bankSelectorLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, minWidth: 0 },
  bankSelectorIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  bankSelectorTextBlock: { flex: 1, minWidth: 0 },
  bankSelectorTitle: { fontSize: 15, fontWeight: '800' },
  bankSelectorCode: { marginTop: 2, fontSize: 11, fontWeight: '700' },
  phoneInputRow: { flexDirection: 'row', alignItems: 'center' },
  countrySelector: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, height: 50, borderRadius: 14, minWidth: 90, justifyContent: 'center', marginRight: 10 },
  countryCodeText: { fontWeight: '800' },
  phoneTextInput: { flex: 1 },
  multilineInput: { minHeight: 92, lineHeight: 21 },
  saveEditButton: { height: 52, borderRadius: 16, marginTop: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  saveEditText: { color: '#fff', marginLeft: 8, fontSize: 15, fontWeight: '900' },
  countryModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  countryModalContent: { borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 22, height: '78%' },
  countryModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 },
  countryModalTitle: { fontSize: 20, fontWeight: '900' },
  searchBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, paddingVertical: 10, borderRadius: 15, marginBottom: 15 },
  searchInput: { flex: 1, marginLeft: 10, fontSize: 15, fontWeight: '600' },
  countryItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 10, borderRadius: 12 },
  countryItemLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, minWidth: 0 },
  countryIconBox: { width: 32, height: 32, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  bankLogoSmall: { width: 40, height: 26, marginRight: 12 },
  countryTextBlock: { flex: 1, minWidth: 0 },
  countryName: { fontSize: 15, fontWeight: '700' },
  countryCodeSub: { fontSize: 11, marginTop: 2, fontWeight: '600' },
});
