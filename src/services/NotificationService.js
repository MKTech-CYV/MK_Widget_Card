import { isSupabaseConfigured, supabaseAnonKey, supabaseKey, supabasePublishableKey, supabaseUrl } from './supabaseClient';

export async function registerForPushNotificationsAsync() {
  return null;
}

const normalizeRemoteNotification = (item) => {
  const publishedAt = item.published_at || item.publishedAt || item.created_at || item.createdAt || Date.now();

  return {
    id: item.id || `${publishedAt}-${item.title || 'notification'}`,
    type: item.type || 'normal',
    title: item.title || '',
    shortBody: item.short_body || item.shortBody || item.body || '',
    body: item.short_body || item.shortBody || item.body || '',
    detailTitle: item.detail_title || item.detailTitle || item.title || '',
    detailBody: item.detail_body || item.detailBody || item.body || item.short_body || '',
    thumbnailUrl: item.thumbnail_url || item.thumbnailUrl || '',
    imageUrl: item.image_url || item.imageUrl || '',
    actionTitle: item.action_title || item.actionTitle || '',
    actionUrl: item.action_url || item.actionUrl || '',
    publishedAt,
    receivedAt: publishedAt,
    createdAt: item.created_at || item.createdAt || null,
    source: 'remote',
  };
};

const isVisibleNotification = (item, nowMs) => {
  if (item?.is_active === false || item?.isActive === false) return false;

  const startsAtValue = item.starts_at || item.startsAt;
  const endsAtValue = item.ends_at || item.endsAt;
  const startsAt = startsAtValue ? new Date(startsAtValue).getTime() : 0;
  const endsAt = endsAtValue ? new Date(endsAtValue).getTime() : null;

  if (Number.isFinite(startsAt) && startsAt > nowMs) return false;
  if (endsAt !== null && Number.isFinite(endsAt) && endsAt < nowMs) return false;

  return true;
};

const getJson = async (url, headers = {}) => {
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      ...headers,
    },
  });

  if (!response.ok) {
    throw new Error(`Unable to fetch notifications (${response.status})`);
  }

  return response.json();
};

export async function fetchPublicNotifications({ limit = 20, type = 'normal' } = {}) {
  if (!isSupabaseConfigured) return [];

  const nowMs = Date.now();
  const restKey = supabasePublishableKey || supabaseAnonKey || supabaseKey;
  const baseUrl = supabaseUrl.replace(/\/$/, '');
  const restParams = new URLSearchParams({
    select: '*',
    type: `eq.${type}`,
    is_active: 'eq.true',
    order: 'published_at.desc',
    limit: `${limit}`,
  });

  if (!restKey) {
    return [];
  }

  const headers = {
    apikey: restKey,
    Authorization: `Bearer ${restKey}`,
  };

  const data = await getJson(`${baseUrl}/rest/v1/notifications?${restParams.toString()}`, headers);

  const rows = Array.isArray(data) ? data : data?.data || data?.notifications || [];

  return rows
    .filter((item) => isVisibleNotification(item, nowMs))
    .sort((a, b) => {
      const bDate = b.published_at || b.publishedAt || b.created_at || b.createdAt || 0;
      const aDate = a.published_at || a.publishedAt || a.created_at || a.createdAt || 0;
      return new Date(bDate).getTime() - new Date(aDate).getTime();
    })
    .slice(0, limit)
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
