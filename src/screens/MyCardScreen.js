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
  FlatList
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Edit2, Save, Camera, User as UserIcon, Landmark, ChevronDown, Check, Globe } from 'lucide-react-native';
import { useTheme, Spacing } from '../constants/Theme';
import { StorageService } from '../services/StorageService';
import Footer from '../components/Footer';

const { width } = Dimensions.get('window');
const APP_LOGO = require('../../assets/icon.png');

const COUNTRY_CODES = [
  { code: '+84', name: 'Việt Nam' },
  { code: '+1', name: 'USA' },
  { code: '+44', name: 'UK' },
  { code: '+81', name: 'Japan' },
  { code: '+82', name: 'Korea' },
  { code: '+65', name: 'Singapore' },
];

const POPULAR_BANKS = [
  { id: 'MB', name: 'MB Bank' },
  { id: 'VCB', name: 'Vietcombank' },
  { id: 'ICB', name: 'VietinBank' },
  { id: 'BIDV', name: 'BIDV' },
  { id: 'TCB', name: 'Techcombank' },
  { id: 'ACB', name: 'ACB' },
  { id: 'VPB', name: 'VPBank' },
  { id: 'VIB', name: 'VIB' },
  { id: 'TPB', name: 'TPBank' },
  { id: 'STB', name: 'Sacombank' },
];

export default function MyCardScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [userData, setUserData] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState('contact');
  const [showCountryModal, setShowCountryModal] = useState(false);
  const [showBankModal, setShowBankModal] = useState(false);
  
  const [formData, setFormData] = useState({
    fullName: '', phone: '', email: '', title: '', company: '', avatar: null,
    bankName: 'MB', bankAccount: '', countryCode: '+84'
  });

  useEffect(() => {
    StorageService.init();
    loadData();
  }, []);

  const loadData = async () => {
    const data = await StorageService.getUserData();
    if (data) {
      setUserData(data);
      setFormData({
        ...data,
        countryCode: data.countryCode || '+84',
        bankName: data.bankName || 'MB'
      });
    }
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
      base64: true,
    });

    if (!result.canceled) {
      setFormData({ ...formData, avatar: `data:image/jpeg;base64,${result.assets[0].base64}` });
    }
  };

  const handleSave = async () => {
    if (!formData.fullName) return Alert.alert('Lỗi', 'Vui lòng nhập họ tên');
    try {
      await StorageService.setUserData(formData);
      setUserData(formData);
      setIsEditing(false);
      Alert.alert('Thành công', 'Thông tin đã được đồng bộ với Widget');
    } catch (error) {
      Alert.alert('Lỗi', 'Không thể lưu dữ liệu');
    }
  };

  const vCardContent = userData ? 
    `BEGIN:VCARD\nVERSION:3.0\nFN:${userData.fullName}\nTEL:${userData.countryCode}${userData.phone}\nEMAIL:${userData.email}\nORG:${userData.company}\nTITLE:${userData.title}\nEND:VCARD` 
    : '';

  const bankQrUrl = userData?.bankName && userData?.bankAccount ? 
    `https://img.vietqr.io/image/${userData.bankName}-${userData.bankAccount}-compact.png?accountName=${encodeURIComponent(userData.fullName)}` : null;

  const SelectionModal = ({ visible, onClose, data, onSelect, title, selectedId, type }) => (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>{title}</Text>
            <TouchableOpacity onPress={onClose}><Text style={{ color: colors.primary, fontWeight: '700' }}>Hủy</Text></TouchableOpacity>
          </View>
          <FlatList
            data={data}
            keyExtractor={item => item.code || item.id}
            renderItem={({ item }) => {
              const id = item.code || item.id;
              const isSelected = selectedId === id;
              return (
                <TouchableOpacity 
                  style={[styles.modalItem, isSelected && { backgroundColor: colors.background }]} 
                  onPress={() => { onSelect(id); onClose(); }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    {type === 'country' ? <Globe size={18} color={colors.textSecondary} style={{ marginRight: 10 }} /> : <Landmark size={18} color={colors.textSecondary} style={{ marginRight: 10 }} />}
                    <Text style={[styles.modalItemText, { color: colors.text }]}>
                      {item.name} ({id})
                    </Text>
                  </View>
                  {isSelected && <Check color={colors.primary} size={20} />}
                </TouchableOpacity>
              );
            }}
          />
        </View>
      </View>
    </Modal>
  );

  if (!userData || isEditing) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ScrollView 
          contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 20 }]}
          showsVerticalScrollIndicator={false}
        >
          <Text style={[styles.screenTitle, { color: colors.text }]}>{userData ? 'Chỉnh sửa' : 'Khởi tạo eCard'}</Text>
          
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

            <Text style={styles.sectionDivider}>THÔNG TIN CÁ NHÂN</Text>
            
            <InputField label="Họ và Tên" value={formData.fullName} onChange={v => setFormData({...formData, fullName: v})} placeholder="Nguyễn Văn A" colors={colors} />
            
            <View style={styles.inputContainer}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Số điện thoại</Text>
              <View style={styles.phoneInputRow}>
                <TouchableOpacity 
                  style={[styles.countrySelector, { backgroundColor: colors.background }]} 
                  onPress={() => setShowCountryModal(true)}
                >
                  <Text style={{ color: colors.text, fontWeight: '700' }}>{formData.countryCode}</Text>
                  <ChevronDown color={colors.textSecondary} size={14} />
                </TouchableOpacity>
                <TextInput 
                  style={[styles.input, { flex: 1, backgroundColor: colors.background, color: colors.text, marginLeft: 10 }]} 
                  value={formData.phone} 
                  onChangeText={v => setFormData({...formData, phone: v})} 
                  placeholder="0988xxxxxx" 
                  keyboardType="phone-pad"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>
            </View>

            <InputField label="Email" value={formData.email} onChange={v => setFormData({...formData, email: v})} placeholder="email@example.com" colors={colors} />
            <InputField label="Chức danh" value={formData.title} onChange={v => setFormData({...formData, title: v})} placeholder="Giám đốc" colors={colors} />
            <InputField label="Công ty" value={formData.company} onChange={v => setFormData({...formData, company: v})} placeholder="MKTech" colors={colors} />

            <Text style={[styles.sectionDivider, { marginTop: 20 }]}>THÔNG TIN NGÂN HÀNG (VIETQR)</Text>
            
            <View style={styles.inputContainer}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Ngân hàng</Text>
              <TouchableOpacity 
                style={[styles.input, { backgroundColor: colors.background, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]} 
                onPress={() => setShowBankModal(true)}
              >
                <Text style={{ color: colors.text, fontSize: 16 }}>{formData.bankName}</Text>
                <ChevronDown color={colors.textSecondary} size={20} />
              </TouchableOpacity>
            </View>

            <InputField label="Số tài khoản" value={formData.bankAccount} onChange={v => setFormData({...formData, bankAccount: v})} placeholder="0335337802" keyboardType="numeric" colors={colors} />

            <TouchableOpacity style={[styles.primaryButton, { backgroundColor: colors.primary }]} onPress={handleSave}>
              <Save color="#fff" size={20} />
              <Text style={styles.primaryButtonText}> Lưu & Đồng bộ Widget</Text>
            </TouchableOpacity>
          </View>
          <Footer />
        </ScrollView>

        <SelectionModal 
          visible={showCountryModal} 
          onClose={() => setShowCountryModal(false)} 
          data={COUNTRY_CODES} 
          onSelect={code => setFormData({...formData, countryCode: code})}
          title="Chọn mã vùng"
          selectedId={formData.countryCode}
          type="country"
        />
        <SelectionModal 
          visible={showBankModal} 
          onClose={() => setShowBankModal(false)} 
          data={POPULAR_BANKS} 
          onSelect={id => setFormData({...formData, bankName: id})}
          title="Chọn ngân hàng"
          selectedId={formData.bankName}
          type="bank"
        />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView 
        contentContainerStyle={[styles.previewScroll, { paddingTop: insets.top + 20 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.screenTitle, { color: colors.text }]}>eCard của tôi</Text>
        
        <View style={[styles.tabContainer, { backgroundColor: colors.card }]}>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'contact' && { backgroundColor: colors.primary }]}
            onPress={() => setActiveTab('contact')}
          >
            <UserIcon color={activeTab === 'contact' ? '#fff' : colors.textSecondary} size={18} />
            <Text style={[styles.tabText, { color: activeTab === 'contact' ? '#fff' : colors.textSecondary }]}>Liên hệ</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'bank' && { backgroundColor: colors.primary }]}
            onPress={() => setActiveTab('bank')}
          >
            <Landmark color={activeTab === 'bank' ? '#fff' : colors.textSecondary} size={18} />
            <Text style={[styles.tabText, { color: activeTab === 'bank' ? '#fff' : colors.textSecondary }]}>Ngân hàng</Text>
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
                  <QRCode 
                    value={vCardContent} 
                    size={width * 0.45} 
                    logo={APP_LOGO}
                    logoSize={width * 0.12}
                    logoBackgroundColor="#fff"
                    logoBorderRadius={10}
                    ecl="H"
                  />
                </View>
                <Text style={styles.qrHint}>Quét mã để lưu danh bạ</Text>
              </View>
            </>
          ) : (
            <View style={styles.bankView}>
               <Text style={[styles.bankTitle, { color: colors.text }]}>Mã QR Thanh toán</Text>
               <View style={styles.qrSection}>
                <View style={[styles.qrContainer, { padding: 5 }]}>
                  {bankQrUrl ? (
                    <Image source={{ uri: bankQrUrl }} style={{ width: width * 0.6, height: width * 0.6 }} resizeMode="contain" />
                  ) : (
                    <View style={{ width: width * 0.6, height: width * 0.6, justifyContent: 'center', alignItems: 'center' }}>
                      <Text style={{ color: colors.textSecondary }}>Chưa có thông tin ngân hàng</Text>
                    </View>
                  )}
                </View>
                <View style={{ marginTop: 15, alignItems: 'center' }}>
                  <Text style={[styles.cardName, { color: colors.text }]}>{userData.bankName}</Text>
                  <Text style={[styles.cardTitle, { color: colors.primary, fontWeight: '800', fontSize: 22 }]}>{userData.bankAccount}</Text>
                  <Text style={[styles.cardCompany, { color: colors.textSecondary }]}>{userData.fullName}</Text>
                </View>
              </View>
            </View>
          )}
        </View>

        <TouchableOpacity style={styles.editButton} onPress={() => setIsEditing(true)}>
          <Edit2 color={colors.primary} size={20} />
          <Text style={[styles.editButtonText, { color: colors.primary }]}> Chỉnh sửa thông tin</Text>
        </TouchableOpacity>
        <Footer />
      </ScrollView>
    </View>
  );
}

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
  countrySelector: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, height: 55, borderRadius: 14, minWidth: 80, justifyContent: 'center' },
  primaryButton: { borderRadius: 16, padding: 18, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: Spacing.md },
  primaryButtonText: { color: '#FFF', fontSize: 17, fontWeight: 'bold' },
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
  qrHint: { marginTop: 10, fontSize: 12, color: '#8E8E93', fontWeight: '600' },
  bankView: { alignItems: 'center' },
  bankTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15 },
  editButton: { flexDirection: 'row', alignItems: 'center', marginTop: Spacing.xl, padding: Spacing.md },
  editButtonText: { fontSize: 16, fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 25, height: '60%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: 'bold' },
  modalItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 15, borderBottomWidth: 0.5, borderBottomColor: 'rgba(0,0,0,0.05)', paddingHorizontal: 10, borderRadius: 10 },
  modalItemText: { fontSize: 16, fontWeight: '500' }
});
