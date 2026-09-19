import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Updates from 'expo-updates';
import * as Crypto from 'expo-crypto';
import { auth, isFirebaseConfigured } from './firebaseClient';
import { authorizedFetch } from './ApiClient';
import { StorageService } from './StorageService';

// Registers the signed-in user's device with the website backend, which
// stores it (plus the request IP/location, read server-side) in Firestore
// for the admin console. Everything here is best-effort and silent: it must
// never block or fail a sign-in. Guests (no account) are never tracked.

const SEEN_INTERVAL_MS = 6 * 60 * 60 * 1000;
const EXPLICIT_SIGN_IN_GRACE_MS = 15 * 1000;

let explicitSignInAt = 0;

// AuthContext calls this right before an explicit sign-in so the
// onAuthStateChanged that follows doesn't also send a redundant "seen".
export const noteExplicitSignIn = () => {
  explicitSignInAt = Date.now();
};

const getInstallId = async () => {
  StorageService.init();
  const existing = await StorageService.getInstallId();
  if (existing) return existing;

  const installId = Crypto.randomUUID();
  await StorageService.setInstallId(installId);
  return installId;
};

const buildDeviceInfo = () => {
  let language = null;
  let timezone = null;
  try {
    const resolved = Intl.DateTimeFormat().resolvedOptions();
    language = resolved.locale || null;
    timezone = resolved.timeZone || null;
  } catch {
    // Intl unavailable: leave both null.
  }

  return {
    platform: Platform.OS,
    device_model: Device.modelName || null,
    device_brand: Device.brand || null,
    os_name: Device.osName || Platform.OS,
    os_version: Device.osVersion || `${Platform.Version}`,
    app_runtime_version: Updates.runtimeVersion || (__DEV__ ? 'dev' : null),
    update_id: Updates.updateId || null,
    language,
    timezone,
  };
};

// event: 'login' after an explicit sign-in, 'seen' when a saved session is
// restored on app start.
export const reportDeviceSession = async (event) => {
  if (!isFirebaseConfigured || !auth.currentUser) return;

  try {
    StorageService.init();

    if (event === 'seen') {
      if (Date.now() - explicitSignInAt < EXPLICIT_SIGN_IN_GRACE_MS) return;

      const lastReportedAt = Number(await StorageService.getDeviceReportedAt()) || 0;
      if (Date.now() - lastReportedAt < SEEN_INTERVAL_MS) return;
    }

    const installId = await getInstallId();
    const response = await authorizedFetch('/api/device/checkin', {
      method: 'POST',
      body: { event, install_id: installId, ...buildDeviceInfo() },
    });

    if (response.ok) {
      await StorageService.setDeviceReportedAt(Date.now());
    }
  } catch {
    // Offline or backend unreachable: try again on the next launch/sign-in.
  }
};

// Removes this account's device registry, login history and short links on
// the server. Called before the Auth user is deleted (needs a valid token).
export const purgeServerAccountData = async () => {
  if (!isFirebaseConfigured || !auth.currentUser) return;

  try {
    await authorizedFetch('/api/device/account', { method: 'DELETE' });
  } catch {
    // Non-fatal: login history also expires on its own (TTL).
  }
};
