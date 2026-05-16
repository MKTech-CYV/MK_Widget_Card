import React from 'react';
import { Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ChevronLeft } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, Spacing } from '../constants/Theme';
import AppRefreshControl from './AppRefreshControl';

const runBackAction = ({ navigation, onBack, backTarget, backUrl }) => {
  if (onBack) {
    onBack();
    return;
  }

  if (backUrl) {
    Linking.openURL(backUrl).catch(() => null);
    return;
  }

  if (backTarget) {
    if (typeof backTarget === 'string') {
      navigation?.navigate?.(backTarget);
      return;
    }

    navigation?.navigate?.(backTarget.name, backTarget.params);
    return;
  }

  if (navigation?.canGoBack?.()) {
    navigation.goBack();
  }
};

export default function ScreenScaffold({
  navigation,
  title,
  subtitle,
  children,
  footer,
  showBack = false,
  backIcon,
  onBack,
  backTarget,
  backUrl,
  headerRight,
  refreshing = false,
  onRefresh,
  scroll = true,
  contentContainerStyle,
  contentStyle,
  titleStyle,
  subtitleStyle,
  showsVerticalScrollIndicator = false,
  keyboardShouldPersistTaps,
  automaticallyAdjustKeyboardInsets,
  topOffset,
}) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const topPadding = topOffset ?? insets.top + (showBack ? 8 : 16);

  const header = (
    <>
      {(showBack || headerRight) && (
        <View style={styles.headerBar}>
          {showBack ? (
            <TouchableOpacity
              style={[styles.backButton, { backgroundColor: colors.card }]}
              onPress={() => runBackAction({ navigation, onBack, backTarget, backUrl })}
              accessibilityRole="button"
              accessibilityLabel="Back"
              activeOpacity={0.82}
            >
              {backIcon || <ChevronLeft color={colors.primary} size={24} />}
            </TouchableOpacity>
          ) : (
            <View style={styles.headerSpacer} />
          )}
          {headerRight}
        </View>
      )}
      {!!title && (
        <Text style={[styles.title, { color: colors.text }, titleStyle]}>{title}</Text>
      )}
      {!!subtitle && (
        <Text style={[styles.subtitle, { color: colors.textSecondary }, subtitleStyle]}>{subtitle}</Text>
      )}
    </>
  );

  const refreshControl = onRefresh ? (
    <AppRefreshControl
      refreshing={refreshing}
      tintColor={colors.primary}
      onRefresh={onRefresh}
      offset={showBack ? 74 : 56}
    />
  ) : undefined;

  if (!scroll) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, paddingTop: topPadding }, contentStyle]}>
        <View style={[styles.content, contentContainerStyle]}>
          {header}
          {children}
          {footer}
        </View>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }, contentStyle]}
      contentContainerStyle={[styles.content, { paddingTop: topPadding }, contentContainerStyle]}
      refreshControl={refreshControl}
      showsVerticalScrollIndicator={showsVerticalScrollIndicator}
      keyboardShouldPersistTaps={keyboardShouldPersistTaps}
      automaticallyAdjustKeyboardInsets={automaticallyAdjustKeyboardInsets}
    >
      {header}
      {children}
      {footer}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: Spacing.lg },
  headerBar: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  headerSpacer: { width: 44, height: 44 },
  backButton: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 32, lineHeight: 38, fontWeight: '900', marginBottom: Spacing.lg },
  subtitle: { marginTop: -Spacing.md, marginBottom: Spacing.lg, fontSize: 14, lineHeight: 20, fontWeight: '600' },
});
