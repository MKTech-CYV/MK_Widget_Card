import { ref, listAll, deleteObject } from 'firebase/storage';
import { collection, doc, getDocs, query, where, writeBatch } from 'firebase/firestore';
import { deleteUser } from 'firebase/auth';
import { auth, db, storage, isFirebaseConfigured } from './firebaseClient';
import { purgeServerAccountData } from './DeviceService';

const STORAGE_PREFIXES_TO_CLEAN = ['avatars', 'ecards'];

const cleanStorageFolder = async (prefix, userId) => {
  const folderRef = ref(storage, `${prefix}/${userId}`);
  const { items } = await listAll(folderRef);
  await Promise.all(items.map((item) => deleteObject(item).catch(() => null)));
};

const deleteCollectionForUser = async (batch, collectionName, userId) => {
  const snap = await getDocs(query(collection(db, collectionName), where('user_id', '==', userId)));
  snap.docs.forEach((docSnap) => batch.delete(docSnap.ref));
};

const cleanAccountOwnedData = async (userId) => {
  await Promise.all(STORAGE_PREFIXES_TO_CLEAN.map((prefix) => (
    cleanStorageFolder(prefix, userId).catch(() => null)
  )));

  const batch = writeBatch(db);
  await deleteCollectionForUser(batch, 'user_ecards', userId);
  await deleteCollectionForUser(batch, 'user_bank_qrs', userId);
  batch.delete(doc(db, 'profiles', userId));
  await batch.commit();
};

// Callers should catch `auth/requires-recent-login` specifically: Firebase
// requires a fresh sign-in before allowing self-deletion, so the caller must
// prompt re-authentication (re-run whichever provider the user signed in
// with) and retry this call.
export const deleteCurrentAccount = async () => {
  if (!isFirebaseConfigured) {
    throw new Error('Firebase is not configured.');
  }

  const user = auth.currentUser;
  if (!user) {
    throw new Error('Please sign in before deleting your account.');
  }

  await cleanAccountOwnedData(user.uid);
  // Device registry, login history and short links live on the website
  // backend and need the still-valid ID token, so purge before deleting.
  await purgeServerAccountData();
  await deleteUser(user);
};
