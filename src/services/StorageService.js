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
  }
};
