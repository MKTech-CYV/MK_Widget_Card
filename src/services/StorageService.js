import { NativeModules, Platform } from 'react-native';
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
    
    // Đồng bộ Widget ngay lập tức
    if (Platform.OS === 'ios' && WidgetUpdater) {
      WidgetUpdater.reloadAll();
    }
  },

  getUserData: async () => {
    const data = await DefaultPreference.get('userData');
    return data ? JSON.parse(data) : null;
  }
};
