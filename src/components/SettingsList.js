import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { useTheme, Spacing } from '../constants/Theme';

export const SettingsSection = ({ title, children, colors, style }) => {
  const theme = useTheme();
  const resolvedColors = colors || theme.colors;

  return (
    <View style={[styles.section, { backgroundColor: resolvedColors.card }, style]}>
      {!!title && (
        <Text style={[styles.sectionHeader, { color: resolvedColors.textSecondary }]}>{title}</Text>
      )}
      {children}
    </View>
  );
};

export const SettingsItem = ({
  icon,
  label,
  subtitle,
  right,
  onPress,
  colors,
  compact = false,
  showChevron = true,
  style,
}) => {
  const theme = useTheme();
  const resolvedColors = colors || theme.colors;

  return (
    <TouchableOpacity
      style={[
        styles.settingItem,
        compact && styles.settingItemCompact,
        { borderBottomColor: resolvedColors.background },
        style,
      ]}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={onPress ? 0.82 : 1}
    >
      <View style={styles.settingLeft}>
        {!!icon && (
          <View style={[styles.iconBox, { backgroundColor: resolvedColors.background }]}>{icon}</View>
        )}
        <View style={styles.settingTextBlock}>
          <Text style={[styles.settingLabel, { color: resolvedColors.text }]} numberOfLines={1}>{label}</Text>
          {!!subtitle && (
            <Text style={[styles.settingSubtitle, { color: resolvedColors.textSecondary }]} numberOfLines={2}>
              {subtitle}
            </Text>
          )}
        </View>
      </View>
      <View style={styles.settingRight}>
        {right}
        {onPress && showChevron && <ChevronRight color={resolvedColors.border} size={20} />}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  section: { borderRadius: 24, marginBottom: Spacing.lg, overflow: 'hidden' },
  sectionHeader: { fontSize: 12, fontWeight: '800', marginLeft: 18, marginBottom: 8, marginTop: 16, textTransform: 'uppercase' },
  settingItem: { minHeight: 68, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingVertical: 12, borderBottomWidth: 0.5 },
  settingItemCompact: { minHeight: 58 },
  settingLeft: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center' },
  settingRight: { flexDirection: 'row', alignItems: 'center', flexShrink: 1 },
  iconBox: { width: 38, height: 38, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  settingTextBlock: { flex: 1, minWidth: 0, minHeight: 38, justifyContent: 'center' },
  settingLabel: { fontSize: 16, fontWeight: '700', lineHeight: 21 },
  settingSubtitle: { marginTop: 2, fontSize: 12, lineHeight: 17, fontWeight: '600' },
});
