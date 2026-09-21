import { Alert, Linking, Platform } from 'react-native';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { doc, getDoc } from 'firebase/firestore';
import { db, isFirebaseConfigured } from './firebaseClient';

// Tells users on an older store build that a newer version exists and sends
// them to the App Store / Google Play. The latest version lives in Firestore
// (app_config/app_version, public read, admin write), so it can be changed
// without shipping anything. Fields (per platform, ios_* / android_*):
//   latest  newest version published on that store, e.g. "3.2.0"
//   min     optional; installs below this are asked to update (no "later")
//   url     optional store URL override
// plus optional message_vi / message_en.

const APP_STORE_ID = '6768935113';
const ANDROID_PACKAGE = 'com.mktech.widgetcard';

const STORE_LINKS = {
  ios: {
    app: `itms-apps://apps.apple.com/app/id${APP_STORE_ID}`,
    web: `https://apps.apple.com/app/id${APP_STORE_ID}`,
  },
  android: {
    app: `market://details?id=${ANDROID_PACKAGE}`,
    web: `https://play.google.com/store/apps/details?id=${ANDROID_PACKAGE}`,
  },
};

const PROMPT_KEY = 'appUpdatePrompt';
const PROMPT_INTERVAL_MS = 24 * 60 * 60 * 1000;
const FETCH_TIMEOUT_MS = 6000;

const parseVersion = (value) => `${value || ''}`.split('.').map((part) => parseInt(part, 10) || 0);

export const compareVersions = (a, b) => {
  const left = parseVersion(a);
  const right = parseVersion(b);
  for (let index = 0; index < Math.max(left.length, right.length); index += 1) {
    const diff = (left[index] || 0) - (right[index] || 0);
    if (diff !== 0) return diff > 0 ? 1 : -1;
  }
  return 0;
};

// Version of the installed store binary (an OTA update does not change it).
export const getInstalledVersion = () => (
  Constants.nativeAppVersion || Constants.expoConfig?.version || null
);

const platformKey = Platform.OS === 'ios' ? 'ios' : Platform.OS === 'android' ? 'android' : null;

const withTimeout = (promise, ms) => Promise.race([
  promise,
  new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms)),
]);

export const fetchUpdateInfo = async () => {
  if (!isFirebaseConfigured || !platformKey) return null;

  const installed = getInstalledVersion();
  if (!installed) return null;

  try {
    const snap = await withTimeout(getDoc(doc(db, 'app_config', 'app_version')), FETCH_TIMEOUT_MS);
    if (!snap.exists()) return null;

    const data = snap.data();
    const latest = `${data[`${platformKey}_latest`] || ''}`.trim();
    const min = `${data[`${platformKey}_min`] || ''}`.trim();
    if (!latest) return null;

    const needsUpdate = compareVersions(installed, latest) < 0;
    if (!needsUpdate) return null;

    return {
      installed,
      latest,
      forced: Boolean(min) && compareVersions(installed, min) < 0,
      url: `${data[`${platformKey}_url`] || ''}`.trim() || null,
      messages: { vi: data.message_vi || '', en: data.message_en || '' },
    };
  } catch {
    return null;
  }
};

export const openStore = async (overrideUrl) => {
  const links = STORE_LINKS[platformKey];
  if (!links) return;

  const targets = overrideUrl ? [overrideUrl] : [links.app, links.web];
  for (const url of targets) {
    try {
      await Linking.openURL(url);
      return;
    } catch {
      // Try the next target.
    }
  }
};

const shouldPrompt = async (info) => {
  if (info.forced) return true;

  try {
    const stored = JSON.parse((await AsyncStorage.getItem(PROMPT_KEY)) || 'null');
    if (stored && stored.version === info.latest && Date.now() - stored.at < PROMPT_INTERVAL_MS) {
      return false;
    }
  } catch {
    // Treat unreadable state as "not prompted yet".
  }
  return true;
};

// Shows the update dialog if the installed build is behind. Non-forced prompts
// appear at most once per day for a given latest version.
export const promptForUpdateIfNeeded = async ({ t, language }) => {
  const info = await fetchUpdateInfo();
  if (!info || !(await shouldPrompt(info))) return false;

  if (!info.forced) {
    await AsyncStorage.setItem(PROMPT_KEY, JSON.stringify({ version: info.latest, at: Date.now() })).catch(() => null);
  }

  const store = t(platformKey === 'ios' ? 'update.storeIos' : 'update.storeAndroid');
  const custom = info.messages[language] || '';
  const message = custom || t(info.forced ? 'update.messageForced' : 'update.message')
    .replace('{latest}', info.latest)
    .replace('{store}', store);

  const update = { text: t('update.now'), onPress: () => openStore(info.url) };
  Alert.alert(
    t('update.title'),
    message,
    info.forced ? [update] : [{ text: t('update.later'), style: 'cancel' }, update],
    { cancelable: !info.forced },
  );
  return true;
};
