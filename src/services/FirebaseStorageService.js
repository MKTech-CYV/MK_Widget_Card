import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage, isFirebaseConfigured } from './firebaseClient';
import { getFriendlyErrorMessage } from '../utils/errorParser';

const MIME_EXTENSIONS = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/heic': 'heic',
  'image/heif': 'heif',
};

// `bucket` here is a logical path prefix (e.g. "avatars", "ecards") inside the
// single Firebase Storage bucket — not a separate GCS bucket like Supabase had.
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
    const match = url.pathname.match(/^\/v0\/b\/[^/]+\/o\/(.+)$/);
    if (!match) return null;

    const fullPath = decodeURIComponent(match[1]);
    const slashIndex = fullPath.indexOf('/');
    if (slashIndex === -1) return null;

    return {
      bucket: fullPath.slice(0, slashIndex),
      path: fullPath.slice(slashIndex + 1),
    };
  } catch {
    return null;
  }
};

export const deleteStorageFile = async ({ bucket, path }) => {
  if (!isFirebaseConfigured) {
    throw new Error('Firebase is not configured.');
  }

  if (!bucket || !path) {
    throw new Error('Missing bucket or path.');
  }

  await deleteObject(ref(storage, `${bucket}/${path}`));
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

const parseDataUri = (value = '') => {
  const match = value.match(/^data:([^;]+);base64,/);
  return match ? { contentType: match[1] } : null;
};

const getExtension = (contentType = 'image/jpeg', fileName = '') => {
  const fromName = fileName.includes('.') ? fileName.split('.').pop().toLowerCase().split(/[?#]/)[0] : '';
  const sanitized = fromName.replace(/[^a-z0-9]/g, '');
  return sanitized || MIME_EXTENSIONS[contentType] || 'jpg';
};

const normalizeContentType = (contentType) => (
  contentType === 'image/jpg' ? 'image/jpeg' : (contentType || 'image/jpeg')
);

// React Native's Blob can't be constructed from raw bytes ("Creating blobs
// from 'ArrayBuffer' and 'ArrayBufferView' are not supported" — RN's
// BlobManager.js) — which is what Firebase's uploadBytes()/uploadString()
// both do internally on every platform, RN included. The reliable RN
// workaround is to `fetch()` the source (a local file:// URI or a data: URI
// both work) and upload the Blob that `Response.blob()` returns — that one
// comes from RN's native blob registry instead of JS-side construction, so
// Firebase can read it fine.
const resolveUploadSource = ({ asset, dataUri }) => {
  if (dataUri) {
    const parsed = parseDataUri(dataUri);
    return {
      uri: dataUri,
      contentType: normalizeContentType(asset?.mimeType || parsed?.contentType),
      fileName: asset?.fileName || '',
    };
  }

  if (asset?.uri) {
    const parsed = parseDataUri(asset.uri);
    return {
      uri: asset.uri,
      contentType: normalizeContentType(asset?.mimeType || parsed?.contentType),
      fileName: asset?.fileName || asset.uri,
    };
  }

  if (asset?.base64) {
    const contentType = normalizeContentType(asset?.mimeType);
    return {
      uri: `data:${contentType};base64,${asset.base64}`,
      contentType,
      fileName: asset?.fileName || '',
    };
  }

  throw new Error('No image data to upload.');
};

export const uploadImageToBucket = async ({ bucket, userId, asset, dataUri, prefix = 'image' }) => {
  if (!isFirebaseConfigured) {
    throw new Error('Firebase is not configured.');
  }

  if (!bucket || !userId) {
    throw new Error('Missing upload bucket or user id.');
  }

  const { uri, contentType, fileName } = resolveUploadSource({ asset, dataUri });

  let blob;
  try {
    const response = await fetch(uri);
    blob = await response.blob();
  } catch (error) {
    const friendly = getFriendlyErrorMessage(error);
    throw new Error(friendly || error.message || 'Không thể tải ảnh.');
  }

  const safePrefix = `${prefix || 'image'}`.replace(/[^a-zA-Z0-9_-]/g, '-');
  const uniqueSuffix = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const path = `${userId}/${safePrefix}-${uniqueSuffix}.${getExtension(contentType, fileName)}`;
  const fileRef = ref(storage, `${bucket}/${path}`);

  await uploadBytes(fileRef, blob, { contentType, cacheControl: '3600' });
  const publicUrl = await getDownloadURL(fileRef);

  return { path, publicUrl };
};
