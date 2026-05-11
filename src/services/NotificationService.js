import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { StorageService } from './StorageService';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

const getProjectId = () => (
  Constants?.expoConfig?.extra?.eas?.projectId
  || Constants?.easConfig?.projectId
  || Constants?.expoConfig?.extra?.projectId
);

export async function registerForPushNotificationsAsync() {
  if (!Device.isDevice) {
    return null;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    return null;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#1a8eff',
    });
  }

  const projectId = getProjectId();
  const tokenResponse = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined);
  const token = tokenResponse?.data;
  await StorageService.setPushToken(token);
  return token;
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

