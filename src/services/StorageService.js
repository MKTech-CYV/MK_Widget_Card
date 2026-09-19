import { NativeModules } from 'react-native';
import DefaultPreference from 'react-native-default-preference';

const APP_GROUP = 'group.com.mk.ecard';
const { WidgetUpdater } = NativeModules;
const BANK_QR_IMAGE_CACHE_KEYS = 'bankQrImageKeys';
const BANK_QR_IMAGE_CACHE_LIMIT = 15;
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
  'about',
  'avatar',
  'avatarUrl',
  'logoUrl',
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
    
    // Đồng bộ Widget ngay lập tức sau khi dữ liệu thay đổi.
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

  clearCachedProfile: async (userId) => {
    if (!userId) return;
    await DefaultPreference.clear(`profile:${userId}`);
  },

  setCachedRemoteSettings: async (settings) => {
    await DefaultPreference.set('remoteSettings', JSON.stringify(settings || {}));
  },

  getCachedRemoteSettings: async () => {
    const data = await DefaultPreference.get('remoteSettings');
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

  // Random per-install id used to tell a user's devices apart in the admin
  // device registry. Reset on reinstall (there is no stable hardware id).
  getInstallId: async () => {
    return await DefaultPreference.get('installId');
  },

  setInstallId: async (installId) => {
    if (!installId) return;
    await DefaultPreference.set('installId', `${installId}`);
  },

  getDeviceReportedAt: async () => {
    return await DefaultPreference.get('deviceReportedAt');
  },

  setDeviceReportedAt: async (timestamp) => {
    await DefaultPreference.set('deviceReportedAt', `${timestamp}`);
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

  setCachedBankList: async (banks) => {
    await DefaultPreference.set('vietqrBankList', JSON.stringify({ banks: banks || [], cachedAt: Date.now() }));
  },

  getCachedBankList: async () => {
    const data = await DefaultPreference.get('vietqrBankList');
    return data ? JSON.parse(data) : null;
  },

  // A small base64 snapshot of the last VietQR payment QR that loaded
  // successfully, keyed by bank+account+holder so it stays correct if any
  // of those change. Used so the QR still renders while offline/slow.
  // Capped + indexed so switching/deleting bank presets over time doesn't
  // leave an ever-growing pile of orphaned images in shared App Group
  // storage (every distinct bank+account+holder combo ever typed used to
  // leave a permanent entry with no eviction).
  setCachedBankQrImage: async (key, dataUri) => {
    if (!key || !dataUri) return;

    const raw = await DefaultPreference.get(BANK_QR_IMAGE_CACHE_KEYS);
    const keys = raw ? JSON.parse(raw) : [];
    const nextKeys = [key, ...keys.filter((existing) => existing !== key)];

    const evicted = nextKeys.slice(BANK_QR_IMAGE_CACHE_LIMIT);
    const kept = nextKeys.slice(0, BANK_QR_IMAGE_CACHE_LIMIT);

    if (evicted.length) {
      await DefaultPreference.clearMultiple(evicted.map((evictedKey) => `bankQrImage:${evictedKey}`)).catch(() => null);
    }
    await DefaultPreference.set(BANK_QR_IMAGE_CACHE_KEYS, JSON.stringify(kept));
    await DefaultPreference.set(`bankQrImage:${key}`, dataUri);
  },

  getCachedBankQrImage: async (key) => {
    if (!key) return null;
    return DefaultPreference.get(`bankQrImage:${key}`);
  },

  removeCachedBankQrImage: async (key) => {
    if (!key) return;

    const raw = await DefaultPreference.get(BANK_QR_IMAGE_CACHE_KEYS);
    const keys = raw ? JSON.parse(raw) : [];
    const nextKeys = keys.filter((existing) => existing !== key);

    await DefaultPreference.set(BANK_QR_IMAGE_CACHE_KEYS, JSON.stringify(nextKeys));
    await DefaultPreference.clear(`bankQrImage:${key}`).catch(() => null);
  },
};
