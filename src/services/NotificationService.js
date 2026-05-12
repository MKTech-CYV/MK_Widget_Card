export async function registerForPushNotificationsAsync() {
  return null;
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
