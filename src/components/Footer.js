import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Heart } from 'lucide-react-native';
import { useTheme, Spacing } from '../constants/Theme';
import { useAppPreferences } from '../context/AppPreferencesContext';
import { getTranslation } from '../constants/i18n';

const Footer = () => {
  const { colors } = useTheme();
  const { language } = useAppPreferences();
  const t = (key) => getTranslation(language, key);
  return (
    <View style={styles.container}>
      <Text style={[styles.footerText, { color: colors.textSecondary }]}>
        {t('footer.copyright')}
      </Text>
      <Heart color="#FF3B30" size={12} fill="#FF3B30" style={styles.heartIcon} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing.xl,
    marginBottom: 40,
  },
  footerText: {
    fontSize: 11,
  },
  heartIcon: {
    marginLeft: 4,
  }
});

export default Footer;
