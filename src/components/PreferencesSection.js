import React, { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Languages, Monitor, Moon, Sun } from 'lucide-react-native';
import { useTheme } from '../constants/Theme';
import { useAppPreferences } from '../context/AppPreferencesContext';
import { SettingsSection } from './SettingsList';

const PreferenceOption = ({ active, icon, label, onPress, colors, loading = false, disabled = false }) => (
  <TouchableOpacity
    style={[
      styles.option,
      { backgroundColor: colors.background },
      active && { backgroundColor: colors.primary },
      disabled && !loading && { opacity: 0.62 },
    ]}
    onPress={onPress}
    disabled={disabled || loading}
    accessibilityState={{ selected: active, busy: loading, disabled: disabled || loading }}
  >
    {loading ? <ActivityIndicator color={active ? '#fff' : colors.primary} /> : icon}
    <Text style={[styles.optionLabel, { color: colors.text }, active && { color: '#fff' }]}>
      {label}
    </Text>
  </TouchableOpacity>
);

export default function PreferencesSection({ t, title }) {
  const { colors, mode, setTheme } = useTheme();
  const { language, setLanguage } = useAppPreferences();
  const [changingLanguage, setChangingLanguage] = useState(null);

  const handleLanguageChange = async (nextLanguage) => {
    if (nextLanguage === language || changingLanguage) return;

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
    <SettingsSection title={title || t('settings.preferencesSection')} colors={colors}>
      <View style={styles.subsection}>
        <Text style={[styles.subsectionTitle, { color: colors.text }]}>{t('settings.displayMode')}</Text>
        <View style={styles.optionRow}>
          <PreferenceOption
            active={mode === 'light'}
            icon={<Sun size={20} color={mode === 'light' ? '#fff' : colors.primary} />}
            label={t('settings.light')}
            onPress={() => setTheme('light')}
            colors={colors}
          />
          <PreferenceOption
            active={mode === 'dark'}
            icon={<Moon size={20} color={mode === 'dark' ? '#fff' : colors.primary} />}
            label={t('settings.dark')}
            onPress={() => setTheme('dark')}
            colors={colors}
          />
          <PreferenceOption
            active={mode === 'system'}
            icon={<Monitor size={20} color={mode === 'system' ? '#fff' : colors.primary} />}
            label={t('settings.system')}
            onPress={() => setTheme('system')}
            colors={colors}
          />
        </View>
      </View>
      <View style={[styles.preferenceDivider, { backgroundColor: colors.background }]} />
      <View style={styles.subsection}>
        <Text style={[styles.subsectionTitle, { color: colors.text }]}>{t('settings.languageLabel')}</Text>
        <Text style={[styles.languageNote, { color: colors.textSecondary }]}>{t('settings.languageNote')}</Text>
        <View style={styles.optionRow}>
          <PreferenceOption
            active={language === 'vi'}
            icon={<Languages size={20} color={language === 'vi' ? '#fff' : colors.primary} />}
            label={t('common.vietnamese')}
            onPress={() => handleLanguageChange('vi')}
            loading={changingLanguage === 'vi'}
            disabled={Boolean(changingLanguage)}
            colors={colors}
          />
          <PreferenceOption
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
    </SettingsSection>
  );
}

const styles = StyleSheet.create({
  subsection: { paddingHorizontal: 8, paddingBottom: 14 },
  subsectionTitle: { fontSize: 15, fontWeight: '800', marginLeft: 10, marginBottom: 8 },
  preferenceDivider: { height: 1, marginHorizontal: 18, marginBottom: 14 },
  optionRow: { flexDirection: 'row', paddingHorizontal: 10, justifyContent: 'space-between' },
  languageNote: { fontSize: 13, lineHeight: 18, paddingHorizontal: 10, marginBottom: 8 },
  option: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 58, paddingVertical: 10, marginHorizontal: 5, borderRadius: 14 },
  optionLabel: { fontSize: 12, fontWeight: '700', marginTop: 4 },
});
