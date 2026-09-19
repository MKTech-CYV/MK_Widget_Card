import { auth, isFirebaseConfigured } from './firebaseClient';
import { API_BASE_URL, authorizedFetch } from './ApiClient';

// Short share links (https://mktechvn.com/c/{code}) point at a live eCard
// preset, so edits apply to links that were already sent. Returns null for
// guests or on any failure so callers fall back to the long query-string
// link (buildECardShareUrl), which keeps working without an account.

// presetId -> share code. Codes never change for a preset, so once known (from
// the preset document or an earlier API call) sharing is instant and needs no
// network round trip.
const SHARE_CODE_PATTERN = /^[A-Za-z0-9]{8}$/;
const codeCache = new Map();

export const rememberShareCode = (presetId, code) => {
  if (presetId && typeof code === 'string' && SHARE_CODE_PATTERN.test(code)) {
    codeCache.set(presetId, code);
  }
};

export const forgetShareCode = (presetId) => {
  codeCache.delete(presetId);
};

const buildShortUrl = (code, language) => (
  `${API_BASE_URL}/c/${code}${language === 'en' ? '?lang=en' : ''}`
);

export const getShortEcardUrl = async (presetId, language = 'vi') => {
  if (!isFirebaseConfigured || !auth.currentUser || !presetId) return null;

  const cached = codeCache.get(presetId);
  if (cached) return buildShortUrl(cached, language);

  try {
    const response = await authorizedFetch('/api/share', {
      method: 'POST',
      body: { preset_id: presetId },
    });
    if (!response.ok) return null;

    const data = await response.json();
    if (typeof data?.code !== 'string' || !SHARE_CODE_PATTERN.test(data.code)) return null;

    rememberShareCode(presetId, data.code);
    return buildShortUrl(data.code, language);
  } catch {
    return null;
  }
};

// Best effort: an orphaned link already resolves to "not found" once its
// preset is gone, this just tidies the share_links document.
export const revokeShortEcardLink = async (code) => {
  if (!isFirebaseConfigured || !auth.currentUser || !code) return;

  try {
    await authorizedFetch(`/api/share/${encodeURIComponent(code)}`, { method: 'DELETE' });
  } catch {
    // Ignore.
  }
};
