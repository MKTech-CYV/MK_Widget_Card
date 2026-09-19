import { isSupabaseConfigured, supabase } from './supabaseClient';
import { getFriendlyErrorMessage } from '../utils/errorParser';

const MIME_EXTENSIONS = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/heic': 'heic',
  'image/heif': 'heif',
};

export const parseStoragePathFromPublicUrl = (publicUrl, bucketHint = '') => {
  const value = `${publicUrl || ''}`.trim();
  if (!value) return null;

  if (bucketHint && !/^https?:\/\//i.test(value) && value.includes('/')) {
    const path = value.replace(/^\/+/, '');
    return {
      bucket: bucketHint,
      path: path.startsWith(`${bucketHint}/`) ? path.slice(bucketHint.length + 1) : path,
    };
  }

  try {
    const url = new URL(value);
    const match = url.pathname.match(/^\/storage\/v1\/object\/(?:public|authenticated|sign)\/([^/]+)\/(.+)$/);
    if (!match) return null;
    return { bucket: decodeURIComponent(match[1]), path: decodeURIComponent(match[2]) };
  } catch {
    return null;
  }
};

export const deleteStorageFile = async ({ bucket, path }) => {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase is not configured.');
  }

  if (!bucket || !path) {
    throw new Error('Missing bucket or path.');
  }

  const { error } = await supabase.storage.from(bucket).remove([path]);
  if (error) throw error;
  return true;
};

export const deleteStorageFileFromUrl = async (publicUrl, bucketHint = '') => {
  const storageInfo = parseStoragePathFromPublicUrl(publicUrl, bucketHint);

  if (!storageInfo?.bucket || !storageInfo.path) {
    return false;
  }

  await deleteStorageFile(storageInfo);
  return true;
};

export const deleteStorageFileFromUrlIfChanged = async ({ previousUrl, nextUrl, bucket }) => {
  const previousStorage = parseStoragePathFromPublicUrl(previousUrl, bucket);
  const nextStorage = parseStoragePathFromPublicUrl(nextUrl, bucket);

  if (
    previousStorage?.bucket === bucket &&
    previousStorage.path &&
    previousStorage.path !== nextStorage?.path
  ) {
    await deleteStorageFile(previousStorage);
    return true;
  }

  return false;
};

const base64Alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const base64Lookup = base64Alphabet.split('').reduce((map, char, index) => {
  map[char] = index;
  return map;
}, {});

const decodeBase64 = (base64 = '') => {
  const clean = base64.replace(/[^A-Za-z0-9+/=]/g, '');
  const padding = clean.endsWith('==') ? 2 : clean.endsWith('=') ? 1 : 0;
  const bytes = new Uint8Array(Math.floor(clean.length * 3 / 4) - padding);
  let byteIndex = 0;

  for (let i = 0; i < clean.length; i += 4) {
    const a = base64Lookup[clean[i]] ?? 0;
    const b = base64Lookup[clean[i + 1]] ?? 0;
    const c = clean[i + 2] === '=' ? 0 : base64Lookup[clean[i + 2]] ?? 0;
    const d = clean[i + 3] === '=' ? 0 : base64Lookup[clean[i + 3]] ?? 0;

    if (byteIndex < bytes.length) bytes[byteIndex++] = (a << 2) | (b >> 4);
    if (byteIndex < bytes.length) bytes[byteIndex++] = ((b & 15) << 4) | (c >> 2);
    if (byteIndex < bytes.length) bytes[byteIndex++] = ((c & 3) << 6) | d;
  }

  return bytes.buffer;
};

const parseDataUri = (value = '') => {
  const match = value.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return null;

  return {
    contentType: match[1],
    base64: match[2],
  };
};

const getExtension = (contentType = 'image/jpeg', fileName = '') => {
  const fromName = fileName.includes('.') ? fileName.split('.').pop().toLowerCase().split(/[?#]/)[0] : '';
  const sanitized = fromName.replace(/[^a-z0-9]/g, '');
  return sanitized || MIME_EXTENSIONS[contentType] || 'jpg';
};

const getContentType = (asset, parsed) => {
  const contentType = asset?.mimeType || parsed?.contentType || 'image/jpeg';
  return contentType === 'image/jpg' ? 'image/jpeg' : contentType;
};

const getUploadBody = async ({ asset, dataUri }) => {
  const parsed = parseDataUri(dataUri || asset?.uri || '');
  const contentType = getContentType(asset, parsed);
  const fileName = asset?.fileName || asset?.uri || '';

  if (asset?.base64) {
    return {
      body: decodeBase64(asset.base64),
      contentType,
      extension: getExtension(contentType, fileName),
    };
  }

  if (parsed?.base64) {
    return {
      body: decodeBase64(parsed.base64),
      contentType,
      extension: getExtension(contentType, fileName),
    };
  }

  if (asset?.uri) {
    try {
      const response = await fetch(asset.uri);
      const arrayBuffer = await response.arrayBuffer();
      return {
        body: arrayBuffer,
        contentType,
        extension: getExtension(contentType, fileName),
      };
    } catch (error) {
      const friendly = getFriendlyErrorMessage(error);
      throw new Error(friendly || error.message || 'Không thể tải ảnh.');
    }
  }

  throw new Error('No image data to upload.');
};

export const uploadImageToBucket = async ({ bucket, userId, asset, dataUri, prefix = 'image' }) => {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase is not configured.');
  }

  if (!bucket || !userId) {
    throw new Error('Missing upload bucket or user id.');
  }

  const { body, contentType, extension } = await getUploadBody({ asset, dataUri });
  const safePrefix = `${prefix || 'image'}`.replace(/[^a-zA-Z0-9_-]/g, '-');
  const uniqueSuffix = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const path = `${userId}/${safePrefix}-${uniqueSuffix}.${extension}`;

  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, body, {
      cacheControl: '3600',
      contentType,
      upsert: false,
    });

  if (error) throw error;

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  if (!data?.publicUrl) {
    throw new Error('Unable to create public URL for uploaded image.');
  }

  return {
    path,
    publicUrl: data.publicUrl,
  };
};
