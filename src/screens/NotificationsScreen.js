import React, { useCallback, useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Bell, Trash2 } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, Spacing } from '../constants/Theme';
import Footer from '../components/Footer';
import { StorageService } from '../services/StorageService';
import { useAppPreferences } from '../context/AppPreferencesContext';
import { getTranslation } from '../constants/i18n';

const formatTime = (ts) => {
  try {
    const date = new Date(ts);
    return date.toLocaleString();
  } catch {
    return '';
  }
};

export default function NotificationsScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { language } = useAppPreferences();
  const t = useCallback((key) => getTranslation(language, key), [language]);

  const [items, setItems] = useState([]);

  const load = useCallback(async () => {
    const list = await StorageService.getNotifications();
    setItems(Array.isArray(list) ? list : []);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleClear = async () => {
    Alert.alert(
      t('notifications.clearTitle'),
      t('notifications.clearDesc'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('notifications.clearAction'), style: 'destructive', onPress: async () => {
          await StorageService.clearNotifications();
          await load();
        }},
      ]
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 60 }]}>
        <View style={styles.headerRow}>
          <Text style={[styles.screenTitle, { color: colors.text }]}>{t('notifications.title')}</Text>
          <TouchableOpacity
            style={[styles.clearButton, { backgroundColor: colors.card }]}
            onPress={handleClear}
            disabled={!items.length}
          >
            <Trash2 size={18} color={items.length ? colors.primary : colors.border} />
          </TouchableOpacity>
        </View>

        {!items.length ? (
          <View style={[styles.emptyCard, { backgroundColor: colors.card }]}>
            <Bell size={34} color={colors.textSecondary} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>{t('notifications.emptyTitle')}</Text>
            <Text style={[styles.emptyDesc, { color: colors.textSecondary }]}>{t('notifications.emptyDesc')}</Text>
          </View>
        ) : (
          <View style={styles.list}>
            {items.map((n) => (
              <View key={n.id} style={[styles.itemCard, { backgroundColor: colors.card }]}>
                <View style={[styles.itemIcon, { backgroundColor: `${colors.primary}14` }]}>
                  <Bell size={18} color={colors.primary} />
                </View>
                <View style={styles.itemBody}>
                  {!!n.title && <Text style={[styles.itemTitle, { color: colors.text }]}>{n.title}</Text>}
                  {!!n.body && <Text style={[styles.itemText, { color: colors.textSecondary }]}>{n.body}</Text>}
                  <Text style={[styles.itemMeta, { color: colors.textSecondary }]}>{formatTime(n.receivedAt)}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        <Footer />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: Spacing.lg },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.lg },
  screenTitle: { fontSize: 32, fontWeight: '800' },
  clearButton: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },

  emptyCard: { borderRadius: 24, padding: 22, alignItems: 'center' },
  emptyTitle: { marginTop: 12, fontSize: 16, fontWeight: '800' },
  emptyDesc: { marginTop: 6, fontSize: 13, lineHeight: 18, textAlign: 'center' },

  list: { gap: 10 },
  itemCard: { borderRadius: 20, padding: 14, flexDirection: 'row' },
  itemIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  itemBody: { flex: 1 },
  itemTitle: { fontSize: 15, fontWeight: '800' },
  itemText: { marginTop: 4, fontSize: 13, lineHeight: 18 },
  itemMeta: { marginTop: 8, fontSize: 11, fontWeight: '700' },
});

