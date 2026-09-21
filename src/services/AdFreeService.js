import { doc, getDoc } from 'firebase/firestore';
import { db, isFirebaseConfigured } from './firebaseClient';

// An account is ad-free when ad_free_users/{uid} exists (an admin creates or
// removes it; clients can only read their own). Returns null when it could not
// be determined (offline), so callers keep the last known value.
export const fetchAdFreeStatus = async (userId) => {
  if (!isFirebaseConfigured || !userId) return null;

  try {
    const snap = await getDoc(doc(db, 'ad_free_users', userId));
    return snap.exists() && snap.data()?.enabled !== false;
  } catch {
    return null;
  }
};
