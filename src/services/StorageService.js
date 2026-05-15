import { NativeModules } from 'react-native';
import DefaultPreference from 'react-native-default-preference';

const APP_GROUP = 'group.com.mk.ecard';
const { WidgetUpdater } = NativeModules;
const ACCOUNT_PRESET_SOURCE_KEY = 'accountPresetSource';
const ECARD_PRESET_SOURCE_KEY = 'ecardPresetId';
const BANK_PRESET_SOURCE_KEY = 'bankPresetId';
const ECARD_DATA_KEYS = [
  'fullName',
  'phone',
  'email',
  'title',
  'company',
  'department',
  'website',
  'address',
  'linkedin',
  'facebook',
  'zalo',
  'zaloCountryCode',
  'whatsapp',
  'whatsappCountryCode',
  'telegram',
  'bio',
  'avatar',
  'avatarUrl',
  'countryCode',
];
const BANK_DATA_KEYS = ['bankName', 'bankAccount', 'bankAccountHolderName'];
const DEFAULT_ONLY_VALUES = {
  bankName: 'MB',
  countryCode: '84',
  zaloCountryCode: '84',
  whatsappCountryCode: '84',
};

const compactSource = (source = {}) => (
  Object.entries(source).reduce((next, [key, value]) => {
    if (value) next[key] = value;
    return next;
  }, {})
);

const normalizePresetSource = (data = {}) => compactSource(data[ACCOUNT_PRESET_SOURCE_KEY] || {});

const hasMeaningfulData = (data = {}) => (
  Object.entries(data).some(([key, value]) => {
    if (key === ACCOUNT_PRESET_SOURCE_KEY) return false;
    if (value == null) return false;
    if (typeof value === 'string') {
      const text = value.trim();
      return text.length > 0 && DEFAULT_ONLY_VALUES[key] !== text;
    }
    return true;
  })
);

const removeKeys = (data = {}, keys = []) => {
  const next = { ...data };
  keys.forEach(key => {
    delete next[key];
  });
  return next;
};

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
    } catch {
      // Native widget reload can be unavailable in simulator or unsupported builds.
    }
  },

  getUserData: async () => {
    const data = await DefaultPreference.get('userData');
    return data ? JSON.parse(data) : null;
  },

  clearUserData: async () => {
    await DefaultPreference.clear('userData');

    try {
      WidgetUpdater?.reloadAll?.();
    } catch {
      // Native widget reload can be unavailable in simulator or unsupported builds.
    }
  },

  markAccountPresetSource: (data = {}, updates = {}) => {
    const source = compactSource({
      ...normalizePresetSource(data),
      ...updates,
    });

    if (!Object.keys(source).length) {
      const next = { ...data };
      delete next[ACCOUNT_PRESET_SOURCE_KEY];
      return next;
    }

    return {
      ...data,
      [ACCOUNT_PRESET_SOURCE_KEY]: source,
    };
  },

  clearAccountPresetSource: (data = {}, kind) => {
    const source = normalizePresetSource(data);

    if (kind === 'ecard') {
      delete source[ECARD_PRESET_SOURCE_KEY];
    }

    if (kind === 'bank') {
      delete source[BANK_PRESET_SOURCE_KEY];
    }

    const next = { ...data };
    if (Object.keys(source).length) {
      next[ACCOUNT_PRESET_SOURCE_KEY] = source;
    } else {
      delete next[ACCOUNT_PRESET_SOURCE_KEY];
    }

    return next;
  },

  clearAccountPresetSections: (data = {}, sections = {}) => {
    let next = { ...data };
    const source = normalizePresetSource(next);

    if (sections.ecard) {
      next = removeKeys(next, ECARD_DATA_KEYS);
      delete source[ECARD_PRESET_SOURCE_KEY];
    }

    if (sections.bank) {
      next = removeKeys(next, BANK_DATA_KEYS);
      delete source[BANK_PRESET_SOURCE_KEY];
    }

    if (Object.keys(source).length) {
      next[ACCOUNT_PRESET_SOURCE_KEY] = source;
    } else {
      delete next[ACCOUNT_PRESET_SOURCE_KEY];
    }

    return hasMeaningfulData(next) ? next : null;
  },

  getAccountPresetSource: (data = {}) => normalizePresetSource(data),

  setCachedProfile: async (userId, profile) => {
    if (!userId) return;
    await DefaultPreference.set(`profile:${userId}`, JSON.stringify(profile || null));
  },

  getCachedProfile: async (userId) => {
    if (!userId) return null;
    const data = await DefaultPreference.get(`profile:${userId}`);
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
