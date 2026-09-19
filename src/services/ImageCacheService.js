import * as FileSystem from 'expo-file-system/legacy';
import * as Crypto from 'expo-crypto';

// Keeps a copy of remote avatars, eCard logos and notification images on disk so
// they show instantly and work offline. Files are keyed by URL: replacing an
// image uploads a new URL, so a changed image is fetched fresh automatically.
// Only the most recent MAX_FILES are kept.

const CACHE_DIR = `${FileSystem.documentDirectory || ''}image-cache/`;
const MAX_FILES = 40;

const memory = new Map();
const inflight = new Map();
let dirReady = null;

export const isRemoteImage = (uri) => typeof uri === 'string' && /^https?:\/\//i.test(uri);

const ensureDir = () => {
  if (!dirReady) {
    dirReady = FileSystem.makeDirectoryAsync(CACHE_DIR, { intermediates: true }).catch(() => null);
  }
  return dirReady;
};

const extensionOf = (url) => {
  const match = url.split('?')[0].match(/\.(png|jpe?g|webp|gif|heic|heif)$/i);
  return match ? match[1].toLowerCase() : 'jpg';
};

const pathFor = async (url) => {
  const hash = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, url);
  return `${CACHE_DIR}${hash}.${extensionOf(url)}`;
};

const prune = async () => {
  try {
    const names = await FileSystem.readDirectoryAsync(CACHE_DIR);
    if (names.length <= MAX_FILES) return;

    const files = await Promise.all(names.map(async (name) => {
      const info = await FileSystem.getInfoAsync(`${CACHE_DIR}${name}`);
      return { name, time: info.modificationTime || 0 };
    }));
    files.sort((a, b) => a.time - b.time);

    await Promise.all(
      files.slice(0, files.length - MAX_FILES).map(async ({ name }) => {
        await FileSystem.deleteAsync(`${CACHE_DIR}${name}`, { idempotent: true });
        for (const [url, path] of memory) {
          if (path.endsWith(name)) memory.delete(url);
        }
      }),
    );
  } catch {
    // The cache is best effort.
  }
};

export const peekCachedImageUri = (url) => memory.get(url) || null;

export const getCachedImageUri = async (url) => {
  if (!isRemoteImage(url)) return null;
  if (memory.has(url)) return memory.get(url);

  try {
    const path = await pathFor(url);
    const info = await FileSystem.getInfoAsync(path);
    if (info.exists && info.size > 0) {
      memory.set(url, path);
      return path;
    }
  } catch {
    // Fall through: not cached.
  }
  return null;
};

export const cacheImage = (url) => {
  if (!isRemoteImage(url)) return Promise.resolve(null);
  if (inflight.has(url)) return inflight.get(url);

  const job = (async () => {
    try {
      await ensureDir();
      const path = await pathFor(url);
      const info = await FileSystem.getInfoAsync(path);

      if (!(info.exists && info.size > 0)) {
        const temp = `${path}.tmp`;
        const result = await FileSystem.downloadAsync(url, temp);
        if (result.status !== 200) {
          await FileSystem.deleteAsync(temp, { idempotent: true });
          return null;
        }
        await FileSystem.moveAsync({ from: temp, to: path });
        prune();
      }

      memory.set(url, path);
      return path;
    } catch {
      return null;
    } finally {
      inflight.delete(url);
    }
  })();

  inflight.set(url, job);
  return job;
};

// After uploading a picked image we already hold the file: store it under the
// new URL so the image is available offline straight away.
export const seedImageCache = async (url, localUri) => {
  if (!isRemoteImage(url) || !localUri || !/^file:\/\//i.test(localUri)) return;

  try {
    await ensureDir();
    const path = await pathFor(url);
    await FileSystem.copyAsync({ from: localUri, to: path });
    memory.set(url, path);
    prune();
  } catch {
    // Best effort.
  }
};
