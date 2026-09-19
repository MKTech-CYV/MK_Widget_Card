import { auth, isFirebaseConfigured } from './firebaseClient';
import { authorizedFetch } from './ApiClient';

// Short share links (https://mktechvn.com/c/{code}) point at a live eCard
// preset, so edits apply to links that were already sent. Returns null for
// guests or on any failure so callers fall back to the long query-string
// link (buildECardShareUrl), which keeps working without an account.

export const getShortEcardUrl = async (presetId, language = 'vi') => {
  if (!isFirebaseConfigured || !auth.currentUser || !presetId) return null;

  try {
    const response = await authorizedFetch('/api/share', {
      method: 'POST',
      body: { preset_id: presetId },
    });
    if (!response.ok) return null;

    const data = await response.json();
    if (typeof data?.url !== 'string') return null;

    return language === 'en' ? `${data.url}?lang=en` : data.url;
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
