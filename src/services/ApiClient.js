import { auth } from './firebaseClient';

// The website (Vercel) is the trusted backend for things Firestore rules
// can't do safely from the client: recording the real client IP, resolving
// short share links. Calls carry the signed-in user's Firebase ID token.
export const API_BASE_URL = 'https://mktechvn.com';

export const authorizedFetch = async (path, { method = 'GET', body, timeoutMs = 8000 } = {}) => {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('Not signed in.');
  }

  const token = await user.getIdToken();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
};
