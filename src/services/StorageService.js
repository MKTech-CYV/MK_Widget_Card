import { NativeModules } from 'react-native';
import DefaultPreference from 'react-native-default-preference';

const APP_GROUP = 'group.com.mk.ecard';
const { WidgetUpdater } = NativeModules;

export const StorageService = {
  init: () => {
    DefaultPreference.setName(APP_GROUP);
  },

  setUserData: async (data) => {
    const dataString = JSON.stringify(data);
    await DefaultPreference.set('userData', dataString);
    
    // Đồng bộ Widget ngay lập tức trên cả iOS và Android.
    try {
      WidgetUpdater?.reloadAll?.();
    } catch (error) {
      console.log('Widget reload failed', error);
    }
  },

  getUserData: async () => {
    const data = await DefaultPreference.get('userData');
    return data ? JSON.parse(data) : null;
  },

  setAppPreferences: async (data) => {
    await DefaultPreference.set('appPreferences', JSON.stringify(data));
  },

  getAppPreferences: async () => {
    const data = await DefaultPreference.get('appPreferences');
    return data ? JSON.parse(data) : null;
  },

  setPushToken: async (token) => {
    if (!token) return;
    await DefaultPreference.set('expoPushToken', `${token}`);
  },

  getPushToken: async () => {
    return await DefaultPreference.get('expoPushToken');
  },

  getNotifications: async () => {
    const data = await DefaultPreference.get('notifications');
    return data ? JSON.parse(data) : [];
  },

  setNotifications: async (notifications) => {
    await DefaultPreference.set('notifications', JSON.stringify(notifications || []));
  },

  addNotification: async (notification) => {
    const current = await StorageService.getNotifications();
    const next = [notification, ...current].slice(0, 200);
    await StorageService.setNotifications(next);
    return next;
  },

  clearNotifications: async () => {
    await StorageService.setNotifications([]);
  },
};
