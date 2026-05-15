import React from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Image, Dimensions, Linking } from 'react-native';
import * as Icons from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, Spacing } from '../constants/Theme';
import Footer from '../components/Footer';
import { useAppPreferences } from '../context/AppPreferencesContext';
import { getTranslation } from '../constants/i18n';

const { width } = Dimensions.get('window');
const APP_LOGO = require('../../assets/icon.png');

const FeatureItem = ({ icon: Icon, title, colors }) => (
  <View style={[styles.featureBadge, { backgroundColor: colors.card, borderColor: colors.border }]}>
    <Icon color={colors.primary} size={16} />
    <Text style={[styles.featureBadgeText, { color: colors.text }]}>{title}</Text>
  </View>
);

const ContactLink = ({ icon: Icon, label, value, onPress, colors }) => (
  <TouchableOpacity style={[styles.contactLink, { backgroundColor: colors.card }]} onPress={onPress}>
    <View style={[styles.contactLinkIcon, { backgroundColor: colors.background }]}>
      <Icon color={colors.primary} size={18} />
    </View>
    <View style={styles.contactLinkText}>
      <Text style={[styles.contactLinkLabel, { color: colors.textSecondary }]}>{label}</Text>
      <Text style={[styles.contactLinkValue, { color: colors.text }]}>{value}</Text>
    </View>
    <Icons.ChevronRight color={colors.border} size={16} />
  </TouchableOpacity>
);

export default function AboutScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { language } = useAppPreferences();
  const t = (key) => getTranslation(language, key);
  
  const Mail = Icons.Mail || Icons.Info || View;
  const Heart = Icons.Heart || Icons.Info || View;
  const Smartphone = Icons.Smartphone || Icons.Info || View;
  const Zap = Icons.Zap || Icons.Info || View;
  const Shield = Icons.Shield || Icons.Info || View;
  const Cpu = Icons.Cpu || Icons.Info || View;
  const Phone = Icons.Phone || Icons.Info || View;
  const Globe = Icons.Globe || Icons.Info || View;

  const donateQrUrl = `https://img.vietqr.io/image/MB-0335337802-qr_only.png?amount=0&addInfo=Donate%20MK%20Widget%20Card&accountName=TRAN%20MINH%20KHOI`;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 58 }]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.headerRow}>
        <Image source={APP_LOGO} style={styles.miniLogo} />
        <View style={styles.headerText}>
          <Text style={[styles.appName, { color: colors.text }]}>{t('about.appName')}</Text>
          <Text style={[styles.appVersion, { color: colors.textSecondary }]}>{t('about.appVersion')}</Text>
        </View>
        <View style={styles.aiBadge}>
          <Cpu color={colors.success} size={12} />
          <Text style={[styles.aiBadgeText, { color: colors.success }]}>{t('about.aiBadge')}</Text>
        </View>
      </View>

      <View style={styles.introSection}>
        <Text style={[styles.tagline, { color: colors.text }]}>{t('about.tagline')}</Text>
        <Text style={[styles.description, { color: colors.textSecondary }]}>{t('about.description')}</Text>
      </View>

      <View style={styles.featureRow}>
        <FeatureItem icon={Smartphone} title={t('about.featureWidget')} colors={colors} />
        <FeatureItem icon={Zap} title={t('about.featureScan')} colors={colors} />
        <FeatureItem icon={Shield} title={t('about.featureSecurity')} colors={colors} />
      </View>

      <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('about.contactTitle')}</Text>
      <View style={styles.contactContainer}>
        <ContactLink
          icon={Globe}
          label={t('about.creatorWebsite')}
          value="tranminhkhoi.dev"
          onPress={() => Linking.openURL('https://tranminhkhoi.dev')}
          colors={colors}
        />
        <ContactLink
          icon={Globe}
          label={t('about.projectWebsite')}
          value="mktechvn.com"
          onPress={() => Linking.openURL('https://mktechvn.com')}
          colors={colors}
        />
        <ContactLink
          icon={Mail}
          label={t('about.email')}
          value="contact@tranminhkhoi.dev"
          onPress={() => Linking.openURL('mailto:contact@tranminhkhoi.dev')}
          colors={colors}
        />
        <ContactLink
          icon={Phone}
          label={t('about.hotline')}
          value="0988 20 40 60"
          onPress={() => Linking.openURL('tel:0988204060')}
          colors={colors}
        />
      </View>

      <View style={[styles.donateCard, { backgroundColor: colors.card }]}>
        <View style={styles.donateTop}>
          <View style={styles.donateInfo}>
            <View style={styles.donateHeader}>
              <Heart color="#FF3B30" size={20} fill="#FF3B30" />
              <Text style={[styles.donateTitle, { color: colors.text }]}>{t('about.donateTitle')}</Text>
            </View>
            <Text style={[styles.donateDesc, { color: colors.textSecondary }]}>{t('about.donateDesc')}</Text>

            <View style={styles.bankDetails}>
              <Text style={[styles.bankName, { color: colors.text }]}>{t('about.bankName')}</Text>
              <Text style={[styles.bankAccount, { color: colors.primary }]}>0335337802</Text>
              <Text style={[styles.accountName, { color: colors.textSecondary }]}>{t('about.accountName')}</Text>
            </View>
          </View>

          <View style={[styles.bankQrContainer, { backgroundColor: '#fff' }]}>
            <Image
              source={{ uri: donateQrUrl }}
              style={styles.bankQrImage}
              resizeMode="contain"
            />
          </View>
        </View>
      </View>

      <Footer />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: Spacing.lg },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  miniLogo: { width: 56, height: 56, borderRadius: 14 },
  headerText: { marginLeft: 15, flex: 1 },
  appName: { fontSize: 24, fontWeight: '800' },
  appVersion: { fontSize: 13, fontWeight: '600' },
  aiBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(52, 199, 89, 0.1)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20 },
  aiBadgeText: { fontSize: 11, fontWeight: '800', marginLeft: 4 },
  introSection: { marginBottom: 20 },
  tagline: { fontSize: 17, fontWeight: '700', marginBottom: 8 },
  description: { fontSize: 14, lineHeight: 22 },
  featureRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 30 },
  featureBadge: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1, flex: 0.31, justifyContent: 'center' },
  featureBadgeText: { fontSize: 12, fontWeight: '700', marginLeft: 6 },
  sectionTitle: { fontSize: 15, fontWeight: '800', marginBottom: 15, textTransform: 'uppercase', letterSpacing: 1 },
  contactContainer: { marginBottom: 30 },
  contactLink: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 18, marginBottom: 10, shadowOpacity: 0.02, shadowRadius: 10, elevation: 1 },
  contactLinkIcon: { width: 38, height: 38, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  contactLinkText: { flex: 1, marginLeft: 15 },
  contactLinkLabel: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase' },
  contactLinkValue: { fontSize: 15, fontWeight: '700', marginTop: 1 },
  donateCard: { borderRadius: 24, padding: 20, shadowOpacity: 0.05, shadowRadius: 15, elevation: 2 },
  donateTop: { flexDirection: 'row', alignItems: 'center' },
  donateInfo: { flex: 1, marginRight: 10 },
  donateHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  donateTitle: { fontSize: 18, fontWeight: 'bold', marginLeft: 8 },
  donateDesc: { fontSize: 13, marginBottom: 15 },
  bankDetails: { marginTop: 5 },
  bankName: { fontSize: 14, fontWeight: 'bold' },
  bankAccount: { fontSize: 16, fontWeight: '800', marginVertical: 2 },
  accountName: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  bankQrContainer: { padding: 8, borderRadius: 16 },
  bankQrImage: { width: width * 0.32, height: width * 0.32 }
});
