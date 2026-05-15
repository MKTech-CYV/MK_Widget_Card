import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  Dimensions,
  Image,
  Modal,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  AtSign,
  Camera,
  Check,
  ChevronDown,
  Edit2,
  Globe,
  Landmark,
  Link as LinkIcon,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Save,
  Search,
  Share2,
  User as UserIcon,
  X
} from 'lucide-react-native';
import { useTheme, Spacing } from '../constants/Theme';
import { StorageService } from '../services/StorageService';
import Footer from '../components/Footer';
import { useAppPreferences } from '../context/AppPreferencesContext';
import { useAuth } from '../context/AuthContext';
import { getTranslation } from '../constants/i18n';
import {
  bankQrPresetToLocalData,
  bankQrToPresetPayload,
  ecardPresetToLocalData,
  ecardToPresetPayload,
  fetchBankQrPresets,
  fetchECardPresets,
  isPresetLimitPolicyError,
  saveBankQrPreset,
  saveECardPreset,
  setSelectedBankQrPreset,
  setSelectedECardPreset,
  updateBankQrPreset,
  updateECardPreset
} from '../services/AccountPresetService';
import { deleteStorageFile, deleteStorageFileFromUrlIfChanged, uploadImageToBucket } from '../services/SupabaseStorageService';
import {
  buildVCard,
  formatInternationalPhone,
  normalizeCountryCode,
  normalizePhoneForCountry
} from '../utils/vcard';
import { buildBankQrShareUrl, buildECardShareUrl, shareUrl } from '../utils/ecardShareLink';

const { width } = Dimensions.get('window');
const keyboardVerticalOffset = Platform.select({ ios: 40, android: 0, default: 0 });
const APP_LOGO = require('../../assets/icon.png');

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

const DEFAULT_ECARD_FORM = {
  fullName: '',
  phone: '',
  email: '',
  title: '',
  company: '',
  department: '',
  website: '',
  address: '',
  linkedin: '',
  facebook: '',
  zalo: '',
  zaloCountryCode: '84',
  whatsapp: '',
  whatsappCountryCode: '84',
  telegram: '',
  bio: '',
  avatar: null,
  avatarUrl: '',
  countryCode: '84'
};

const DEFAULT_BANK_FORM = {
  bankName: 'MB',
  bankAccount: '',
  bankAccountHolderName: ''
};

const trimText = (value) => `${value || ''}`.trim();

const getECardPresetAvatarUrl = (preset = {}) => {
  const social = preset.social || {};
  return trimText(preset.avatar_url || social.avatarUrl || social.avatar);
};

const normalizePhoneInput = (phone, countryCode) => (
  normalizePhoneForCountry(phone, countryCode)
);

const toECardForm = (data = {}) => {
  const countryCode = data.countryCode ? normalizeCountryCode(data.countryCode) : '84';

  return {
    ...DEFAULT_ECARD_FORM,
    ...data,
    phone: normalizePhoneInput(data.phone || '', countryCode),
    countryCode,
    avatar: data.avatar || null,
    avatarUrl: data.avatarUrl || '',
    zaloCountryCode: data.zaloCountryCode ? normalizeCountryCode(data.zaloCountryCode) : countryCode,
    whatsappCountryCode: data.whatsappCountryCode ? normalizeCountryCode(data.whatsappCountryCode) : countryCode,
    zalo: normalizePhoneInput(data.zalo || '', data.zaloCountryCode || countryCode),
    whatsapp: normalizePhoneInput(data.whatsapp || '', data.whatsappCountryCode || countryCode)
  };
};

const toBankForm = (data = {}) => ({
  ...DEFAULT_BANK_FORM,
  bankName: data.bankName || 'MB',
  bankAccount: `${data.bankAccount || ''}`.replace(/[^\d]/g, ''),
  bankAccountHolderName: data.bankAccountHolderName || ''
});

const sanitizeECardForm = (data) => ({
  ...data,
  fullName: trimText(data.fullName),
  phone: normalizePhoneInput(data.phone, data.countryCode),
  email: trimText(data.email),
  title: trimText(data.title),
  company: trimText(data.company),
  department: trimText(data.department),
  website: trimText(data.website),
  address: trimText(data.address),
  linkedin: trimText(data.linkedin),
  facebook: trimText(data.facebook),
  zalo: normalizePhoneInput(data.zalo, data.zaloCountryCode || data.countryCode),
  zaloCountryCode: normalizeCountryCode(data.zaloCountryCode || data.countryCode),
  whatsapp: normalizePhoneInput(data.whatsapp, data.whatsappCountryCode || data.countryCode),
  whatsappCountryCode: normalizeCountryCode(data.whatsappCountryCode || data.countryCode),
  telegram: trimText(data.telegram),
  bio: trimText(data.bio),
  avatarUrl: trimText(data.avatarUrl),
  countryCode: normalizeCountryCode(data.countryCode)
});

const sanitizeBankForm = (data) => ({
  bankName: data.bankName || 'MB',
  bankAccount: `${data.bankAccount || ''}`.replace(/[^\d]/g, ''),
  bankAccountHolderName: trimText(data.bankAccountHolderName)
});

const mergeStoredData = (currentData, ecardForm, bankForm) => ({
  ...DEFAULT_ECARD_FORM,
  ...DEFAULT_BANK_FORM,
  ...(currentData || {}),
  ...ecardForm,
  ...bankForm
});

export default function MyCardScreen({ route }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { language } = useAppPreferences();
  const { user } = useAuth();
  const t = (key) => getTranslation(language, key);
  const [userData, setUserData] = useState(null);
  const [editingSection, setEditingSection] = useState(null);
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);
  const [activeTab, setActiveTab] = useState('contact');
  const [showCountryModal, setShowCountryModal] = useState(false);
  const [countryPickerTarget, setCountryPickerTarget] = useState('phone');
  const [showBankModal, setShowBankModal] = useState(false);
  const [bankQrLoading, setBankQrLoading] = useState(false);
  const [bankQrFailed, setBankQrFailed] = useState(false);
  const [banks, setBanks] = useState([]);
  const [loadingBanks, setLoadingBanks] = useState(false);
  const [refreshingHome, setRefreshingHome] = useState(false);
  const [savingDestination, setSavingDestination] = useState(null);
  const [showPresetUpdatePicker, setShowPresetUpdatePicker] = useState(false);
  const [presetUpdateKind, setPresetUpdateKind] = useState(null);
  const [presetUpdateItems, setPresetUpdateItems] = useState([]);
  const [pendingPresetData, setPendingPresetData] = useState(null);
  const [presetUpdateActionId, setPresetUpdateActionId] = useState(null);
  const [showPresetNameModal, setShowPresetNameModal] = useState(false);
  const [pendingAccountPreset, setPendingAccountPreset] = useState(null);
  const [presetNameDraft, setPresetNameDraft] = useState('');
  const [showPresetApplyPicker, setShowPresetApplyPicker] = useState(false);
  const [presetApplyKind, setPresetApplyKind] = useState(null);
  const [presetApplyItems, setPresetApplyItems] = useState([]);
  const [presetApplyLoading, setPresetApplyLoading] = useState(false);
  const [presetApplyActionId, setPresetApplyActionId] = useState(null);
  const [ecardForm, setECardForm] = useState(DEFAULT_ECARD_FORM);
  const [bankForm, setBankForm] = useState(DEFAULT_BANK_FORM);

  useEffect(() => {
    StorageService.init();
    loadData();
    fetchBanks();
  }, []);

  useFocusEffect(useCallback(() => {
    loadData();
  }, []));

  useEffect(() => {
    const requestedSection = route?.params?.editSection;
    if (requestedSection === 'ecard' || requestedSection === 'bank') {
      setActiveTab(requestedSection === 'bank' ? 'bank' : 'contact');
      setEditingSection(requestedSection);
    }
  }, [route?.params?.editSection, route?.params?.editRequestId]);

  useEffect(() => {
    if (route?.params?.refreshRequestId) {
      loadData();
    }
  }, [route?.params?.refreshRequestId]);

  const fetchBanks = async () => {
    setLoadingBanks(true);
    try {
      const response = await fetch('https://api.vietqr.io/v2/banks');
      const result = await response.json();
      if (result.code === '00') {
        setBanks(result.data);
      }
    } catch {
      setBanks([]);
    } finally {
      setLoadingBanks(false);
    }
  };

  const loadData = async () => {
    const data = await StorageService.getUserData();
    if (data) {
      const nextECardForm = toECardForm(data);
      const nextBankForm = toBankForm(data);
      const normalizedData = mergeStoredData(data, nextECardForm, nextBankForm);

      setUserData(normalizedData);
      setECardForm(nextECardForm);
      setBankForm(nextBankForm);
    } else {
      setUserData(null);
      setECardForm(DEFAULT_ECARD_FORM);
      setBankForm(DEFAULT_BANK_FORM);
      setEditingSection('ecard');
    }
  };

  const handleHomeRefresh = async () => {
    setRefreshingHome(true);
    try {
      await Promise.all([
        loadData(),
        fetchBanks(),
      ]);
    } finally {
      setRefreshingHome(false);
    }
  };

  const pickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert(t('common.error'), t('myCard.imagePermissionDenied'));
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
      base64: true,
    });

    if (!result.canceled && result.assets?.length) {
      const asset = result.assets[0];
      const localAvatar = asset.base64
        ? `data:${asset.mimeType || 'image/jpeg'};base64,${asset.base64}`
        : asset.uri;

      setECardForm(current => ({ ...current, avatar: localAvatar, avatarUrl: '' }));
    }
  };

  const ensureECardAvatarUploadedWithInfo = async (data) => {
    const avatar = `${data?.avatar || ''}`.trim();
    const avatarUrl = `${data?.avatarUrl || ''}`.trim();

    if (!user?.id || !avatar) {
      return { data, upload: null };
    }

    if (avatarUrl && !avatar.startsWith('data:')) {
      return { data: { ...data, avatar: avatarUrl, avatarUrl }, upload: null };
    }

    if (!avatar.startsWith('data:')) {
      return { data: { ...data, avatarUrl: avatarUrl || avatar }, upload: null };
    }

    const upload = await uploadImageToBucket({
      bucket: 'ecards',
      userId: user.id,
      dataUri: avatar,
      prefix: 'ecard-avatar',
    });

    return {
      data: {
        ...data,
        avatar: upload.publicUrl,
        avatarUrl: upload.publicUrl,
      },
      upload,
    };
  };

  const buildPresetUpdatePayload = (kind, data, currentPreset = {}) => {
    const label = trimText(currentPreset.label);
    const rawPayload = kind === 'bank'
      ? bankQrToPresetPayload({ userId: user.id, data, bankDisplayName: getBankName(data.bankName), label })
      : ecardToPresetPayload({ userId: user.id, data, label });
    const { user_id: _userId, ...payload } = rawPayload;
    return payload;
  };

  const deleteUploadedECardAvatar = async (upload) => {
    if (upload?.path) {
      await deleteStorageFile({ bucket: 'ecards', path: upload.path }).catch(() => null);
    }
  };

  const showAccountPresetSaveError = (error) => {
    if (isPresetLimitPolicyError(error)) {
      Alert.alert(t('myCard.premiumPresetLimitTitle'), t('myCard.premiumPresetLimitMessage'));
      return;
    }

    Alert.alert(t('common.error'), error?.message || t('myCard.accountSaveFailed'));
  };

  const openPresetNameModal = (kind, nextData) => {
    setPendingAccountPreset({ kind, data: nextData });
    setPresetNameDraft('');
    setShowPresetNameModal(true);
  };

  const closePresetNameModal = () => {
    if (savingDestination === 'account') return;

    setShowPresetNameModal(false);
    setPendingAccountPreset(null);
    setPresetNameDraft('');
  };

  const handleSaveAccountPresetWithName = async () => {
    if (!user?.id || !pendingAccountPreset) return;

    const label = trimText(presetNameDraft);
    if (!label) {
      Alert.alert(t('common.error'), t('myCard.presetNameRequired'));
      return;
    }

    setSavingDestination('account');
    let uploadedAvatar = null;
    let nextData = pendingAccountPreset.data;

    try {
      if (pendingAccountPreset.kind === 'ecard') {
        const uploadResult = await ensureECardAvatarUploadedWithInfo(nextData);
        nextData = uploadResult.data;
        uploadedAvatar = uploadResult.upload;

        const preset = await saveECardPreset({ userId: user.id, data: nextData, label });
        nextData = StorageService.markAccountPresetSource(nextData, { ecardPresetId: preset?.id });
        setShowPresetNameModal(false);
        setPendingAccountPreset(null);
        setPresetNameDraft('');
        await persistData(nextData, t('myCard.ecardAccountSaveSuccess'));
      } else {
        const preset = await saveBankQrPreset({
          userId: user.id,
          data: nextData,
          bankDisplayName: getBankName(nextData.bankName),
          label,
        });
        nextData = StorageService.markAccountPresetSource(nextData, { bankPresetId: preset?.id });
        setShowPresetNameModal(false);
        setPendingAccountPreset(null);
        setPresetNameDraft('');
        await persistData(nextData, t('myCard.bankAccountSaveSuccess'));
      }
    } catch (error) {
      if (!error?.path || error.method === 'POST' || isPresetLimitPolicyError(error)) {
        await deleteUploadedECardAvatar(uploadedAvatar);
      }
      showAccountPresetSaveError(error);
    } finally {
      setSavingDestination(null);
    }
  };

  const openPresetUpdatePicker = async (kind, nextData) => {
    if (!user?.id) return;

    setSavingDestination('preset');
    try {
      const presets = kind === 'bank'
        ? await fetchBankQrPresets()
        : await fetchECardPresets();

      if (!presets.length) {
        Alert.alert(t('common.error'), t('myCard.noSavedPresetToUpdate'));
        return;
      }

      setPresetUpdateKind(kind);
      setPendingPresetData(nextData);
      setPresetUpdateItems(presets);
      setShowPresetUpdatePicker(true);
    } catch (error) {
      Alert.alert(t('common.error'), error?.message || t('myCard.accountSaveFailed'));
    } finally {
      setSavingDestination(null);
    }
  };

  const closePresetUpdatePicker = () => {
    if (presetUpdateActionId) return;

    setShowPresetUpdatePicker(false);
    setPresetUpdateKind(null);
    setPendingPresetData(null);
    setPresetUpdateItems([]);
  };

  const openPresetApplyPicker = async (kind) => {
    if (!user?.id || presetApplyLoading) return;

    setPresetApplyKind(kind);
    setShowPresetApplyPicker(true);
    setPresetApplyLoading(true);
    try {
      const presets = kind === 'bank'
        ? await fetchBankQrPresets()
        : await fetchECardPresets();
      setPresetApplyItems(presets);
    } catch (error) {
      setShowPresetApplyPicker(false);
      Alert.alert(t('common.error'), error?.message || t('accountPresets.loadFailed'));
    } finally {
      setPresetApplyLoading(false);
    }
  };

  const closePresetApplyPicker = () => {
    if (presetApplyActionId) return;

    setShowPresetApplyPicker(false);
    setPresetApplyKind(null);
    setPresetApplyItems([]);
  };

  const handleApplyPresetFromHome = async (preset) => {
    if (!user?.id || !presetApplyKind) return;

    setPresetApplyActionId(preset.id);
    try {
      StorageService.init();
      const currentData = await StorageService.getUserData() || {};
      const patch = presetApplyKind === 'bank'
        ? bankQrPresetToLocalData(preset)
        : ecardPresetToLocalData(preset);
      const sourceUpdate = presetApplyKind === 'bank'
        ? { bankPresetId: preset.id }
        : { ecardPresetId: preset.id };
      const nextData = StorageService.markAccountPresetSource(
        { ...currentData, ...patch },
        sourceUpdate
      );

      if (presetApplyKind === 'bank') {
        await setSelectedBankQrPreset(user.id, preset.id);
      } else {
        await setSelectedECardPreset(user.id, preset.id);
      }

      await StorageService.setUserData(nextData);
      const nextECardForm = toECardForm(nextData);
      const nextBankForm = toBankForm(nextData);
      setUserData(mergeStoredData(nextData, nextECardForm, nextBankForm));
      setECardForm(nextECardForm);
      setBankForm(nextBankForm);
      setShowPresetApplyPicker(false);
      setPresetApplyKind(null);
      setPresetApplyItems([]);
      Alert.alert(t('common.success'), t('accountPresets.applySuccess'));
    } catch (error) {
      Alert.alert(t('common.error'), error?.message || t('accountPresets.applyFailed'));
    } finally {
      setPresetApplyActionId(null);
    }
  };

  const handleUpdateExistingPreset = async (preset) => {
    if (!user?.id || !pendingPresetData || !presetUpdateKind) return;

    setPresetUpdateActionId(preset.id);
    let uploadedAvatar = null;
    try {
      let nextData = pendingPresetData;
      const previousAvatarUrl = presetUpdateKind === 'ecard' ? getECardPresetAvatarUrl(preset) : '';
      if (presetUpdateKind === 'ecard') {
        const uploadResult = await ensureECardAvatarUploadedWithInfo(nextData);
        nextData = uploadResult.data;
        uploadedAvatar = uploadResult.upload;
      }

      const payload = buildPresetUpdatePayload(presetUpdateKind, nextData, preset);
      if (presetUpdateKind === 'bank') {
        await updateBankQrPreset(preset.id, payload);
        nextData = StorageService.markAccountPresetSource(nextData, { bankPresetId: preset.id });
      } else {
        await updateECardPreset(preset.id, payload, preset);
        await deleteStorageFileFromUrlIfChanged({
          previousUrl: previousAvatarUrl,
          nextUrl: nextData.avatarUrl || nextData.avatar,
          bucket: 'ecards',
        }).catch(() => null);
        nextData = StorageService.markAccountPresetSource(nextData, { ecardPresetId: preset.id });
      }

      setShowPresetUpdatePicker(false);
      setPresetUpdateKind(null);
      setPendingPresetData(null);
      setPresetUpdateItems([]);
      await persistData(
        nextData,
        presetUpdateKind === 'bank' ? t('myCard.bankPresetUpdateSuccess') : t('myCard.ecardPresetUpdateSuccess')
      );
    } catch (error) {
      await deleteUploadedECardAvatar(uploadedAvatar);
      Alert.alert(t('common.error'), error?.message || t('myCard.updatePresetFailed'));
    } finally {
      setPresetUpdateActionId(null);
    }
  };

  const persistData = async (nextData, successMessage = t('myCard.saveSuccess')) => {
    try {
      await StorageService.setUserData(nextData);
      setUserData(nextData);
      setECardForm(toECardForm(nextData));
      setBankForm(toBankForm(nextData));
      setEditingSection(null);
      Alert.alert(t('common.success'), successMessage);
    } catch (error) {
      Alert.alert(t('common.error'), t('myCard.saveFailed'));
    }
  };

  const handleSaveECard = async (destination = 'local') => {
    const sanitizedECard = sanitizeECardForm(ecardForm);
    if (!sanitizedECard.fullName) {
      Alert.alert(t('common.error'), t('myCard.nameRequired'));
      return;
    }

    const sanitizedBank = sanitizeBankForm(bankForm);
    let nextData = mergeStoredData(userData, sanitizedECard, sanitizedBank);

    if (destination === 'preset' && user?.id) {
      await openPresetUpdatePicker('ecard', nextData);
      return;
    }

    if (destination === 'account' && user?.id) {
      openPresetNameModal('ecard', nextData);
      return;
    }

    await persistData(
      StorageService.clearAccountPresetSource(nextData, 'ecard'),
      t('myCard.ecardSaveSuccess')
    );
  };

  const handleSaveBank = async (destination = 'local') => {
    const sanitizedECard = sanitizeECardForm(ecardForm);
    const sanitizedBank = sanitizeBankForm(bankForm);
    if (!sanitizedBank.bankAccountHolderName) {
      Alert.alert(t('common.error'), t('myCard.bankHolderRequired'));
      return;
    }

    let nextData = mergeStoredData(userData, sanitizedECard, sanitizedBank);

    if (destination === 'preset' && user?.id) {
      await openPresetUpdatePicker('bank', nextData);
      return;
    }

    if (destination === 'account' && user?.id) {
      openPresetNameModal('bank', nextData);
      return;
    }

    await persistData(
      StorageService.clearAccountPresetSource(nextData, 'bank'),
      t('myCard.bankSaveSuccess')
    );
  };

  const getBankName = (code) => {
    const bank = banks.find(b => b.code === code);
    return bank ? bank.shortName || bank.name : code;
  };

  const shareECard = async () => {
    if (!userData) return;

    try {
      const url = buildECardShareUrl(userData, language);
      await shareUrl({ title: t('myCard.shareECard'), url });
    } catch (error) {
      Alert.alert(t('common.error'), t('myCard.shareFailed'));
    }
  };

  const shareBankQr = async () => {
    if (!userData) return;

    try {
      const url = buildBankQrShareUrl(userData);
      if (!url) {
        Alert.alert(t('common.error'), t('myCard.noBankQr'));
        return;
      }
      await shareUrl({ title: t('myCard.shareBankQr'), url });
    } catch (error) {
      Alert.alert(t('common.error'), t('myCard.shareBankFailed'));
    }
  };

  const bankQrUrl = userData?.bankName && userData?.bankAccount
    ? `https://img.vietqr.io/image/${userData.bankName}-${userData.bankAccount}-qr_only.png?accountName=${encodeURIComponent(userData.bankAccountHolderName || '')}`
    : null;

  const vCardContent = userData ? buildVCard(userData) : '';
  const bankQrSize = Math.min(width * 0.62, 280);
  const contactQrSize = Math.min(width * 0.58, 280);
  const contactQrLogoSize = Math.max(32, contactQrSize * 0.16);
  const isFormMode = Boolean(editingSection) || !userData;

  useEffect(() => {
    setBankQrFailed(false);
    setBankQrLoading(Boolean(bankQrUrl));
  }, [bankQrUrl]);

  const openCountryPicker = (target) => {
    setCountryPickerTarget(target);
    setShowCountryModal(true);
  };

  const handleCountrySelect = (code) => {
    const countryCode = normalizeCountryCode(code);
    setECardForm(current => {
      if (countryPickerTarget === 'zalo') {
        return {
          ...current,
          zaloCountryCode: countryCode,
          zalo: normalizePhoneInput(current.zalo, countryCode)
        };
      }

      if (countryPickerTarget === 'whatsapp') {
        return {
          ...current,
          whatsappCountryCode: countryCode,
          whatsapp: normalizePhoneInput(current.whatsapp, countryCode)
        };
      }

      return {
        ...current,
        countryCode,
        phone: normalizePhoneInput(current.phone, countryCode)
      };
    });
  };

  const selectedCountryCode = countryPickerTarget === 'zalo'
    ? ecardForm.zaloCountryCode
    : countryPickerTarget === 'whatsapp'
      ? ecardForm.whatsappCountryCode
      : ecardForm.countryCode;

  const renderPhoneInput = ({ label, value, countryCode, target, placeholder, onChange }) => (
    <View style={styles.inputContainer}>
      <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>
      <View style={styles.phoneInputRow}>
        <TouchableOpacity
          style={[styles.countrySelector, { backgroundColor: colors.background }]}
          onPress={() => openCountryPicker(target)}
        >
          <Text style={{ color: colors.text, fontWeight: '700' }}>+{countryCode}</Text>
          <ChevronDown color={colors.textSecondary} size={14} style={{ marginLeft: 5 }} />
        </TouchableOpacity>
        <TextInput
          style={[styles.input, { flex: 1, backgroundColor: colors.background, color: colors.text, marginLeft: 10 }]}
          value={value}
          onChangeText={onChange}
          placeholder={placeholder}
          keyboardType="phone-pad"
          placeholderTextColor={colors.textSecondary}
        />
      </View>
    </View>
  );

  const renderFormTabs = () => (
    <View style={[styles.tabContainer, { backgroundColor: colors.card }]}>
      <TouchableOpacity
        style={[styles.tab, editingSection === 'ecard' && { backgroundColor: colors.primary }]}
        onPress={() => setEditingSection('ecard')}
      >
        <UserIcon color={editingSection === 'ecard' ? '#fff' : colors.textSecondary} size={18} />
        <Text style={[styles.tabText, { color: editingSection === 'ecard' ? '#fff' : colors.textSecondary }]}>
          {t('myCard.ecardEditTab')}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.tab, editingSection === 'bank' && { backgroundColor: colors.primary }]}
        onPress={() => setEditingSection('bank')}
      >
        <Landmark color={editingSection === 'bank' ? '#fff' : colors.textSecondary} size={18} />
        <Text style={[styles.tabText, { color: editingSection === 'bank' ? '#fff' : colors.textSecondary }]}>
          {t('myCard.bankEditTab')}
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderECardForm = () => (
    <View style={[styles.formCard, { backgroundColor: colors.card }]}>
      <TouchableOpacity style={styles.avatarPicker} onPress={pickImage}>
        {ecardForm.avatar ? (
          <Image source={{ uri: ecardForm.avatar }} style={styles.avatarImage} />
        ) : (
          <View style={[styles.avatarPlaceholder, { backgroundColor: colors.background }]}>
            <Camera color={colors.textSecondary} size={30} />
          </View>
        )}
        <View style={[styles.cameraBadge, { backgroundColor: colors.primary }]}>
          <Camera color="#fff" size={14} />
        </View>
      </TouchableOpacity>

      <Text style={styles.sectionDivider}>{t('myCard.personalSection')}</Text>

      <InputField label={t('myCard.fullName')} value={ecardForm.fullName} onChange={v => setECardForm({ ...ecardForm, fullName: v })} placeholder={t('myCard.fullNamePlaceholder')} colors={colors} />

      {renderPhoneInput({
        label: t('myCard.phone'),
        value: ecardForm.phone,
        countryCode: ecardForm.countryCode,
        target: 'phone',
        placeholder: t('myCard.phonePlaceholder'),
        onChange: v => setECardForm({ ...ecardForm, phone: normalizePhoneInput(v, ecardForm.countryCode) })
      })}

      <InputField label={t('myCard.email')} value={ecardForm.email} onChange={v => setECardForm({ ...ecardForm, email: v })} placeholder={t('myCard.emailPlaceholder')} keyboardType="email-address" autoCapitalize="none" colors={colors} />
      <InputField label={t('myCard.titleField')} value={ecardForm.title} onChange={v => setECardForm({ ...ecardForm, title: v })} placeholder={t('myCard.titlePlaceholder')} colors={colors} />
      <InputField label={t('myCard.company')} value={ecardForm.company} onChange={v => setECardForm({ ...ecardForm, company: v })} placeholder={t('myCard.companyPlaceholder')} colors={colors} />
      <InputField label={t('myCard.department')} value={ecardForm.department} onChange={v => setECardForm({ ...ecardForm, department: v })} placeholder={t('myCard.departmentPlaceholder')} colors={colors} />

      <Text style={[styles.sectionDivider, { marginTop: 20 }]}>{t('myCard.contactSection')}</Text>
      <InputField label={t('myCard.website')} value={ecardForm.website} onChange={v => setECardForm({ ...ecardForm, website: v })} placeholder={t('myCard.websitePlaceholder')} keyboardType="url" autoCapitalize="none" colors={colors} />
      <InputField label={t('myCard.address')} value={ecardForm.address} onChange={v => setECardForm({ ...ecardForm, address: v })} placeholder={t('myCard.addressPlaceholder')} colors={colors} multiline />

      <Text style={[styles.sectionDivider, { marginTop: 20 }]}>{t('myCard.socialSection')}</Text>
      <InputField label={t('myCard.linkedin')} value={ecardForm.linkedin} onChange={v => setECardForm({ ...ecardForm, linkedin: v })} placeholder={t('myCard.linkedinPlaceholder')} autoCapitalize="none" colors={colors} />
      <InputField label={t('myCard.facebook')} value={ecardForm.facebook} onChange={v => setECardForm({ ...ecardForm, facebook: v })} placeholder={t('myCard.facebookPlaceholder')} autoCapitalize="none" colors={colors} />
      {renderPhoneInput({
        label: t('myCard.zalo'),
        value: ecardForm.zalo,
        countryCode: ecardForm.zaloCountryCode,
        target: 'zalo',
        placeholder: t('myCard.zaloPlaceholder'),
        onChange: v => setECardForm({ ...ecardForm, zalo: normalizePhoneInput(v, ecardForm.zaloCountryCode) })
      })}
      {renderPhoneInput({
        label: t('myCard.whatsapp'),
        value: ecardForm.whatsapp,
        countryCode: ecardForm.whatsappCountryCode,
        target: 'whatsapp',
        placeholder: t('myCard.whatsappPlaceholder'),
        onChange: v => setECardForm({ ...ecardForm, whatsapp: normalizePhoneInput(v, ecardForm.whatsappCountryCode) })
      })}
      <InputField label={t('myCard.telegram')} value={ecardForm.telegram} onChange={v => setECardForm({ ...ecardForm, telegram: v })} placeholder={t('myCard.telegramPlaceholder')} autoCapitalize="none" colors={colors} />
      <InputField label={t('myCard.bio')} value={ecardForm.bio} onChange={v => setECardForm({ ...ecardForm, bio: v })} placeholder={t('myCard.bioPlaceholder')} colors={colors} multiline />

    </View>
  );

  const renderBankForm = () => (
    <View style={[styles.formCard, { backgroundColor: colors.card }]}>
      <View style={[styles.formIconHeader, { backgroundColor: `${colors.primary}14` }]}>
        <Landmark color={colors.primary} size={26} />
      </View>

      <Text style={styles.sectionDivider}>{t('myCard.bankSection')}</Text>

      <View style={styles.inputContainer}>
        <Text style={[styles.label, { color: colors.textSecondary }]}>{t('myCard.bank')}</Text>
        <TouchableOpacity
          style={[styles.input, { backgroundColor: colors.background, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}
          onPress={() => setShowBankModal(true)}
        >
          <Text style={{ color: colors.text, fontSize: 16 }}>{getBankName(bankForm.bankName)}</Text>
          <ChevronDown color={colors.textSecondary} size={20} />
        </TouchableOpacity>
      </View>

      <InputField
        label={t('myCard.bankAccountHolderName')}
        value={bankForm.bankAccountHolderName}
        onChange={v => setBankForm({ ...bankForm, bankAccountHolderName: v })}
        placeholder={t('myCard.bankAccountHolderNamePlaceholder')}
        autoCapitalize="characters"
        colors={colors}
      />

      <InputField
        label={t('myCard.account')}
        value={bankForm.bankAccount}
        onChange={v => setBankForm({ ...bankForm, bankAccount: v.replace(/[^\d]/g, '') })}
        placeholder={t('myCard.bankAccountPlaceholder')}
        keyboardType="numeric"
        colors={colors}
      />

    </View>
  );

  if (isFormMode) {
    const saveLabel = editingSection === 'bank' ? t('myCard.saveBank') : t('myCard.saveECard');
    const onSave = editingSection === 'bank' ? handleSaveBank : handleSaveECard;
    const confirmMessage = editingSection === 'bank' ? t('myCard.confirmSaveBank') : t('myCard.confirmSaveECard');
    const closeEdit = () => {
      setShowSaveConfirm(false);
      setEditingSection(null);
    };

    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <KeyboardAvoidingView
          style={styles.container}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={keyboardVerticalOffset}
        >
          <View style={[styles.stickyEditHeader, { paddingTop: insets.top + 12, backgroundColor: colors.background }]}>
            <View style={styles.formTitleRow}>
              <Text style={[styles.screenTitle, styles.editScreenTitle, { color: colors.text }]}>
                {userData ? (editingSection === 'bank' ? t('myCard.editBankTitle') : t('myCard.editECardTitle')) : t('myCard.createTitle')}
              </Text>
              {userData && (
                <TouchableOpacity style={[styles.cancelPill, { backgroundColor: colors.card }]} onPress={closeEdit}>
                  <X color={colors.textSecondary} size={18} />
                  <Text style={[styles.cancelPillText, { color: colors.textSecondary }]}>{t('common.cancel')}</Text>
                </TouchableOpacity>
              )}
            </View>

            {renderFormTabs()}
          </View>

          <ScrollView
            contentContainerStyle={[styles.scrollContent, { paddingTop: Spacing.md, paddingBottom: insets.bottom + 104 }]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            automaticallyAdjustKeyboardInsets
            refreshControl={
              <RefreshControl refreshing={refreshingHome} tintColor={colors.primary} onRefresh={handleHomeRefresh} />
            }
          >
            {editingSection === 'bank' ? renderBankForm() : renderECardForm()}
            <Footer />
          </ScrollView>

          <TouchableOpacity
            style={[
              styles.saveFab,
              {
                right: Spacing.lg,
                bottom: insets.bottom + 22,
                backgroundColor: colors.primary
              }
            ]}
            onPress={() => setShowSaveConfirm(true)}
            accessibilityRole="button"
            accessibilityLabel={saveLabel}
          >
            <Save color="#fff" size={25} />
          </TouchableOpacity>
        </KeyboardAvoidingView>

        <SaveConfirmModal
          visible={showSaveConfirm}
          title={t('myCard.confirmSaveTitle')}
          message={confirmMessage}
          confirmLabel={saveLabel}
          localLabel={t('myCard.saveLocal')}
          accountLabel={t('myCard.saveAccount')}
          updatePresetLabel={t('myCard.updateSavedPreset')}
          canSaveToAccount={Boolean(user?.id)}
          canUpdatePreset={Boolean(user?.id)}
          savingAction={savingDestination}
          cancelLabel={t('common.cancel')}
          colors={colors}
          onCancel={() => setShowSaveConfirm(false)}
          onConfirm={() => {
            setShowSaveConfirm(false);
            onSave('local');
          }}
          onConfirmAccount={() => {
            setShowSaveConfirm(false);
            onSave('account');
          }}
          onConfirmUpdate={() => {
            setShowSaveConfirm(false);
            onSave('preset');
          }}
        />
        <PresetNameModal
          visible={showPresetNameModal}
          isBank={pendingAccountPreset?.kind === 'bank'}
          value={presetNameDraft}
          saving={savingDestination === 'account'}
          colors={colors}
          t={t}
          onChange={setPresetNameDraft}
          onCancel={closePresetNameModal}
          onSave={handleSaveAccountPresetWithName}
        />
        <PresetUpdateModal
          visible={showPresetUpdatePicker}
          isBank={presetUpdateKind === 'bank'}
          items={presetUpdateItems}
          loadingId={presetUpdateActionId}
          colors={colors}
          t={t}
          onClose={closePresetUpdatePicker}
          onSelect={handleUpdateExistingPreset}
        />
        <SelectionModal
          visible={showCountryModal}
          onClose={() => setShowCountryModal(false)}
          data={SORTED_COUNTRIES}
          onSelect={handleCountrySelect}
          title={t('myCard.chooseCountry')}
          selectedId={selectedCountryCode}
          type="country"
          colors={colors}
          t={t}
        />
        <SelectionModal
          visible={showBankModal}
          onClose={() => setShowBankModal(false)}
          data={banks}
          onSelect={code => setBankForm({ ...bankForm, bankName: code })}
          title={t('myCard.chooseBank')}
          selectedId={bankForm.bankName}
          type="bank"
          loading={loadingBanks}
          colors={colors}
          t={t}
        />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={keyboardVerticalOffset}
      >
        <ScrollView
          contentContainerStyle={[styles.previewScroll, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 24 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          automaticallyAdjustKeyboardInsets
          refreshControl={
            <RefreshControl refreshing={refreshingHome} tintColor={colors.primary} onRefresh={handleHomeRefresh} />
          }
        >
          <Text style={[styles.screenTitle, { color: colors.text }]}>{t('myCard.myCardTitle')}</Text>

          <View style={[styles.tabContainer, { backgroundColor: colors.card }]}>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'contact' && { backgroundColor: colors.primary }]}
              onPress={() => setActiveTab('contact')}
            >
              <UserIcon color={activeTab === 'contact' ? '#fff' : colors.textSecondary} size={18} />
              <Text style={[styles.tabText, { color: activeTab === 'contact' ? '#fff' : colors.textSecondary }]}>{t('myCard.contactTab')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'bank' && { backgroundColor: colors.primary }]}
              onPress={() => setActiveTab('bank')}
            >
              <Landmark color={activeTab === 'bank' ? '#fff' : colors.textSecondary} size={18} />
              <Text style={[styles.tabText, { color: activeTab === 'bank' ? '#fff' : colors.textSecondary }]}>{t('myCard.bankTab')}</Text>
            </TouchableOpacity>
          </View>

          <View style={[styles.digitalCard, { backgroundColor: colors.card }]}>
            <View style={styles.cardTopBar}>
              {activeTab === 'contact' ? (
                userData.avatar ? (
                  <Image source={{ uri: userData.avatar }} style={styles.cardAvatar} />
                ) : (
                  <View style={[styles.cardAvatarPlaceholder, { backgroundColor: colors.background }]}>
                    <UserIcon color={colors.primary} size={40} />
                  </View>
                )
              ) : (
                <View style={[styles.cardAvatarPlaceholder, { backgroundColor: `${colors.primary}14` }]}>
                  <Image source={APP_LOGO} style={styles.cardAvatarLogo} />
                </View>
              )}
              <View style={styles.cardActionStack}>
                {Boolean(user?.id) && (
                  <TouchableOpacity
                    style={[styles.changePresetButton, { backgroundColor: colors.background }]}
                    onPress={() => openPresetApplyPicker(activeTab === 'bank' ? 'bank' : 'ecard')}
                    accessibilityRole="button"
                    accessibilityLabel={t('myCard.changePreset')}
                  >
                    <ChevronDown color={colors.primary} size={18} />
                    <Text style={[styles.changePresetText, { color: colors.primary }]}>{t('myCard.changePreset')}</Text>
                  </TouchableOpacity>
                )}
                <View style={styles.cardActionRow}>
                  <TouchableOpacity
                    style={[styles.cardIconButton, { backgroundColor: colors.background }]}
                    onPress={activeTab === 'bank' ? shareBankQr : shareECard}
                    accessibilityRole="button"
                    accessibilityLabel={activeTab === 'bank' ? t('myCard.shareBankQr') : t('myCard.shareECard')}
                  >
                    <Share2 color={colors.primary} size={18} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.cardIconButton, { backgroundColor: colors.background }]}
                    onPress={() => setEditingSection(activeTab === 'bank' ? 'bank' : 'ecard')}
                    accessibilityRole="button"
                    accessibilityLabel={activeTab === 'bank' ? t('myCard.editBankButton') : t('myCard.editECardButton')}
                  >
                    <Edit2 color={colors.primary} size={18} />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
            {activeTab === 'contact' ? (
              <>
                <View style={styles.cardHeader}>
                  <View style={styles.headerInfo}>
                    <Text style={[styles.cardName, { color: colors.text }]} numberOfLines={2}>{userData.fullName}</Text>
                    <Text style={[styles.cardTitle, { color: colors.textSecondary }]}>
                      {[userData.title, userData.company].filter(Boolean).join(' • ')}
                    </Text>
                    {!!userData.department && (
                      <Text style={[styles.cardCompany, { color: colors.primary }]}>{userData.department}</Text>
                    )}
                  </View>
                </View>
                <View style={styles.divider} />
                <View style={styles.qrSection}>
                  <View style={styles.qrContainer}>
                    <ContactQrCode
                      value={vCardContent}
                      size={contactQrSize}
                      logoSize={contactQrLogoSize}
                    />
                  </View>
                  <Text style={styles.qrHint}>{t('myCard.contactQrHint')}</Text>
                </View>
                <View style={styles.detailGrid}>
                  <PreviewDetail icon={Phone} label={t('myCard.phone')} value={formatInternationalPhone(userData.countryCode, userData.phone)} colors={colors} />
                  <PreviewDetail icon={Mail} label={t('myCard.email')} value={userData.email} colors={colors} />
                  <PreviewDetail icon={LinkIcon} label={t('myCard.website')} value={userData.website} colors={colors} />
                  <PreviewDetail icon={MapPin} label={t('myCard.address')} value={userData.address} colors={colors} />
                  <PreviewDetail icon={AtSign} label={t('myCard.linkedin')} value={userData.linkedin} colors={colors} />
                  <PreviewDetail icon={MessageCircle} label={t('myCard.zalo')} value={formatInternationalPhone(userData.zaloCountryCode || userData.countryCode, userData.zalo)} colors={colors} />
                  <PreviewDetail icon={MessageCircle} label={t('myCard.whatsapp')} value={formatInternationalPhone(userData.whatsappCountryCode || userData.countryCode, userData.whatsapp)} colors={colors} />
                  <PreviewDetail icon={MessageCircle} label={t('myCard.telegram')} value={userData.telegram} colors={colors} />
                </View>
                {!!userData.bio && (
                  <Text style={[styles.bioText, { color: colors.textSecondary }]} numberOfLines={4}>{userData.bio}</Text>
                )}
              </>
            ) : (
              <View style={styles.bankView}>
                <View style={styles.bankHeader}>
                  <View style={[styles.bankBadge, { backgroundColor: `${colors.primary}14` }]}>
                    <Landmark color={colors.primary} size={16} />
                    <Text style={[styles.bankBadgeText, { color: colors.primary }]}>VIETQR</Text>
                  </View>
                  <Text style={[styles.bankTitle, { color: colors.text }]}>{t('myCard.bankPaymentTitle')}</Text>
                </View>

                <View style={styles.qrSection}>
                  <View style={[styles.qrContainer, styles.bankQrContainer]}>
                    {bankQrUrl && !bankQrFailed ? (
                      <View style={[styles.bankQrFrame, { width: bankQrSize, height: bankQrSize }]}>
                        {bankQrLoading && (
                          <View style={styles.qrLoadingOverlay}>
                            <ActivityIndicator color={colors.primary} />
                          </View>
                        )}
                        <Image
                          source={{ uri: bankQrUrl }}
                          style={styles.bankQrImage}
                          resizeMode="contain"
                          onLoadStart={() => setBankQrLoading(true)}
                          onLoadEnd={() => setBankQrLoading(false)}
                          onError={() => {
                            setBankQrLoading(false);
                            setBankQrFailed(true);
                          }}
                        />
                      </View>
                    ) : (
                      <View style={[styles.bankQrPlaceholder, { width: bankQrSize, height: bankQrSize, borderColor: colors.border }]}>
                        <Landmark color={colors.textSecondary} size={34} />
                        <Text style={[styles.bankPlaceholderTitle, { color: colors.text }]}>{t('myCard.noBankQr')}</Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.bankInfoPanel}>
                    {!!userData.bankAccountHolderName && (
                      <Text style={[styles.bankOwnerName, { color: colors.text }]} numberOfLines={1}>{userData.bankAccountHolderName}</Text>
                    )}
                    <Text style={[styles.bankNameText, { color: colors.textSecondary }]}>{getBankName(userData.bankName)}</Text>
                    <Text style={[styles.bankAccountText, { color: colors.primary }]}>{userData.bankAccount}</Text>
                  </View>
                </View>
              </View>
            )}
          </View>
          <Footer />
        </ScrollView>
      </KeyboardAvoidingView>
      <PresetApplyModal
        visible={showPresetApplyPicker}
        isBank={presetApplyKind === 'bank'}
        items={presetApplyItems}
        loading={presetApplyLoading}
        loadingId={presetApplyActionId}
        selectedId={
          presetApplyKind === 'bank'
            ? StorageService.getAccountPresetSource(userData || {}).bankPresetId
            : StorageService.getAccountPresetSource(userData || {}).ecardPresetId
        }
        colors={colors}
        t={t}
        onClose={closePresetApplyPicker}
        onSelect={handleApplyPresetFromHome}
      />
    </View>
  );
}

const ContactQrCode = ({ value, size, logoSize }) => {
  const logoBoxSize = logoSize + 10;

  return (
    <View style={[styles.contactQrWrapper, { width: size, height: size }]}>
      <QRCode
        value={value || 'MK eCard'}
        size={size}
        ecl="Q"
        backgroundColor="#FFFFFF"
        color="#000000"
      />
      <View
        pointerEvents="none"
        style={[
          styles.qrLogoBadge,
          {
            width: logoBoxSize,
            height: logoBoxSize,
            borderRadius: logoBoxSize * 0.22,
            transform: [
              { translateX: -logoBoxSize / 2 },
              { translateY: -logoBoxSize / 2 }
            ]
          }
        ]}
      >
        <Image
          source={APP_LOGO}
          style={[
            styles.qrLogoImage,
            {
              width: logoSize,
              height: logoSize,
              borderRadius: logoSize * 0.16
            }
          ]}
          resizeMode="contain"
        />
      </View>
    </View>
  );
};

const InputField = ({
  label,
  value,
  onChange,
  placeholder,
  keyboardType,
  autoCapitalize,
  colors,
  multiline = false
}) => (
  <View style={styles.inputContainer}>
    <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>
    <TextInput
      style={[
        styles.input,
        multiline && styles.multilineInput,
        { backgroundColor: colors.background, color: colors.text }
      ]}
      value={value}
      onChangeText={onChange}
      placeholder={placeholder}
      keyboardType={keyboardType}
      autoCapitalize={autoCapitalize}
      placeholderTextColor={colors.textSecondary}
      multiline={multiline}
      textAlignVertical={multiline ? 'top' : 'center'}
    />
  </View>
);

const SelectionModal = ({
  visible,
  onClose,
  data,
  onSelect,
  title,
  selectedId,
  type,
  loading = false,
  colors,
  t
}) => {
  const [query, setQuery] = useState('');
  const searchInputRef = useRef(null);
  const searchDebounceRef = useRef(null);

  useEffect(() => {
    if (visible) {
      setQuery('');
      searchInputRef.current?.clear();
    }
  }, [visible, type]);

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
  const filteredData = normalizedQuery
    ? data.filter(item => (
      type === 'bank'
        ? `${item.name || ''} ${item.shortName || ''} ${item.code || ''}`.toLowerCase().includes(normalizedQuery)
        : item.name.toLowerCase().includes(normalizedQuery) || item.code.includes(query.trim())
    ))
    : data;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>{title}</Text>
            <TouchableOpacity onPress={onClose}>
              <X color={colors.textSecondary} size={24} />
            </TouchableOpacity>
          </View>

          <View style={[styles.searchBar, { backgroundColor: colors.background }]}>
            <Search color={colors.textSecondary} size={18} />
            <TextInput
              ref={searchInputRef}
              style={[styles.searchInput, { color: colors.text }]}
              placeholder={type === 'bank' ? t('myCard.searchPlaceholderBank') : t('myCard.searchPlaceholderCountry')}
              placeholderTextColor={colors.textSecondary}
              autoCorrect={false}
              autoCapitalize="none"
              onChangeText={handleSearchChange}
            />
          </View>

          {loading && type === 'bank' ? (
            <ActivityIndicator style={{ marginTop: 20 }} color={colors.primary} />
          ) : (
            <FlatList
              data={filteredData}
              keyExtractor={item => `${type}-${item.code}-${item.id || item.name}`}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => {
                const id = item.code;
                const isSelected = selectedId === id;
                return (
                  <TouchableOpacity
                    style={[styles.modalItem, isSelected && { backgroundColor: colors.background }]}
                    onPress={() => {
                      onSelect(id);
                      onClose();
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                      {type === 'country' ? (
                        <View style={[styles.countryIconBox, { backgroundColor: colors.background }]}>
                          <Globe size={18} color={colors.primary} />
                        </View>
                      ) : (
                        <Image source={{ uri: item.logo }} style={styles.bankLogoSmall} resizeMode="contain" />
                      )}
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.modalItemText, { color: colors.text }]} numberOfLines={1}>
                          {item.name}
                        </Text>
                        <Text style={{ fontSize: 11, color: colors.textSecondary }}>{type === 'country' ? `+${id}` : id}</Text>
                      </View>
                    </View>
                    {isSelected && <Check color={colors.primary} size={20} />}
                  </TouchableOpacity>
                );
              }}
            />
          )}
        </View>
      </View>
    </Modal>
  );
};

const PreviewDetail = ({ icon: Icon, label, value, colors }) => {
  if (!value) return null;

  return (
    <View style={[styles.previewDetail, { backgroundColor: colors.background }]}>
      <Icon color={colors.primary} size={16} />
      <View style={styles.previewDetailText}>
        <Text style={[styles.previewDetailLabel, { color: colors.textSecondary }]} numberOfLines={1}>{label}</Text>
        <Text style={[styles.previewDetailValue, { color: colors.text }]} numberOfLines={2}>{value}</Text>
      </View>
    </View>
  );
};

const SaveConfirmModal = ({
  visible,
  title,
  message,
  confirmLabel,
  localLabel,
  accountLabel,
  updatePresetLabel,
  canSaveToAccount,
  canUpdatePreset,
  savingAction,
  cancelLabel,
  colors,
  onCancel,
  onConfirm,
  onConfirmAccount,
  onConfirmUpdate
}) => {
  const isSaving = Boolean(savingAction);
  const updatePresetButtonColor = colors.secondary || colors.primary;

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onCancel}>
      <View style={styles.confirmOverlay}>
        <View style={[styles.confirmCard, { backgroundColor: colors.card }]}>
          <View style={[styles.confirmIcon, { backgroundColor: `${colors.primary}16` }]}>
            <Save color={colors.primary} size={24} />
          </View>
          <Text style={[styles.confirmTitle, { color: colors.text }]}>{title}</Text>
          <Text style={[styles.confirmMessage, { color: colors.textSecondary }]}>{message}</Text>
          <View style={[styles.confirmActions, canSaveToAccount && styles.confirmActionsStack]}>
            <TouchableOpacity
              style={[
                styles.confirmCancel,
                { backgroundColor: colors.background },
                canSaveToAccount && styles.confirmStackButton
              ]}
              onPress={onCancel}
              disabled={isSaving}
            >
              <Text style={[styles.confirmCancelText, { color: colors.textSecondary }]}>{cancelLabel}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.confirmSave,
                { backgroundColor: colors.primary },
                canSaveToAccount && styles.confirmStackButton
              ]}
              onPress={onConfirm}
              disabled={isSaving}
            >
              <Save color="#fff" size={18} />
              <Text style={styles.confirmSaveText}>{canSaveToAccount ? localLabel : confirmLabel}</Text>
            </TouchableOpacity>
            {canSaveToAccount && (
              <TouchableOpacity
                style={[styles.confirmSave, styles.confirmStackButton, { backgroundColor: colors.success }]}
                onPress={onConfirmAccount}
                disabled={isSaving}
              >
                {savingAction === 'account' ? <ActivityIndicator color="#fff" /> : <Save color="#fff" size={18} />}
                <Text style={styles.confirmSaveText}>{accountLabel}</Text>
              </TouchableOpacity>
            )}
            {canUpdatePreset && (
              <TouchableOpacity
                style={[styles.confirmSave, styles.confirmStackButton, { backgroundColor: updatePresetButtonColor }]}
                onPress={onConfirmUpdate}
                disabled={isSaving}
              >
                {savingAction === 'preset' ? <ActivityIndicator color="#fff" /> : <Check color="#fff" size={18} />}
                <Text style={styles.confirmSaveText}>{updatePresetLabel}</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const PresetNameModal = ({
  visible,
  isBank,
  value,
  saving,
  colors,
  t,
  onChange,
  onCancel,
  onSave
}) => (
  <Modal visible={visible} animationType="fade" transparent onRequestClose={onCancel}>
    <View style={styles.confirmOverlay}>
      <View style={[styles.presetNameCard, { backgroundColor: colors.card }]}>
        <View style={[styles.confirmIcon, { backgroundColor: `${colors.primary}16` }]}>
          <Save color={colors.primary} size={24} />
        </View>
        <Text style={[styles.confirmTitle, { color: colors.text }]}>{t('myCard.presetNameTitle')}</Text>
        <Text style={[styles.confirmMessage, { color: colors.textSecondary }]}>
          {isBank ? t('myCard.bankPresetNameMessage') : t('myCard.ecardPresetNameMessage')}
        </Text>
        <TextInput
          style={[styles.presetNameInput, { backgroundColor: colors.background, color: colors.text }]}
          value={value}
          onChangeText={onChange}
          placeholder={isBank ? t('myCard.bankPresetNamePlaceholder') : t('myCard.ecardPresetNamePlaceholder')}
          placeholderTextColor={colors.textSecondary}
          autoFocus
          editable={!saving}
          returnKeyType="done"
          onSubmitEditing={onSave}
        />
        <View style={styles.presetNameActions}>
          <TouchableOpacity
            style={[styles.confirmCancel, { backgroundColor: colors.background }]}
            onPress={onCancel}
            disabled={saving}
          >
            <Text style={[styles.confirmCancelText, { color: colors.textSecondary }]}>{t('common.cancel')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.confirmSave, { backgroundColor: colors.success }]}
            onPress={onSave}
            disabled={saving}
          >
            {saving ? <ActivityIndicator color="#fff" /> : <Save color="#fff" size={18} />}
            <Text style={styles.confirmSaveText}>{t('myCard.saveAccount')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  </Modal>
);

const PresetApplyModal = ({ visible, isBank, items, loading, loadingId, selectedId, colors, t, onClose, onSelect }) => (
  <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
    <View style={styles.modalOverlay}>
      <View style={[styles.presetUpdateSheet, { backgroundColor: colors.card }]}>
        <View style={styles.modalHeader}>
          <Text style={[styles.modalTitle, { color: colors.text }]}>
            {isBank ? t('accountPresets.bankList') : t('accountPresets.ecardList')}
          </Text>
          <TouchableOpacity onPress={onClose} disabled={Boolean(loadingId)}>
            <X color={colors.textSecondary} size={24} />
          </TouchableOpacity>
        </View>
        <Text style={[styles.presetUpdateDesc, { color: colors.textSecondary }]}>
          {isBank ? t('accountPresets.bankListDesc') : t('accountPresets.ecardListDesc')}
        </Text>
        {loading ? (
          <ActivityIndicator style={{ marginVertical: 28 }} color={colors.primary} />
        ) : !items.length ? (
          <View style={[styles.presetEmptyInline, { backgroundColor: colors.background }]}>
            <Text style={[styles.presetUpdateTitle, { color: colors.text }]}>{t('accountPresets.emptyTitle')}</Text>
            <Text style={[styles.presetUpdateMeta, { color: colors.textSecondary }]}>
              {isBank ? t('accountPresets.emptyBankDesc') : t('accountPresets.emptyECardDesc')}
            </Text>
          </View>
        ) : (
          <FlatList
            data={items}
            keyExtractor={item => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.presetUpdateList}
            renderItem={({ item }) => {
              const social = item.social || {};
              const phoneDisplay = isBank
                ? ''
                : formatInternationalPhone(item.phone_country_code || social.countryCode || social.country_code || '84', item.phone);
              const title = item.label || (isBank ? item.bank_name : item.full_name) || (isBank ? t('accountPresets.bankFallback') : t('accountPresets.ecardFallback'));
              const subtitle = isBank
                ? [item.bank_name || item.bank_code, item.account_number].filter(Boolean).join(' • ')
                : [item.job_title, item.company].filter(Boolean).join(' • ');
              const meta = isBank
                ? item.account_holder_name
                : [item.email, phoneDisplay].filter(Boolean).join(' • ');
              const isSelected = selectedId === item.id;

              return (
                <TouchableOpacity
                  style={[styles.presetUpdateItem, { backgroundColor: colors.background }]}
                  onPress={() => onSelect(item)}
                  disabled={Boolean(loadingId)}
                >
                  <View style={styles.presetUpdateBody}>
                    <Text style={[styles.presetUpdateTitle, { color: colors.text }]} numberOfLines={1}>{title}</Text>
                    {!!subtitle && <Text style={[styles.presetUpdateMeta, { color: colors.textSecondary }]} numberOfLines={1}>{subtitle}</Text>}
                    {!!meta && <Text style={[styles.presetUpdateMeta, { color: colors.textSecondary }]} numberOfLines={1}>{meta}</Text>}
                  </View>
                  <View style={[styles.presetUpdateIcon, { backgroundColor: isSelected ? colors.success : colors.primary }]}>
                    {loadingId === item.id ? <ActivityIndicator color="#fff" /> : (
                      isSelected ? <Check color="#fff" size={18} /> : <ChevronDown color="#fff" size={18} />
                    )}
                  </View>
                </TouchableOpacity>
              );
            }}
          />
        )}
      </View>
    </View>
  </Modal>
);

const PresetUpdateModal = ({ visible, isBank, items, loadingId, colors, t, onClose, onSelect }) => (
  <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
    <View style={styles.modalOverlay}>
      <View style={[styles.presetUpdateSheet, { backgroundColor: colors.card }]}>
        <View style={styles.modalHeader}>
          <Text style={[styles.modalTitle, { color: colors.text }]}>{t('myCard.updatePresetTitle')}</Text>
          <TouchableOpacity onPress={onClose} disabled={Boolean(loadingId)}>
            <X color={colors.textSecondary} size={24} />
          </TouchableOpacity>
        </View>
        <Text style={[styles.presetUpdateDesc, { color: colors.textSecondary }]}>
          {t('myCard.updatePresetDesc')}
        </Text>
        <FlatList
          data={items}
          keyExtractor={item => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.presetUpdateList}
          renderItem={({ item }) => {
            const social = item.social || {};
            const phoneDisplay = isBank
              ? ''
              : formatInternationalPhone(item.phone_country_code || social.countryCode || social.country_code || '84', item.phone);
            const title = item.label || (isBank ? item.bank_name : item.full_name) || (isBank ? t('accountPresets.bankFallback') : t('accountPresets.ecardFallback'));
            const subtitle = isBank
              ? [item.bank_name || item.bank_code, item.account_number].filter(Boolean).join(' • ')
              : [item.job_title, item.company].filter(Boolean).join(' • ');
            const meta = isBank
              ? item.account_holder_name
              : [item.email, phoneDisplay].filter(Boolean).join(' • ');

            return (
              <TouchableOpacity
                style={[styles.presetUpdateItem, { backgroundColor: colors.background }]}
                onPress={() => onSelect(item)}
                disabled={Boolean(loadingId)}
              >
                <View style={styles.presetUpdateBody}>
                  <Text style={[styles.presetUpdateTitle, { color: colors.text }]} numberOfLines={1}>{title}</Text>
                  {!!subtitle && <Text style={[styles.presetUpdateMeta, { color: colors.textSecondary }]} numberOfLines={1}>{subtitle}</Text>}
                  {!!meta && <Text style={[styles.presetUpdateMeta, { color: colors.textSecondary }]} numberOfLines={1}>{meta}</Text>}
                </View>
                <View style={[styles.presetUpdateIcon, { backgroundColor: colors.primary }]}>
                  {loadingId === item.id ? <ActivityIndicator color="#fff" /> : <Check color="#fff" size={18} />}
                </View>
              </TouchableOpacity>
            );
          }}
        />
      </View>
    </View>
  </Modal>
);

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: Spacing.lg },
  previewScroll: { padding: Spacing.lg, alignItems: 'center' },
  screenTitle: { fontSize: 32, fontWeight: '800', marginBottom: Spacing.xl, alignSelf: 'flex-start', flex: 1 },
  editScreenTitle: { marginBottom: 14 },
  stickyEditHeader: { paddingHorizontal: Spacing.lg, paddingBottom: 4, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 10, elevation: 3, zIndex: 10 },
  formTitleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  cancelPill: { flexDirection: 'row', alignItems: 'center', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 9, marginTop: 2 },
  cancelPillText: { marginLeft: 6, fontSize: 13, fontWeight: '800' },
  tabContainer: { flexDirection: 'row', padding: 5, borderRadius: 15, marginBottom: 20, width: '100%' },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 12 },
  tabText: { marginLeft: 8, fontWeight: '700', fontSize: 13 },
  formCard: { borderRadius: 24, padding: Spacing.lg, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 15, elevation: 5 },
  formIconHeader: { alignSelf: 'center', width: 70, height: 70, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginBottom: Spacing.lg },
  sectionDivider: { fontSize: 11, fontWeight: '800', color: '#8E8E93', marginBottom: 15, letterSpacing: 1 },
  avatarPicker: { alignSelf: 'center', marginBottom: Spacing.lg, position: 'relative' },
  avatarImage: { width: 100, height: 100, borderRadius: 50 },
  avatarPlaceholder: { width: 100, height: 100, borderRadius: 50, justifyContent: 'center', alignItems: 'center' },
  cameraBadge: { position: 'absolute', bottom: 0, right: 0, width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: '#fff' },
  inputContainer: { marginBottom: Spacing.md },
  label: { fontSize: 13, fontWeight: '600', marginBottom: Spacing.xs, marginLeft: 4, textTransform: 'uppercase' },
  input: { borderRadius: 14, padding: 16, fontSize: 16 },
  multilineInput: { minHeight: 92, lineHeight: 22 },
  phoneInputRow: { flexDirection: 'row', alignItems: 'center' },
  countrySelector: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, height: 55, borderRadius: 14, minWidth: 90, justifyContent: 'center' },
  saveFab: { position: 'absolute', width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 14, elevation: 8 },
  digitalCard: { borderRadius: 32, padding: 25, width: '100%', shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 30, elevation: 10, position: 'relative' },
  cardTopBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  cardActionStack: { alignItems: 'flex-end', gap: 8, marginLeft: 14 },
  cardActionRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  cardIconButton: { width: 42, height: 42, borderRadius: 21, justifyContent: 'center', alignItems: 'center', zIndex: 3, elevation: 4 },
  changePresetButton: { minHeight: 42, borderRadius: 21, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', zIndex: 3, elevation: 4 },
  changePresetText: { marginLeft: 5, fontSize: 12, fontWeight: '900' },
  cardHeader: { marginBottom: 20 },
  cardAvatar: { width: 70, height: 70, borderRadius: 20 },
  cardAvatarPlaceholder: { width: 70, height: 70, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  headerInfo: { width: '100%' },
  cardName: { fontSize: 24, lineHeight: 30, fontWeight: 'bold' },
  cardAvatarLogo: { width: 48, height: 48, borderRadius: 14 },
  cardTitle: { fontSize: 14, marginTop: 2, lineHeight: 20 },
  cardCompany: { fontSize: 13, fontWeight: '600', marginTop: 2 },
  divider: { height: 1, backgroundColor: 'rgba(0,0,0,0.05)', marginVertical: 15 },
  detailGrid: { gap: 10 },
  previewDetail: { flexDirection: 'row', alignItems: 'center', borderRadius: 14, paddingHorizontal: 12, paddingVertical: 10 },
  previewDetailText: { flex: 1, marginLeft: 10 },
  previewDetailLabel: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase', marginBottom: 2 },
  previewDetailValue: { fontSize: 14, fontWeight: '700', lineHeight: 19 },
  bioText: { marginTop: 12, fontSize: 14, fontWeight: '600', lineHeight: 21 },
  qrSection: { alignItems: 'center', marginVertical: 10 },
  qrContainer: { padding: 12, backgroundColor: '#FFF', borderRadius: 20, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10 },
  contactQrWrapper: { position: 'relative', alignItems: 'center', justifyContent: 'center' },
  qrLogoBadge: { position: 'absolute', left: '50%', top: '50%', zIndex: 2, elevation: 4, backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', opacity: 0.96 },
  qrLogoImage: { backgroundColor: '#FFF' },
  qrHint: { marginTop: 10, fontSize: 12, color: '#8E8E93', fontWeight: '600' },
  bankView: { alignItems: 'center', width: '100%' },
  bankHeader: { alignItems: 'center', marginBottom: 14, paddingHorizontal: 0 },
  bankBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, marginBottom: 10 },
  bankBadgeText: { marginLeft: 6, fontSize: 12, fontWeight: '800' },
  bankTitle: { fontSize: 21, fontWeight: '800', textAlign: 'center' },
  bankQrContainer: { padding: 8, borderRadius: 24 },
  bankQrFrame: { justifyContent: 'center', alignItems: 'center' },
  bankQrImage: { width: '100%', height: '100%' },
  qrLoadingOverlay: { position: 'absolute', zIndex: 1, top: 0, right: 0, bottom: 0, left: 0, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.72)', borderRadius: 18 },
  bankQrPlaceholder: { justifyContent: 'center', alignItems: 'center', padding: 18, borderWidth: 1, borderStyle: 'dashed', borderRadius: 18 },
  bankPlaceholderTitle: { marginTop: 12, fontSize: 15, fontWeight: '800', textAlign: 'center' },
  bankInfoPanel: { marginTop: 16, alignItems: 'center', width: '100%' },
  bankOwnerName: { maxWidth: '100%', fontSize: 21, fontWeight: '800' },
  bankNameText: { marginTop: 4, fontSize: 13, fontWeight: '700' },
  bankAccountText: { marginTop: 4, fontSize: 24, fontWeight: '900', letterSpacing: 0 },
  confirmOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', padding: Spacing.lg },
  confirmCard: { borderRadius: 24, padding: 22, alignItems: 'center' },
  confirmIcon: { width: 54, height: 54, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginBottom: 14 },
  confirmTitle: { fontSize: 20, fontWeight: '800', marginBottom: 8, textAlign: 'center' },
  confirmMessage: { fontSize: 14, fontWeight: '600', lineHeight: 20, textAlign: 'center', marginBottom: 20 },
  confirmActions: { flexDirection: 'row', gap: 10, width: '100%' },
  confirmActionsStack: { flexDirection: 'column' },
  confirmCancel: { flex: 1, borderRadius: 16, paddingVertical: 14, alignItems: 'center', justifyContent: 'center' },
  confirmSave: { flex: 1.25, borderRadius: 16, paddingVertical: 14, alignItems: 'center', justifyContent: 'center', flexDirection: 'row' },
  confirmStackButton: { flex: 0, minHeight: 50, width: '100%' },
  confirmCancelText: { fontSize: 15, fontWeight: '800' },
  confirmSaveText: { color: '#fff', fontSize: 15, fontWeight: '800', marginLeft: 8 },
  presetNameCard: { borderRadius: 24, padding: 22, alignItems: 'center' },
  presetNameInput: { width: '100%', minHeight: 52, borderRadius: 16, paddingHorizontal: 15, fontSize: 16, fontWeight: '700', marginBottom: 14 },
  presetNameActions: { flexDirection: 'row', gap: 10, width: '100%' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 25, height: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: 'bold' },
  modalItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 0.5, borderBottomColor: 'rgba(0,0,0,0.05)', paddingHorizontal: 10, borderRadius: 10 },
  modalItemText: { fontSize: 15, fontWeight: '600' },
  presetUpdateSheet: { borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 24, maxHeight: '76%' },
  presetUpdateDesc: { fontSize: 13, fontWeight: '700', lineHeight: 19, marginTop: -8, marginBottom: 14 },
  presetUpdateList: { paddingBottom: 8, gap: 10 },
  presetEmptyInline: { borderRadius: 18, padding: 16, alignItems: 'center' },
  presetUpdateItem: { minHeight: 74, borderRadius: 18, padding: 14, flexDirection: 'row', alignItems: 'center' },
  presetUpdateBody: { flex: 1, minWidth: 0, marginRight: 12 },
  presetUpdateTitle: { fontSize: 15, fontWeight: '900' },
  presetUpdateMeta: { marginTop: 4, fontSize: 12, lineHeight: 16, fontWeight: '700' },
  presetUpdateIcon: { width: 38, height: 38, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  bankLogoSmall: { width: 40, height: 25, marginRight: 12 },
  countryIconBox: { width: 32, height: 32, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  searchBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, paddingVertical: 10, borderRadius: 15, marginBottom: 15 },
  searchInput: { flex: 1, marginLeft: 10, fontSize: 15, fontWeight: '500' }
});
