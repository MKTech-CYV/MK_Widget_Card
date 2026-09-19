import { collection, getDocs, query, where, orderBy, limit as fbLimit } from 'firebase/firestore';
import { db, isFirebaseConfigured } from './firebaseClient';

export async function registerForPushNotificationsAsync() {
  return null;
}

// Accepts a Firestore Timestamp, JS Date, ISO string, or epoch number —
// notification docs are authored by hand in the Firebase Console for now
// (no in-app authoring UI), so the field type isn't guaranteed consistent.
const toMillis = (value) => {
  if (!value) return null;
  if (typeof value?.toMillis === 'function') return value.toMillis();
  if (typeof value?.toDate === 'function') return value.toDate().getTime();
  const ms = new Date(value).getTime();
  return Number.isFinite(ms) ? ms : null;
};

const normalizeRemoteNotification = (item) => {
  // Screens render this as `new Date(publishedAt)` — must be a plain
  // number, not a raw Firestore Timestamp object (which produces
  // "Invalid Date" when passed straight to the Date constructor).
  const publishedAt = toMillis(item.published_at) || toMillis(item.created_at) || Date.now();

  return {
    id: item.id || `${publishedAt}-${item.title || 'notification'}`,
    type: item.type || 'normal',
    title: item.title || '',
    shortBody: item.short_body || '',
    body: item.short_body || '',
    detailTitle: item.detail_title || item.title || '',
    detailBody: item.detail_body || item.short_body || '',
    thumbnailUrl: item.thumbnail_url || '',
    imageUrl: item.image_url || '',
    actionTitle: item.action_title || '',
    actionUrl: item.action_url || '',
    publishedAt,
    receivedAt: publishedAt,
    createdAt: toMillis(item.created_at),
    source: 'remote',
  };
};

const isVisibleNotification = (item, nowMs) => {
  if (item?.is_active === false) return false;

  const startsAt = toMillis(item.starts_at);
  const endsAt = toMillis(item.ends_at);

  if (startsAt !== null && startsAt > nowMs) return false;
  if (endsAt !== null && endsAt < nowMs) return false;

  return true;
};

export async function fetchPublicNotifications({ limit = 20, type = 'normal' } = {}) {
  if (!isFirebaseConfigured) return [];

  const notificationsQuery = query(
    collection(db, 'notifications'),
    where('is_active', '==', true),
    where('type', '==', type),
    orderBy('published_at', 'desc'),
    fbLimit(limit)
  );

  const snap = await getDocs(notificationsQuery).catch(() => null);
  if (!snap) return [];

  const nowMs = Date.now();

  return snap.docs
    .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
    .filter((item) => isVisibleNotification(item, nowMs))
    .map(normalizeRemoteNotification);
}

export function normalizeNotificationForStorage(notification) {
  const content = notification?.request?.content || {};
  const data = content?.data || {};

  return {
    id: notification?.request?.identifier || `${Date.now()}`,
    title: content?.title || '',
    body: content?.body || '',
    data,
    receivedAt: Date.now(),
  };
}
