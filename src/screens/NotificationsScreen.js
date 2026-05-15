import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Image, Linking, Modal, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Bell, ExternalLink, X } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, Spacing } from '../constants/Theme';
import Footer from '../components/Footer';
import { fetchPublicNotifications } from '../services/NotificationService';
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

export default function NotificationsScreen({ route }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { language } = useAppPreferences();
  const t = useCallback((key) => getTranslation(language, key), [language]);
  const notificationType = route?.params?.type === 'system' ? 'system' : 'normal';
  const isSystemType = notificationType === 'system';

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [remoteList, localList] = await Promise.all([
        fetchPublicNotifications({ limit: 40, type: notificationType }).catch(() => []),
        isSystemType ? Promise.resolve([]) : StorageService.getNotifications().catch(() => []),
      ]);
      const localItems = Array.isArray(localList)
        ? localList.map((item) => ({
          ...item,
          source: item.source || 'local',
          shortBody: item.shortBody || item.body || '',
          detailTitle: item.detailTitle || item.title || '',
          detailBody: item.detailBody || item.body || '',
          publishedAt: item.publishedAt || item.receivedAt,
        }))
        : [];
      const remoteItems = Array.isArray(remoteList) ? remoteList : [];
      const remoteIds = new Set(remoteItems.map((item) => item.id));
      const merged = [
        ...remoteItems,
        ...localItems.filter((item) => !remoteIds.has(item.id)),
      ].sort((a, b) => {
        const bDate = b.publishedAt || b.receivedAt || 0;
        const aDate = a.publishedAt || a.receivedAt || 0;
        return new Date(bDate).getTime() - new Date(aDate).getTime();
      });

      setItems(merged);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isSystemType, notificationType]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + (isSystemType ? 58 : 20) }]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            tintColor={colors.primary}
            onRefresh={() => {
              setRefreshing(true);
              load();
            }}
          />
        }
      >
        <View style={styles.headerRow}>
          <Text style={[styles.screenTitle, { color: colors.text }]}>
            {isSystemType ? t('notifications.systemTitle') : t('notifications.title')}
          </Text>
        </View>

        {loading ? (
          <View style={[styles.emptyCard, { backgroundColor: colors.card }]}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : !items.length ? (
          <View style={[styles.emptyCard, { backgroundColor: colors.card }]}>
            <Bell size={34} color={colors.textSecondary} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>{t('notifications.emptyTitle')}</Text>
            <Text style={[styles.emptyDesc, { color: colors.textSecondary }]}>{t('notifications.emptyDesc')}</Text>
          </View>
        ) : (
          <View style={styles.list}>
            {items.map((n) => (
              <TouchableOpacity
                key={n.id}
                style={[styles.itemCard, { backgroundColor: colors.card }]}
                activeOpacity={0.78}
                onPress={() => setSelectedNotification(n)}
              >
                {n.thumbnailUrl ? (
                  <Image source={{ uri: n.thumbnailUrl }} style={styles.thumbnail} />
                ) : (
                  <View style={[styles.itemIcon, { backgroundColor: `${colors.primary}14` }]}>
                    <Bell size={18} color={colors.primary} />
                  </View>
                )}
                <View style={styles.itemBody}>
                  {!!n.title && <Text style={[styles.itemTitle, { color: colors.text }]} numberOfLines={2}>{n.title}</Text>}
                  {!!n.shortBody && <Text style={[styles.itemText, { color: colors.textSecondary }]} numberOfLines={2}>{n.shortBody}</Text>}
                  <Text style={[styles.itemMeta, { color: colors.textSecondary }]}>{formatTime(n.publishedAt || n.receivedAt)}</Text>
                </View>
                {!!n.actionUrl && <ExternalLink size={16} color={colors.textSecondary} />}
              </TouchableOpacity>
            ))}
          </View>
        )}

        <Footer />
      </ScrollView>
      <NotificationDetailModal
        notification={selectedNotification}
        colors={colors}
        t={t}
        onClose={() => setSelectedNotification(null)}
      />
    </View>
  );
}

const NotificationDetailModal = ({ notification, colors, t, onClose }) => {
  if (!notification) return null;

  const title = notification.detailTitle || notification.title;
  const body = notification.detailBody || notification.shortBody || notification.body;

  const openAction = () => {
    if (!notification.actionUrl) return;
    Linking.openURL(notification.actionUrl).catch(() => {});
  };

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.detailSheet, { backgroundColor: colors.card }]}>
          <View style={styles.detailHeader}>
            <Text style={[styles.detailTitle, { color: colors.text }]} numberOfLines={2}>
              {title}
            </Text>
            <TouchableOpacity style={[styles.closeButton, { backgroundColor: colors.background }]} onPress={onClose}>
              <X color={colors.textSecondary} size={20} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.detailContent}>
            {!!notification.imageUrl && <Image source={{ uri: notification.imageUrl }} style={styles.detailImage} />}
            {!!body && <Text style={[styles.detailBody, { color: colors.textSecondary }]}>{body}</Text>}
            <Text style={[styles.detailMeta, { color: colors.textSecondary }]}>
              {formatTime(notification.publishedAt || notification.receivedAt)}
            </Text>
            {!!notification.actionUrl && (
              <TouchableOpacity style={[styles.actionButton, { backgroundColor: colors.primary }]} onPress={openAction}>
                <ExternalLink size={18} color="#fff" />
                <Text style={styles.actionButtonText}>
                  {notification.actionTitle || t('notifications.openAction')}
                </Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: Spacing.lg },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.lg },
  screenTitle: { fontSize: 32, fontWeight: '800' },

  emptyCard: { borderRadius: 24, padding: 22, alignItems: 'center' },
  emptyTitle: { marginTop: 12, fontSize: 16, fontWeight: '800' },
  emptyDesc: { marginTop: 6, fontSize: 13, lineHeight: 18, textAlign: 'center' },

  list: { gap: 10 },
  itemCard: { borderRadius: 20, padding: 14, flexDirection: 'row', alignItems: 'center' },
  itemIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  thumbnail: { width: 52, height: 52, borderRadius: 14, marginRight: 12, backgroundColor: 'rgba(142,142,147,0.12)' },
  itemBody: { flex: 1 },
  itemTitle: { fontSize: 15, fontWeight: '800' },
  itemText: { marginTop: 4, fontSize: 13, lineHeight: 18 },
  itemMeta: { marginTop: 8, fontSize: 11, fontWeight: '700' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.48)', justifyContent: 'flex-end' },
  detailSheet: { maxHeight: '86%', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20 },
  detailHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  detailTitle: { flex: 1, fontSize: 22, lineHeight: 28, fontWeight: '900' },
  closeButton: { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  detailContent: { paddingTop: 16, paddingBottom: 8 },
  detailImage: { width: '100%', aspectRatio: 16 / 9, borderRadius: 18, marginBottom: 16, backgroundColor: 'rgba(142,142,147,0.12)' },
  detailBody: { fontSize: 15, lineHeight: 22, fontWeight: '600' },
  detailMeta: { marginTop: 14, fontSize: 12, fontWeight: '800' },
  actionButton: { height: 52, borderRadius: 16, marginTop: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  actionButtonText: { color: '#fff', fontSize: 15, fontWeight: '900', marginLeft: 8 },
});
