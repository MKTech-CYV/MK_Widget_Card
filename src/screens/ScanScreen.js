import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Alert, ActivityIndicator, Modal, NativeModules, PermissionsAndroid, Platform, Image as RNImage, ScrollView } from 'react-native';
import { CameraView, useCameraPermissions, scanFromURLAsync } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { AtSign, BadgeCheck, Briefcase, Building2, Globe2, Image as ImageIcon, Mail, MapPin, MessageCircle, Phone, RefreshCw, Scan, User, UserPlus, X } from 'lucide-react-native';
import { useTheme, Spacing } from '../constants/Theme';
import { useAppPreferences } from '../context/AppPreferencesContext';
import { getTranslation } from '../constants/i18n';
import { parseVCard } from '../utils/vcard';
import { buildExpoContact, contactPayloadFromResult } from '../utils/contactSavePayload';

const { ContactSaver } = NativeModules;

const requestAndroidContactsPermission = async () => {
  if (Platform.OS !== 'android') return true;

  const result = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.WRITE_CONTACTS);
  return result === PermissionsAndroid.RESULTS.GRANTED;
};

export default function ScanScreen() {
  const { colors } = useTheme();
  const { language } = useAppPreferences();
  const t = (key) => getTranslation(language, key);
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [savingContact, setSavingContact] = useState(false);
  const [contactSaved, setContactSaved] = useState(false);
  const [uploadingCard, setUploadingCard] = useState(false);

  if (!permission) {
    return <View style={[styles.centerContainer, { backgroundColor: colors.background }]}><ActivityIndicator size="large" color={colors.primary} /></View>;
  }

  if (!permission.granted) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.background }]}>
        <View style={[styles.permissionCard, { backgroundColor: colors.card }]}>
          <Scan color={colors.primary} size={64} />
          <Text style={[styles.permissionTitle, { color: colors.text }]}>{t('scan.cameraPermissionTitle')}</Text>
          <Text style={[styles.permissionDesc, { color: colors.textSecondary }]}>{t('scan.cameraPermissionDesc')}</Text>
          <TouchableOpacity style={[styles.primaryButton, { backgroundColor: colors.primary }]} onPress={requestPermission}>
            <Text style={styles.primaryButtonText}>{t('scan.allowCamera')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const resetScan = () => {
    setScanResult(null);
    setScanned(false);
    setSavingContact(false);
    setContactSaved(false);
    setUploadingCard(false);
  };

  const handleUploadCard = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert(t('scan.libraryPermissionTitle'), t('scan.libraryPermissionDesc'));
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 1,
      });

      if (result.canceled || !result.assets?.length) return;

      const asset = result.assets[0];
      const imageUri = asset.uri;
      setUploadingCard(true);

      const scans = await scanFromURLAsync(imageUri, ['qr']);
      const bestScan = scans?.[0];

      if (!bestScan?.data) {
        Alert.alert(t('scan.qrNotFoundTitle'), t('scan.qrNotFoundDesc'));
        return;
      }

      setScanned(true);
      setScanResult(parseVCard(bestScan.data));
    } catch (error) {
      Alert.alert(t('scan.cannotReadTitle'), t('scan.cannotReadDesc'));
    } finally {
      setUploadingCard(false);
    }
  };

  const handleBarCodeScanned = ({ data }) => {
    setScanned(true);
    setScanResult(parseVCard(data));
  };

  const handleSaveContact = async () => {
    if (!scanResult?.isVCard || !scanResult.fullName) return;

    setSavingContact(true);

    try {
      if (ContactSaver?.saveContact) {
        const hasPermission = await requestAndroidContactsPermission();
        if (!hasPermission) {
          Alert.alert(t('scan.contactsPermissionTitle'), t('scan.contactsPermissionDesc'));
          return;
        }

        await ContactSaver.saveContact(contactPayloadFromResult(scanResult, t));
        setContactSaved(true);
        return;
      }

      // Dynamic import to avoid crashing when the native module
      // isn't present in the current runtime (e.g. old dev client).
      const Contacts = await import('expo-contacts');

      const { status } = await Contacts.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(t('scan.contactsPermissionTitle'), t('scan.contactsPermissionDesc'));
        return;
      }

      await Contacts.addContactAsync(buildExpoContact(Contacts, scanResult, t));
      setContactSaved(true);
    } catch (error) {
      const message = `${error?.message || error || ''}`;
      if (message.includes('Cannot find native module') || message.includes('ExpoContacts')) {
        Alert.alert(
          t('scan.cannotSaveTitle'),
          'Contacts module is not available in this build. Please rebuild the app/dev client and try again.'
        );
      } else {
        Alert.alert(t('scan.cannotSaveTitle'), t('scan.saveFailedDesc'));
      }
    } finally {
      setSavingContact(false);
    }
  };

  return (
    <View style={styles.container}>
      <CameraView
        style={StyleSheet.absoluteFillObject}
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
        barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
      />
      
      {/* Scanner Overlay UI */}
      <View style={styles.overlay}>
        <View style={styles.topDim} />
        <View style={styles.middleRow}>
          <View style={styles.sideDim} />
          <View style={styles.cutout}>
            <View style={[styles.corner, styles.topLeft, { borderColor: colors.primary }]} />
            <View style={[styles.corner, styles.topRight, { borderColor: colors.primary }]} />
            <View style={[styles.corner, styles.bottomLeft, { borderColor: colors.primary }]} />
            <View style={[styles.corner, styles.bottomRight, { borderColor: colors.primary }]} />
          </View>
          <View style={styles.sideDim} />
        </View>
        <View style={styles.bottomDim}>
          <Text style={styles.scanHint}>{t('scan.hint')}</Text>
          <TouchableOpacity
            style={[styles.uploadButton, { backgroundColor: colors.primary }]}
            onPress={handleUploadCard}
            disabled={uploadingCard}
          >
            {uploadingCard ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <ImageIcon color="#FFF" size={18} />
            )}
            <Text style={styles.uploadButtonText}>
              {uploadingCard ? t('scan.uploading') : t('scan.uploadFromPhoto')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScanResultModal
        visible={Boolean(scanResult)}
        result={scanResult}
        colors={colors}
        isSaving={savingContact}
        isSaved={contactSaved}
        onSave={handleSaveContact}
        onClose={resetScan}
        t={t}
      />
    </View>
  );
}

const DetailRow = ({ icon: Icon, label, value, colors }) => {
  if (!value) return null;

  return (
    <View style={styles.detailRow}>
      <View style={[styles.detailIcon, { backgroundColor: `${colors.primary}14` }]}>
        <Icon color={colors.primary} size={17} />
      </View>
      <View style={styles.detailText}>
        <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>{label}</Text>
        <Text style={[styles.detailValue, { color: colors.text }]} numberOfLines={2}>{value}</Text>
      </View>
    </View>
  );
};

const ScanResultModal = ({ visible, result, colors, isSaving, isSaved, onSave, onClose, t }) => {
  if (!result) return null;

  const canSave = result.isVCard && Boolean(result.fullName) && !isSaved;
  const avatarSource = result.avatarDataUri || result.avatarUrl;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.resultBackdrop}>
        <View style={[styles.resultSheet, { backgroundColor: colors.card }]}>
          <View style={styles.resultHeader}>
            <View style={styles.resultTitleGroup}>
              <View style={[styles.resultAvatar, { backgroundColor: `${colors.primary}14` }]}>
                {isSaved ? (
                  <BadgeCheck color={colors.success} size={28} />
                ) : avatarSource ? (
                  <RNImage source={{ uri: avatarSource }} style={styles.resultAvatarImage} />
                ) : (
                  <User color={colors.primary} size={28} />
                )}
              </View>
              <View style={styles.resultHeadingText}>
                <Text style={[styles.resultEyebrow, { color: colors.textSecondary }]}>ECARD</Text>
                <Text style={[styles.resultTitle, { color: colors.text }]} numberOfLines={1}>
                  {result.isVCard ? t('scan.scannedCardTitle') : t('scan.qrContentTitle')}
                </Text>
              </View>
            </View>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <X color={colors.textSecondary} size={22} />
            </TouchableOpacity>
          </View>

          {result.isVCard ? (
            <ScrollView style={styles.resultDetailsScroll} showsVerticalScrollIndicator={false}>
              <View style={styles.nameBlock}>
                <Text style={[styles.contactName, { color: colors.text }]} numberOfLines={2}>
                  {result.fullName || t('scan.noName')}
                </Text>
                {!!(result.title || result.company) && (
                  <Text style={[styles.contactSubtitle, { color: colors.textSecondary }]} numberOfLines={2}>
                    {[result.title, result.company].filter(Boolean).join(' • ')}
                  </Text>
                )}
              </View>

              <View style={styles.detailList}>
                <DetailRow icon={Phone} label={t('scan.phoneLabel')} value={result.phone} colors={colors} />
                <DetailRow icon={Mail} label={t('scan.emailLabel')} value={result.email} colors={colors} />
                <DetailRow icon={Briefcase} label={t('scan.titleLabel')} value={result.title} colors={colors} />
                <DetailRow icon={Building2} label={t('scan.companyLabel')} value={result.company} colors={colors} />
                <DetailRow icon={Building2} label={t('scan.departmentLabel')} value={result.department} colors={colors} />
                <DetailRow icon={Globe2} label={t('scan.websiteLabel')} value={result.website} colors={colors} />
                <DetailRow icon={MapPin} label={t('scan.addressLabel')} value={result.address} colors={colors} />
                <DetailRow icon={AtSign} label={t('scan.linkedinLabel')} value={result.linkedin} colors={colors} />
                <DetailRow icon={AtSign} label={t('scan.facebookLabel')} value={result.facebook} colors={colors} />
                <DetailRow icon={MessageCircle} label={t('scan.zaloLabel')} value={result.zalo} colors={colors} />
                <DetailRow icon={MessageCircle} label={t('scan.whatsappLabel')} value={result.whatsapp} colors={colors} />
                <DetailRow icon={MessageCircle} label={t('scan.telegramLabel')} value={result.telegram} colors={colors} />
                <DetailRow icon={MessageCircle} label={t('scan.bioLabel')} value={result.bio} colors={colors} />
              </View>

              {isSaved && (
                <View style={[styles.savedBanner, { backgroundColor: `${colors.success}18` }]}>
                  <BadgeCheck color={colors.success} size={18} />
                  <Text style={[styles.savedText, { color: colors.success }]}>{t('scan.savedToContacts')}</Text>
                </View>
              )}
            </ScrollView>
          ) : (
            <View style={[styles.rawQrBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <Text style={[styles.rawQrText, { color: colors.text }]} numberOfLines={6}>{result.raw}</Text>
            </View>
          )}

          <View style={styles.actionRow}>
            <TouchableOpacity style={[styles.secondaryButton, { borderColor: colors.border }]} onPress={onClose}>
              <RefreshCw color={colors.primary} size={18} />
              <Text style={[styles.secondaryButtonText, { color: colors.primary }]}>{t('scan.rescan')}</Text>
            </TouchableOpacity>

            {result.isVCard && (
              <TouchableOpacity
                style={[
                  styles.saveButton,
                  { backgroundColor: canSave ? colors.primary : colors.border },
                ]}
                onPress={onSave}
                disabled={!canSave || isSaving}
              >
                {isSaving ? <ActivityIndicator color="#FFF" /> : <UserPlus color="#FFF" size={18} />}
                <Text style={styles.saveButtonText}>{isSaved ? t('scan.saved') : t('scan.saveContact')}</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: Spacing.xl },
  permissionCard: { borderRadius: 24, padding: Spacing.xl, alignItems: 'center', width: '100%', shadowOpacity: 0.1 },
  permissionTitle: { fontSize: 20, fontWeight: 'bold', marginTop: Spacing.md },
  permissionDesc: { textAlign: 'center', marginTop: Spacing.sm, marginBottom: Spacing.xl, lineHeight: 20 },
  primaryButton: { borderRadius: 14, paddingVertical: 14, paddingHorizontal: 30, width: '100%', alignItems: 'center' },
  primaryButtonText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  topDim: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' },
  bottomDim: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', paddingTop: 30 },
  middleRow: { flexDirection: 'row', height: 260 },
  sideDim: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' },
  cutout: { width: 260, height: 260, backgroundColor: 'transparent' },
  corner: { position: 'absolute', width: 25, height: 25, borderWidth: 4 },
  topLeft: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0, borderTopLeftRadius: 15 },
  topRight: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0, borderTopRightRadius: 15 },
  bottomLeft: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0, borderBottomLeftRadius: 15 },
  bottomRight: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0, borderBottomRightRadius: 15 },
  scanHint: { color: '#FFF', fontSize: 16, fontWeight: '600' },
  uploadButton: { marginTop: 14, borderRadius: 14, paddingVertical: 12, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  uploadButtonText: { marginLeft: 10, color: '#FFF', fontSize: 15, fontWeight: '800' },

  resultBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.38)' },
  resultSheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 22, paddingBottom: 28 },
  resultHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 },
  resultTitleGroup: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  resultAvatar: { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  resultHeadingText: { flex: 1, marginLeft: 14 },
  resultEyebrow: { fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  resultTitle: { fontSize: 22, fontWeight: '800', marginTop: 2 },
  closeButton: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  resultAvatarImage: { width: 52, height: 52, borderRadius: 16 },
  resultDetailsScroll: { maxHeight: 430 },
  nameBlock: { marginBottom: 16 },
  contactName: { fontSize: 25, fontWeight: '900' },
  contactSubtitle: { marginTop: 5, fontSize: 14, fontWeight: '600', lineHeight: 20 },
  detailList: { marginTop: 2 },
  detailRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  detailIcon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  detailText: { flex: 1 },
  detailLabel: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase', marginBottom: 2 },
  detailValue: { fontSize: 16, fontWeight: '700', lineHeight: 21 },
  savedBanner: { marginTop: 12, borderRadius: 14, paddingVertical: 11, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center' },
  savedText: { marginLeft: 8, fontSize: 14, fontWeight: '800' },
  rawQrBox: { borderWidth: 1, borderRadius: 16, padding: 14, minHeight: 110 },
  rawQrText: { fontSize: 14, lineHeight: 20 },
  actionRow: { flexDirection: 'row', gap: 10, marginTop: 20 },
  secondaryButton: { flex: 1, height: 52, borderWidth: 1, borderRadius: 16, alignItems: 'center', justifyContent: 'center', flexDirection: 'row' },
  secondaryButtonText: { marginLeft: 8, fontSize: 15, fontWeight: '800' },
  saveButton: { flex: 1.15, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center', flexDirection: 'row' },
  saveButtonText: { marginLeft: 8, color: '#FFF', fontSize: 15, fontWeight: '800' },
});
