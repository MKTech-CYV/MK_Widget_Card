import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Heart } from 'lucide-react-native';
import { useTheme, Spacing } from '../constants/Theme';

const Footer = () => {
  const { colors } = useTheme();
  return (
    <View style={styles.container}>
      <Text style={[styles.footerText, { color: colors.textSecondary }]}>
        © 2026 MKTech - Code Your Vision. Developed with
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
