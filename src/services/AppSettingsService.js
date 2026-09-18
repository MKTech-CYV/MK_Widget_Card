import { StorageService } from './StorageService';

// No `app_settings` Firestore collection yet — the premium/payment feature
// this gated isn't live, so this stays a local-only stub returning the
// default until that feature actually ships (see migration plan).
export const DEFAULT_REMOTE_SETTINGS = {
  paymentEnabled: false,
  updatedAt: null,
};

export const getCachedRemoteSettings = async () => {
  StorageService.init();
  return await StorageService.getCachedRemoteSettings().catch(() => null);
};

export const fetchRemoteAppSettings = async () => {
  StorageService.init();
  return (await getCachedRemoteSettings()) || DEFAULT_REMOTE_SETTINGS;
};
