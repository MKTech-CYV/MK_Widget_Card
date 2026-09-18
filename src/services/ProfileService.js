import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db, isFirebaseConfigured } from './firebaseClient';
import { deleteStorageFile, parseStoragePathFromPublicUrl } from './FirebaseStorageService';

export const fetchProfile = async (userId) => {
  if (!isFirebaseConfigured || !userId) return null;

  const snap = await getDoc(doc(db, 'profiles', userId));
  if (!snap.exists()) return null;

  return { id: snap.id, ...snap.data() };
};

export const updateProfileAvatar = async (userId, avatarUrl) => {
  if (!isFirebaseConfigured || !userId) return null;

  const previousProfile = await fetchProfile(userId).catch(() => null);

  await setDoc(doc(db, 'profiles', userId), { avatar_url: avatarUrl }, { merge: true });
  const data = await fetchProfile(userId);

  const previousPath = parseStoragePathFromPublicUrl(previousProfile?.avatar_url, 'avatars');
  const nextPath = parseStoragePathFromPublicUrl(avatarUrl, 'avatars');
  if (previousPath?.bucket === 'avatars' && previousPath.path && previousPath.path !== nextPath?.path) {
    await deleteStorageFile(previousPath).catch(() => null);
  }

  return data;
};
