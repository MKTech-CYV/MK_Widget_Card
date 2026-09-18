import { StorageService } from './StorageService';

const BANK_LIST_URL = 'https://api.vietqr.io/v2/banks';

const BASE64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

const encodeBase64 = (arrayBuffer) => {
  const bytes = new Uint8Array(arrayBuffer);
  let result = '';

  for (let i = 0; i < bytes.length; i += 3) {
    const b1 = bytes[i];
    const b2 = i + 1 < bytes.length ? bytes[i + 1] : undefined;
    const b3 = i + 2 < bytes.length ? bytes[i + 2] : undefined;

    result += BASE64_CHARS[b1 >> 2];
    result += BASE64_CHARS[((b1 & 3) << 4) | ((b2 ?? 0) >> 4)];
    result += b2 === undefined ? '=' : BASE64_CHARS[((b2 & 15) << 2) | ((b3 ?? 0) >> 6)];
    result += b3 === undefined ? '=' : BASE64_CHARS[b3 & 63];
  }

  return result;
};

// Cache-first with network revalidation: the bank list barely ever changes,
// so show whatever is cached immediately and only replace it once a fresh
// copy is confirmed. Falls back to the (possibly stale) cache when offline
// instead of clearing the picker to empty.
export const fetchBankList = async () => {
  StorageService.init();
  const cached = await StorageService.getCachedBankList().catch(() => null);

  try {
    const response = await fetch(BANK_LIST_URL);
    const result = await response.json();

    if (result?.code === '00' && Array.isArray(result.data) && result.data.length) {
      await StorageService.setCachedBankList(result.data).catch(() => null);
      return { banks: result.data, fromCache: false };
    }

    throw new Error('Invalid VietQR bank list response');
  } catch {
    return { banks: cached?.banks || [], fromCache: true };
  }
};

export const buildBankQrCacheKey = ({ bankCode, accountNumber, accountHolderName }) => (
  `${bankCode || ''}|${accountNumber || ''}|${accountHolderName || ''}`
);

export const getCachedBankQrImage = async (cacheKey) => {
  StorageService.init();
  return StorageService.getCachedBankQrImage(cacheKey).catch(() => null);
};

// Fire-and-forget: downloads the QR that just rendered successfully over the
// network and stores it as a base64 data URI, so the next time this exact
// bank/account/holder combo needs to render (e.g. offline), we have a local
// fallback instead of a broken image.
export const cacheBankQrImage = async (cacheKey, url) => {
  if (!cacheKey || !url) return null;

  try {
    const response = await fetch(url);
    if (!response.ok) return null;

    const contentType = response.headers.get('content-type') || 'image/png';
    const arrayBuffer = await response.arrayBuffer();
    const dataUri = `data:${contentType};base64,${encodeBase64(arrayBuffer)}`;

    StorageService.init();
    await StorageService.setCachedBankQrImage(cacheKey, dataUri).catch(() => null);
    return dataUri;
  } catch {
    return null;
  }
};
