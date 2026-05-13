import React, { useState, useEffect } from 'react';
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
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Edit2, Save, Camera, User as UserIcon, Landmark, ChevronDown, Check, Globe, Search, X } from 'lucide-react-native';
import { useTheme, Spacing } from '../constants/Theme';
import { StorageService } from '../services/StorageService';
import Footer from '../components/Footer';
import { useAppPreferences } from '../context/AppPreferencesContext';
import { getTranslation } from '../constants/i18n';

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

// Đảm bảo Việt Nam luôn ở đầu
const SORTED_COUNTRIES = [
  { code: '84', name: 'Việt Nam' },
  ...ALL_COUNTRIES.filter(c => c.code !== '84' || c.name !== 'Việt Nam')
];

const normalizeCountryCode = (code) => {
  const digits = `${code || '84'}`.replace(/[^\d]/g, '');
  return digits || '84';
};

const normalizePhoneForIOS = (phone, countryCode = '84') => {
  const countryDigits = normalizeCountryCode(countryCode);
  const withoutLeadingZero = `${phone || ''}`.replace(/[^\d]/g, '').replace(/^0+/, '');

  if (withoutLeadingZero.startsWith(countryDigits) && withoutLeadingZero.length > countryDigits.length) {
    return withoutLeadingZero.slice(countryDigits.length);
  }

  return withoutLeadingZero;
};

const normalizePhoneInput = (phone, countryCode) => (
  Platform.OS === 'ios' ? normalizePhoneForIOS(phone, countryCode) : phone
);

const getPhoneForStorage = (phone, countryCode) => (
  Platform.OS === 'ios' ? normalizePhoneForIOS(phone, countryCode) : `${phone || ''}`.trim()
);

const formatInternationalPhone = (countryCode, phone) => {
  const localPhone = Platform.OS === 'ios' ? normalizePhoneForIOS(phone, countryCode) : phone || '';
  return `+${normalizeCountryCode(countryCode)}${localPhone}`;
};

export default function MyCardScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { language } = useAppPreferences();
  const t = (key) => getTranslation(language, key);
  const [userData, setUserData] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState('contact');
  const [showCountryModal, setShowCountryModal] = useState(false);
  const [showBankModal, setShowBankModal] = useState(false);
  const [bankQrLoading, setBankQrLoading] = useState(false);
  const [bankQrFailed, setBankQrFailed] = useState(false);
  
  const [banks, setBanks] = useState([]);
  const [loadingBanks, setLoadingBanks] = useState(false);
  const [searchQuery, setSearchBarQuery] = useState('');
  
  const [formData, setFormData] = useState({
    fullName: '', phone: '', email: '', title: '', company: '', avatar: null,
    bankName: 'MB', bankAccount: '', countryCode: '84'
  });

  useEffect(() => {
    StorageService.init();
    loadData();
    fetchBanks();
  }, []);

  const fetchBanks = async () => {
    setLoadingBanks(true);
    try {
      const response = await fetch('https://api.vietqr.io/v2/banks');
      const result = await response.json();
      if (result.code === '00') {
        setBanks(result.data);
      }
    } catch (error) {
      console.error('Error fetching banks:', error);
    } finally {
      setLoadingBanks(false);
    }
  };

  const loadData = async () => {
    const data = await StorageService.getUserData();
    if (data) {
      setUserData(data);
      const countryCode = data.countryCode ? normalizeCountryCode(data.countryCode) : '84';
      setFormData({
        ...data,
        phone: normalizePhoneInput(data.phone || '', countryCode),
        countryCode,
        bankName: data.bankName || 'MB',
        bankAccount: data.bankAccount || ''
      });
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
      if (asset.base64) {
        setFormData({ ...formData, avatar: `data:${asset.mimeType || 'image/jpeg'};base64,${asset.base64}` });
      } else if (asset.uri) {
        setFormData({ ...formData, avatar: asset.uri });
      }
    }
  };

  const handleSave = async () => {
    const sanitizedData = {
      ...formData,
      fullName: formData.fullName.trim(),
      email: formData.email.trim(),
      phone: getPhoneForStorage(formData.phone, formData.countryCode),
      title: formData.title.trim(),
      company: formData.company.trim(),
      countryCode: normalizeCountryCode(formData.countryCode),
    };
    if (!sanitizedData.fullName) return Alert.alert(t('common.error'), t('myCard.nameRequired'));
    try {
      await StorageService.setUserData(sanitizedData);
      setUserData(sanitizedData);
      setFormData(sanitizedData);
      setIsEditing(false);
      Alert.alert(t('common.success'), t('myCard.saveSuccess'));
    } catch (error) {
      Alert.alert(t('common.error'), t('myCard.saveFailed'));
    }
  };

  const vCardContent = userData ? 
    `BEGIN:VCARD\nVERSION:3.0\nFN:${userData.fullName}\nTEL:${formatInternationalPhone(userData.countryCode, userData.phone)}\nEMAIL:${userData.email}\nORG:${userData.company}\nTITLE:${userData.title}\nEND:VCARD` 
    : '';

  const getBankName = (code) => {
    const bank = banks.find(b => b.code === code);
    return bank ? bank.shortName || bank.name : code;
  };

  const bankQrUrl = userData?.bankName && userData?.bankAccount ? 
    `https://img.vietqr.io/image/${userData.bankName}-${userData.bankAccount}-compact2.png?accountName=${encodeURIComponent(userData.fullName)}` : null;
  
  const bankQrSize = Math.min(width * 0.62, 280);
  const contactQrSize = Math.min(width * 0.52, 260);
  const contactQrLogoSize = Math.max(34, contactQrSize * 0.18);

  useEffect(() => {
    setBankQrFailed(false);
    setBankQrLoading(Boolean(bankQrUrl));
  }, [bankQrUrl]);

  const filteredBanks = banks.filter(bank => 
    bank.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    bank.shortName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    bank.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredCountries = SORTED_COUNTRIES.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.code.includes(searchQuery)
  );

  const SelectionModal = ({ visible, onClose, data, onSelect, title, selectedId, type }) => (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>{title}</Text>
            <TouchableOpacity onPress={onClose}><X color={colors.textSecondary} size={24} /></TouchableOpacity>
          </View>
          
          <View style={[styles.searchBar, { backgroundColor: colors.background }]}>
            <Search color={colors.textSecondary} size={18} />
            <TextInput
              style={[styles.searchInput, { color: colors.text }]}
              placeholder={type === 'bank' ? t('myCard.searchPlaceholderBank') : t('myCard.searchPlaceholderCountry')}
              placeholderTextColor={colors.textSecondary}
              value={searchQuery}
              onChangeText={setSearchBarQuery}
            />
          </View>

          {loadingBanks && type === 'bank' ? (
            <ActivityIndicator style={{ marginTop: 20 }} color={colors.primary} />
          ) : (
            <FlatList
              data={data}
              keyExtractor={item => `${type}-${item.code}-${item.id || item.name}`}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => {
                const id = item.code;
                const isSelected = selectedId === id;
                return (
                  <TouchableOpacity 
                    style={[styles.modalItem, isSelected && { backgroundColor: colors.background }]} 
                    onPress={() => { onSelect(id); onClose(); setSearchBarQuery(''); }}
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

  if (!userData || isEditing) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <KeyboardAvoidingView
          style={styles.container}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={keyboardVerticalOffset}
        >
          <ScrollView 
            contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 24 }]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            automaticallyAdjustKeyboardInsets
          >
          <Text style={[styles.screenTitle, { color: colors.text }]}>{userData ? t('myCard.editTitle') : t('myCard.createTitle')}</Text>
          
          <View style={[styles.formCard, { backgroundColor: colors.card }]}>
            <TouchableOpacity style={styles.avatarPicker} onPress={pickImage}>
              {formData.avatar ? (
                <Image source={{ uri: formData.avatar }} style={styles.avatarImage} />
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
            
            <InputField label={t('myCard.fullName')} value={formData.fullName} onChange={v => setFormData({...formData, fullName: v})} placeholder={t('myCard.fullNamePlaceholder')} colors={colors} />
            
            <View style={styles.inputContainer}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>{t('myCard.phone')}</Text>
              <View style={styles.phoneInputRow}>
                <TouchableOpacity 
                  style={[styles.countrySelector, { backgroundColor: colors.background }]} 
                  onPress={() => setShowCountryModal(true)}
                >
                  <Text style={{ color: colors.text, fontWeight: '700' }}>+{formData.countryCode}</Text>
                  <ChevronDown color={colors.textSecondary} size={14} style={{ marginLeft: 5 }} />
                </TouchableOpacity>
                <TextInput 
                  style={[styles.input, { flex: 1, backgroundColor: colors.background, color: colors.text, marginLeft: 10 }]} 
                  value={formData.phone} 
                  onChangeText={v => setFormData({...formData, phone: normalizePhoneInput(v, formData.countryCode)})}
                  placeholder={t('myCard.phonePlaceholder')} 
                  keyboardType="phone-pad"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>
            </View>

            <InputField label={t('myCard.email')} value={formData.email} onChange={v => setFormData({...formData, email: v})} placeholder={t('myCard.emailPlaceholder')} colors={colors} />
            <InputField label={t('myCard.titleField')} value={formData.title} onChange={v => setFormData({...formData, title: v})} placeholder={t('myCard.titlePlaceholder')} colors={colors} />
            <InputField label={t('myCard.company')} value={formData.company} onChange={v => setFormData({...formData, company: v})} placeholder={t('myCard.companyPlaceholder')} colors={colors} />

            <Text style={[styles.sectionDivider, { marginTop: 20 }]}>{t('myCard.bankSection')}</Text>
            
            <View style={styles.inputContainer}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>{t('myCard.bank')}</Text>
              <TouchableOpacity 
                style={[styles.input, { backgroundColor: colors.background, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]} 
                onPress={() => setShowBankModal(true)}
              >
                <Text style={{ color: colors.text, fontSize: 16 }}>{getBankName(formData.bankName)}</Text>
                <ChevronDown color={colors.textSecondary} size={20} />
              </TouchableOpacity>
            </View>

            <InputField label={t('myCard.account')} value={formData.bankAccount} onChange={v => setFormData({...formData, bankAccount: v.replace(/[^\d]/g, '')})} placeholder={t('myCard.bankAccountPlaceholder')} keyboardType="numeric" colors={colors} />

            <TouchableOpacity style={[styles.primaryButton, { backgroundColor: colors.primary }]} onPress={handleSave}>
              <Save color="#fff" size={20} />
              <Text style={styles.primaryButtonText}>{t('myCard.saveAndSync')}</Text>
            </TouchableOpacity>
          </View>
          <Footer />
          </ScrollView>
        </KeyboardAvoidingView>

        <SelectionModal 
          visible={showCountryModal} 
          onClose={() => { setShowCountryModal(false); setSearchBarQuery(''); }} 
          data={filteredCountries} 
          onSelect={code => setFormData({...formData, countryCode: code})}
          title={t('myCard.chooseCountry')}
          selectedId={formData.countryCode}
          type="country"
        />
        <SelectionModal 
          visible={showBankModal} 
          onClose={() => { setShowBankModal(false); setSearchBarQuery(''); }} 
          data={filteredBanks} 
          onSelect={code => setFormData({...formData, bankName: code})}
          title={t('myCard.chooseBank')}
          selectedId={formData.bankName}
          type="bank"
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
          {activeTab === 'contact' ? (
            <>
              <View style={styles.cardHeader}>
                {userData.avatar ? (
                  <Image source={{ uri: userData.avatar }} style={styles.cardAvatar} />
                ) : (
                  <View style={[styles.cardAvatarPlaceholder, { backgroundColor: colors.background }]}>
                    <UserIcon color={colors.primary} size={40} />
                  </View>
                )}
                <View style={styles.headerInfo}>
                  <Text style={[styles.cardName, { color: colors.text }]}>{userData.fullName}</Text>
                  <Text style={[styles.cardTitle, { color: colors.textSecondary }]}>{userData.title}</Text>
                  <Text style={[styles.cardCompany, { color: colors.primary }]}>{userData.company}</Text>
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
                  <Text style={[styles.bankOwnerName, { color: colors.text }]} numberOfLines={1}>{userData.fullName}</Text>
                  <Text style={[styles.bankNameText, { color: colors.textSecondary }]}>{getBankName(userData.bankName)}</Text>
                  <Text style={[styles.bankAccountText, { color: colors.primary }]}>{userData.bankAccount}</Text>
                </View>
              </View>
            </View>
          )}
        </View>

        <TouchableOpacity style={styles.editButton} onPress={() => setIsEditing(true)}>
          <Edit2 color={colors.primary} size={20} />
          <Text style={[styles.editButtonText, { color: colors.primary }]}>{t('myCard.editButton')}</Text>
        </TouchableOpacity>
        <Footer />
        </ScrollView>
      </KeyboardAvoidingView>
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

const InputField = ({ label, value, onChange, placeholder, keyboardType, colors }) => (
  <View style={styles.inputContainer}>
    <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>
    <TextInput 
      style={[styles.input, { backgroundColor: colors.background, color: colors.text }]} 
      value={value} 
      onChangeText={onChange} 
      placeholder={placeholder} 
      keyboardType={keyboardType}
      placeholderTextColor={colors.textSecondary}
    />
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: Spacing.lg },
  previewScroll: { padding: Spacing.lg, alignItems: 'center' },
  screenTitle: { fontSize: 32, fontWeight: '800', marginBottom: Spacing.xl, alignSelf: 'flex-start' },
  tabContainer: { flexDirection: 'row', padding: 5, borderRadius: 15, marginBottom: 20, width: '100%' },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 12 },
  tabText: { marginLeft: 8, fontWeight: '700', fontSize: 13 },
  formCard: { borderRadius: 24, padding: Spacing.lg, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 15, elevation: 5 },
  sectionDivider: { fontSize: 11, fontWeight: '800', color: '#8E8E93', marginBottom: 15, letterSpacing: 1 },
  avatarPicker: { alignSelf: 'center', marginBottom: Spacing.lg, position: 'relative' },
  avatarImage: { width: 100, height: 100, borderRadius: 50 },
  avatarPlaceholder: { width: 100, height: 100, borderRadius: 50, justifyContent: 'center', alignItems: 'center' },
  cameraBadge: { position: 'absolute', bottom: 0, right: 0, width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: '#fff' },
  inputContainer: { marginBottom: Spacing.md },
  label: { fontSize: 13, fontWeight: '600', marginBottom: Spacing.xs, marginLeft: 4, textTransform: 'uppercase' },
  input: { borderRadius: 14, padding: 16, fontSize: 16 },
  phoneInputRow: { flexDirection: 'row', alignItems: 'center' },
  countrySelector: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, height: 55, borderRadius: 14, minWidth: 90, justifyContent: 'center' },
  primaryButton: { borderRadius: 16, padding: 18, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: Spacing.md },
  primaryButtonText: { color: '#FFF', fontSize: 17, fontWeight: 'bold', marginLeft: 8 },
  digitalCard: { borderRadius: 32, padding: 25, width: '100%', shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 30, elevation: 10 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  cardAvatar: { width: 70, height: 70, borderRadius: 20 },
  cardAvatarPlaceholder: { width: 70, height: 70, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  headerInfo: { marginLeft: 15, flex: 1 },
  cardName: { fontSize: 22, fontWeight: 'bold' },
  cardTitle: { fontSize: 14, marginTop: 2 },
  cardCompany: { fontSize: 13, fontWeight: '600', marginTop: 2 },
  divider: { height: 1, backgroundColor: 'rgba(0,0,0,0.05)', marginVertical: 15 },
  qrSection: { alignItems: 'center', marginVertical: 10 },
  qrContainer: { padding: 12, backgroundColor: '#FFF', borderRadius: 20, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10 },
  contactQrWrapper: { position: 'relative', alignItems: 'center', justifyContent: 'center' },
  qrLogoBadge: { position: 'absolute', left: '50%', top: '50%', zIndex: 2, elevation: 4, backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', opacity: 0.96 },
  qrLogoImage: { backgroundColor: '#FFF' },
  qrHint: { marginTop: 10, fontSize: 12, color: '#8E8E93', fontWeight: '600' },
  bankView: { alignItems: 'center', width: '100%' },
  bankHeader: { alignItems: 'center', marginBottom: 14 },
  bankBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, marginBottom: 10 },
  bankBadgeText: { marginLeft: 6, fontSize: 12, fontWeight: '800' },
  bankTitle: { fontSize: 21, fontWeight: '800' },
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
  editButton: { flexDirection: 'row', alignItems: 'center', marginTop: Spacing.xl, padding: Spacing.md },
  editButtonText: { fontSize: 16, fontWeight: '600', marginLeft: 8 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 25, height: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: 'bold' },
  modalItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 0.5, borderBottomColor: 'rgba(0,0,0,0.05)', paddingHorizontal: 10, borderRadius: 10 },
  modalItemText: { fontSize: 15, fontWeight: '600' },
  bankLogoSmall: { width: 40, height: 25, marginRight: 12 },
  countryIconBox: { width: 32, height: 32, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  searchBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, paddingVertical: 10, borderRadius: 15, marginBottom: 15 },
  searchInput: { flex: 1, marginLeft: 10, fontSize: 15, fontWeight: '500' }
});
