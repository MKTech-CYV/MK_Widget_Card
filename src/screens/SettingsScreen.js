import React, { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View, ScrollView, TouchableOpacity } from 'react-native';
import { ChevronRight, ShieldCheck, Moon, Bell, Info, Sun, Monitor, Languages, Landmark, User as UserIcon } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, Spacing } from '../constants/Theme';
import Footer from '../components/Footer';
import { useAppPreferences } from '../context/AppPreferencesContext';
import { getTranslation } from '../constants/i18n';

export default function SettingsScreen({ navigation }) {
  const { colors, mode, setTheme } = useTheme();
  const insets = useSafeAreaInsets();
  const { language, setLanguage } = useAppPreferences();
  const [changingLanguage, setChangingLanguage] = useState(null);
  const t = (key) => getTranslation(language, key);

  const openMyCardEditor = (section) => {
    navigation.getParent()?.navigate('MyCardTab', {
      editSection: section,
      editRequestId: Date.now(),
    });
  };

  const handleLanguageChange = async (nextLanguage) => {
    if (nextLanguage === language || changingLanguage) {
      return;
    }

    setChangingLanguage(nextLanguage);
    try {
      await Promise.all([
        setLanguage(nextLanguage),
        new Promise(resolve => setTimeout(resolve, 350)),
      ]);
    } finally {
      setChangingLanguage(null);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 20 }]}>
        <Text style={[styles.screenTitle, { color: colors.text }]}>{t('settings.title')}</Text>

        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <Text style={[styles.sectionHeader, { color: colors.textSecondary }]}>{t('settings.displayMode')}</Text>
          <View style={styles.themeSelector}>
            <ThemeOption 
              active={mode === 'light'} 
              icon={<Sun size={20} color={mode === 'light' ? '#fff' : colors.primary} />} 
              label={t('settings.light')} 
              onPress={() => setTheme('light')}
              colors={colors}
            />
            <ThemeOption 
              active={mode === 'dark'} 
              icon={<Moon size={20} color={mode === 'dark' ? '#fff' : colors.primary} />} 
              label={t('settings.dark')} 
              onPress={() => setTheme('dark')}
              colors={colors}
            />
            <ThemeOption 
              active={mode === 'system'} 
              icon={<Monitor size={20} color={mode === 'system' ? '#fff' : colors.primary} />} 
              label={t('settings.system')} 
              onPress={() => setTheme('system')}
              colors={colors}
            />
          </View>
        </View>

        <View style={[styles.section, { backgroundColor: colors.card }]}> 
          <Text style={[styles.sectionHeader, { color: colors.textSecondary }]}>{t('settings.languageSection')}</Text>
          <Text style={[styles.languageNote, { color: colors.textSecondary }]}>{t('settings.languageNote')}</Text>
          <View style={styles.languageSelector}>
            <ThemeOption 
              active={language === 'vi'} 
              icon={<Languages size={20} color={language === 'vi' ? '#fff' : colors.primary} />} 
              label={t('common.vietnamese')} 
              onPress={() => handleLanguageChange('vi')}
              loading={changingLanguage === 'vi'}
              disabled={Boolean(changingLanguage)}
              colors={colors}
            />
            <ThemeOption 
              active={language === 'en'} 
              icon={<Languages size={20} color={language === 'en' ? '#fff' : colors.primary} />} 
              label={t('common.english')} 
              onPress={() => handleLanguageChange('en')}
              loading={changingLanguage === 'en'}
              disabled={Boolean(changingLanguage)}
              colors={colors}
            />
          </View>
        </View>

        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <Text style={[styles.sectionHeader, { color: colors.textSecondary }]}>{t('settings.appSection')}</Text>
          <SettingItem
            icon={<UserIcon size={22} color={colors.primary} />}
            label={t('settings.editECardInfo')}
            onPress={() => openMyCardEditor('ecard')}
            colors={colors}
          />
          <SettingItem
            icon={<Landmark size={22} color="#34C759" />}
            label={t('settings.editBankInfo')}
            onPress={() => openMyCardEditor('bank')}
            colors={colors}
          />
          <SettingItem 
            icon={<Bell size={22} color="#FF9500" />} 
            label={t('settings.notifications')} 
            onPress={() => navigation.navigate('Notifications')}
            colors={colors}
          />
        </View>

        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <Text style={[styles.sectionHeader, { color: colors.textSecondary }]}>{t('settings.legalSection')}</Text>
          <SettingItem 
            icon={<ShieldCheck size={22} color={colors.success} />} 
            label={t('settings.terms')} 
            onPress={() => navigation.navigate('Terms')}
            colors={colors}
          />
          <SettingItem 
            icon={<Info size={22} color={colors.textSecondary} />} 
            label={t('settings.versionLabel')} 
            right={<Text style={[styles.versionText, { color: colors.textSecondary }]}>{getTranslation(language, 'about.appVersion')}</Text>}
            colors={colors}
          />
        </View>
        
        <Footer />
      </ScrollView>
    </View>
  );
}

const ThemeOption = ({ active, icon, label, onPress, colors, loading = false, disabled = false }) => (
  <TouchableOpacity 
    style={[
      styles.themeOption, 
      { backgroundColor: colors.background },
      active && { backgroundColor: colors.primary },
      disabled && !loading && { opacity: 0.62 }
    ]} 
    onPress={onPress}
    disabled={disabled || loading}
    accessibilityState={{ selected: active, busy: loading, disabled: disabled || loading }}
  >
    {loading ? <ActivityIndicator color={active ? '#fff' : colors.primary} /> : icon}
    <Text style={[
      styles.themeOptionLabel, 
      { color: colors.text },
      active && { color: '#fff' }
    ]}>{label}</Text>
  </TouchableOpacity>
);

export function TermsScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { language } = useAppPreferences();
  const t = (key) => getTranslation(language, key);
  const termBlocks = ['block1', 'block2', 'block3', 'block4', 'block5'];
  
  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: colors.background }]} 
      contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 60 }]}
    >
      <Text style={[styles.screenTitle, { color: colors.text }]}>{t('terms.title')}</Text>
      <View style={[styles.termsCard, { backgroundColor: colors.card }]}>
        <ShieldCheck color={colors.success} size={40} style={{ alignSelf: 'center', marginBottom: 20 }} />
        {termBlocks.map(block => (
          <TermBlock
            key={block}
            title={t(`terms.${block}Title`)}
            content={t(`terms.${block}Content`)}
            colors={colors}
          />
        ))}
      </View>
      <Footer />
    </ScrollView>
  );
}

const TermBlock = ({ title, content, colors }) => (
  <View style={{ marginBottom: Spacing.lg }}>
    <Text style={[styles.termTitle, { color: colors.text }]}>{title}</Text>
    <Text style={[styles.termContent, { color: colors.textSecondary }]}>{content}</Text>
  </View>
);

const SettingItem = ({ icon, label, right, onPress, colors }) => (
  <TouchableOpacity 
    style={[styles.settingItem, { borderBottomColor: colors.background }]} 
    onPress={onPress} 
    disabled={!onPress}
  >
    <View style={styles.settingLeft}>
      <View style={[styles.iconBox, { backgroundColor: colors.background }]}>{icon}</View>
      <Text style={[styles.settingLabel, { color: colors.text }]}>{label}</Text>
    </View>
    {right || (onPress && <ChevronRight color={colors.border} size={20} />)}
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: Spacing.lg },
  screenTitle: { fontSize: 32, fontWeight: '800', marginBottom: Spacing.xl },
  section: { borderRadius: 24, marginBottom: Spacing.lg, overflow: 'hidden' },
  sectionHeader: { fontSize: 12, fontWeight: '700', marginLeft: Spacing.lg, marginBottom: Spacing.sm, marginTop: Spacing.md, textTransform: 'uppercase' },
  themeSelector: { flexDirection: 'row', padding: 10, justifyContent: 'space-between' },
  languageSelector: { flexDirection: 'row', padding: 10, justifyContent: 'space-between' },
  languageNote: { fontSize: 13, lineHeight: 18, paddingHorizontal: 18, marginBottom: 8 },
  themeOption: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 12, marginHorizontal: 5, borderRadius: 14 },
  themeOptionLabel: { fontSize: 12, fontWeight: '600', marginTop: 4 },
  settingItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 18, borderBottomWidth: 0.5 },
  settingLeft: { flexDirection: 'row', alignItems: 'center' },
  iconBox: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  settingLabel: { fontSize: 17, fontWeight: '500' },
  versionText: { fontSize: 15 },
  termsCard: { borderRadius: 24, padding: 25 },
  termTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 8 },
  termContent: { fontSize: 15, lineHeight: 22 }
});
