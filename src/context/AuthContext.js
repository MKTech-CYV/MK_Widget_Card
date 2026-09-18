import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import * as Crypto from 'expo-crypto';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithCredential,
  reauthenticateWithCredential,
  GoogleAuthProvider,
  OAuthProvider,
  signOut as firebaseSignOut,
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db, isFirebaseConfigured } from '../services/firebaseClient';
import { StorageService } from '../services/StorageService';
import { fetchProfile } from '../services/ProfileService';
import { syncAccountDataOnLogin } from '../services/AccountSyncService';
import { deleteCurrentAccount } from '../services/AccountDeletionService';
import { getAppleAuthenticationModule } from '../services/NativeAuthModules';
import {
  bankQrPresetToLocalData,
  ecardPresetToLocalData,
  fetchProfileWithSelectedPresets,
} from '../services/AccountPresetService';

const AuthContext = createContext(null);

const compactText = (value) => `${value || ''}`.trim();

const ECARD_COMPARE_KEYS = [
  'fullName',
  'phone',
  'email',
  'title',
  'company',
  'department',
  'website',
  'address',
  'linkedin',
  'facebook',
  'zalo',
  'zaloCountryCode',
  'whatsapp',
  'whatsappCountryCode',
  'telegram',
  'bio',
  'avatar',
  'avatarUrl',
  'logoUrl',
  'countryCode',
];
const BANK_COMPARE_KEYS = ['bankName', 'bankAccount', 'bankAccountHolderName'];

const sectionHasValue = (data = {}, keys = []) => (
  keys.some(key => compactText(data[key]))
);

const sectionMatches = (current = {}, presetData = {}, keys = []) => (
  sectionHasValue(presetData, keys) &&
  keys.every(key => compactText(current[key]) === compactText(presetData[key]))
);

const getAccountPresetSectionsInUse = async (targetUser) => {
  StorageService.init();
  const currentData = await StorageService.getUserData().catch(() => null);
  if (!currentData || !targetUser?.id) {
    return { currentData, sections: { ecard: false, bank: false } };
  }

  const source = StorageService.getAccountPresetSource(currentData);
  const sections = {
    ecard: Boolean(source.ecardPresetId),
    bank: Boolean(source.bankPresetId),
  };

  if (!sections.ecard || !sections.bank) {
    const profile = await fetchProfileWithSelectedPresets(targetUser.id).catch(() => null);

    if (!sections.ecard && profile?.selected_ecard) {
      sections.ecard = sectionMatches(
        currentData,
        ecardPresetToLocalData(profile.selected_ecard),
        ECARD_COMPARE_KEYS
      );
    }

    if (!sections.bank && profile?.selected_bank_qr) {
      sections.bank = sectionMatches(
        currentData,
        bankQrPresetToLocalData(profile.selected_bank_qr),
        BANK_COMPARE_KEYS
      );
    }
  }

  return { currentData, sections };
};

const clearLocalAccountPresetSections = async ({ currentData, sections } = {}) => {
  if (!currentData || (!sections?.ecard && !sections?.bank)) return;

  const nextData = StorageService.clearAccountPresetSections(currentData, sections);
  if (nextData) {
    await StorageService.setUserData(nextData);
  } else {
    await StorageService.clearUserData();
  }
};

// Firebase's User object uses `.uid` and a different shape than Supabase's —
// map it to the `.id` + Supabase-named field aliases the rest of the app
// (AuthScreen.js, userProfile.js) still reads, instead of touching every
// call site.
const toAppUser = (firebaseUser) => {
  if (!firebaseUser) return null;

  return {
    id: firebaseUser.uid,
    uid: firebaseUser.uid,
    email: firebaseUser.email,
    displayName: firebaseUser.displayName,
    photoURL: firebaseUser.photoURL,
    providerData: firebaseUser.providerData,
    emailVerified: firebaseUser.emailVerified,
    email_confirmed_at: firebaseUser.emailVerified || null,
    confirmed_at: firebaseUser.emailVerified || null,
    created_at: firebaseUser.metadata?.creationTime || null,
    last_sign_in_at: firebaseUser.metadata?.lastSignInTime || null,
  };
};

// Postgres had a DB trigger that auto-created a `profiles` row on new
// auth.users signup — Firestore has no equivalent, so create it here on
// first sign-in. Idempotent: only writes if the doc doesn't exist yet.
const ensureProfileDocument = async (firebaseUser) => {
  if (!firebaseUser) return;

  const profileRef = doc(db, 'profiles', firebaseUser.uid);
  const snap = await getDoc(profileRef);
  if (snap.exists()) return;

  await setDoc(profileRef, {
    id: firebaseUser.uid,
    email: firebaseUser.email || '',
    avatar_url: firebaseUser.photoURL || '',
    ecard_preset_count: 0,
    bank_qr_preset_count: 0,
    created_at: serverTimestamp(),
  });
};

export const AuthProvider = ({ children }) => {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [accountProfile, setAccountProfile] = useState(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const syncedUserIdsRef = useRef(new Set());

  // Free/guest data is local-only. Once a user signs in, push whatever they
  // built locally up to their account (first login only) and from then on
  // treat the backend as the source of truth. Guarded to run once per user
  // per app session so it doesn't refire on every token refresh.
  const ensureAccountSynced = async (targetUser) => {
    if (!targetUser?.id || syncedUserIdsRef.current.has(targetUser.id)) return;

    syncedUserIdsRef.current.add(targetUser.id);
    try {
      await syncAccountDataOnLogin(targetUser.id);
    } catch {
      syncedUserIdsRef.current.delete(targetUser.id);
    }
  };

  const cacheAccountProfile = async (profile) => {
    const userId = profile?.id || user?.id;
    if (!userId) return null;

    StorageService.init();
    await StorageService.setCachedProfile(userId, profile);
    setAccountProfile(profile || null);
    return profile || null;
  };

  const refreshProfile = async (targetUser = user) => {
    if (!targetUser?.id || !isFirebaseConfigured) {
      setAccountProfile(null);
      return null;
    }

    StorageService.init();
    const cached = await StorageService.getCachedProfile(targetUser.id).catch(() => null);
    if (cached) {
      setAccountProfile(cached);
    }

    ensureAccountSynced(targetUser).catch(() => {});

    const remoteProfile = await fetchProfile(targetUser.id).catch(() => null);
    if (remoteProfile) {
      await StorageService.setCachedProfile(targetUser.id, remoteProfile);
      setAccountProfile(remoteProfile);
      return remoteProfile;
    }

    return cached;
  };

  const refreshSession = async () => {
    if (!isFirebaseConfigured) {
      setSession(null);
      setUser(null);
      setAccountProfile(null);
      setIsAuthReady(true);
      return null;
    }

    const appUser = toAppUser(auth.currentUser);
    setSession(appUser ? { user: appUser } : null);
    setUser(appUser);
    await refreshProfile(appUser);
    setIsAuthReady(true);

    return appUser ? { user: appUser } : null;
  };

  useEffect(() => {
    if (!isFirebaseConfigured) {
      setIsAuthReady(true);
      return undefined;
    }

    // Restores any persisted session automatically and fires once on mount —
    // no separate getSession()/deep-link race like the old OAuth-redirect
    // flow needed.
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        await ensureProfileDocument(firebaseUser).catch(() => {});
      }

      const appUser = toAppUser(firebaseUser);
      setSession(appUser ? { user: appUser } : null);
      setUser(appUser);

      if (appUser) {
        await refreshProfile(appUser).catch(() => {});
      } else {
        setAccountProfile(null);
      }

      setIsAuthReady(true);
    });

    return unsubscribe;
  }, []);

  const signInWithPassword = async ({ email, password }) => {
    if (!isFirebaseConfigured) {
      throw new Error('Firebase is not configured.');
    }

    await signInWithEmailAndPassword(auth, `${email || ''}`.trim(), password);
  };

  // Returns null if the user backs out of the native picker (matches the old
  // browser-flow behavior of quietly returning instead of throwing).
  const getGoogleIdToken = async () => {
    await GoogleSignin.hasPlayServices();
    const response = await GoogleSignin.signIn();
    if (response?.type === 'cancelled') return null;

    const idToken = response?.data?.idToken || response?.idToken;
    if (!idToken) {
      throw new Error('Google did not return an ID token.');
    }
    return idToken;
  };

  // Firebase's Apple credential exchange requires a nonce (unlike Supabase's
  // simpler signInWithIdToken) — generate + SHA-256 hash it, pass the hash to
  // Apple, and the raw value to Firebase.
  const getAppleCredential = async () => {
    const AppleAuthentication = await getAppleAuthenticationModule();
    if (!AppleAuthentication?.signInAsync) {
      throw new Error('This build is missing the Sign in with Apple module. Please rebuild the development client or store build.');
    }

    const isAvailable = await AppleAuthentication.isAvailableAsync();
    if (!isAvailable) {
      throw new Error('Sign in with Apple is not available on this device.');
    }

    const rawNonce = `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`;
    const hashedNonce = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, rawNonce);

    const appleCredential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
      nonce: hashedNonce,
    });

    if (!appleCredential.identityToken) {
      throw new Error('Apple identity token was not returned.');
    }

    const appleProvider = new OAuthProvider('apple.com');
    return appleProvider.credential({
      idToken: appleCredential.identityToken,
      rawNonce,
    });
  };

  const signInWithGoogle = async () => {
    if (!isFirebaseConfigured) {
      throw new Error('Firebase is not configured.');
    }

    const idToken = await getGoogleIdToken();
    if (!idToken) return null;

    await signInWithCredential(auth, GoogleAuthProvider.credential(idToken));
    return null;
  };

  const signInWithApple = async () => {
    if (!isFirebaseConfigured) {
      throw new Error('Firebase is not configured.');
    }

    const credential = await getAppleCredential();
    await signInWithCredential(auth, credential);
  };

  // Firebase requires a *recent* sign-in before it will let a user delete
  // their own account. For Google/Apple we can silently re-run the native
  // sign-in flow and re-authenticate without bothering the user twice; for
  // email/password there's no silent option (would need a password prompt),
  // so that case still surfaces a clear manual-retry message below.
  const reauthenticateCurrentUser = async (firebaseUser) => {
    const providerId = firebaseUser.providerData?.[0]?.providerId;

    if (providerId === 'google.com') {
      const idToken = await getGoogleIdToken();
      if (!idToken) {
        throw new Error('Đăng nhập lại đã bị huỷ.');
      }
      await reauthenticateWithCredential(firebaseUser, GoogleAuthProvider.credential(idToken));
      return;
    }

    if (providerId === 'apple.com') {
      const credential = await getAppleCredential();
      await reauthenticateWithCredential(firebaseUser, credential);
      return;
    }

    throw new Error('Vui lòng đăng xuất rồi đăng nhập lại trước khi xoá tài khoản.');
  };

  const deleteAccount = async () => {
    if (!isFirebaseConfigured) return;

    const targetUser = user;
    const firebaseUser = auth.currentUser;
    if (!targetUser?.id || !firebaseUser) {
      throw new Error('No signed-in account to delete.');
    }

    const presetSectionsInUse = await getAccountPresetSectionsInUse(targetUser).catch(() => null);

    try {
      await deleteCurrentAccount();
    } catch (error) {
      if (error?.code !== 'auth/requires-recent-login') {
        throw error;
      }
      await reauthenticateCurrentUser(firebaseUser);
      await deleteCurrentAccount();
    }

    setSession(null);
    setUser(null);
    setAccountProfile(null);

    StorageService.init();
    await StorageService.clearCachedProfile(targetUser.id).catch(() => null);
    await clearLocalAccountPresetSections({
      currentData: presetSectionsInUse?.currentData,
      sections: { ecard: true, bank: true },
    }).catch(() => {});
  };

  const signOut = async () => {
    if (!isFirebaseConfigured) return;

    const presetSectionsInUse = await getAccountPresetSectionsInUse(user).catch(() => null);
    await firebaseSignOut(auth);
    await clearLocalAccountPresetSections(presetSectionsInUse).catch(() => {});
  };

  const value = useMemo(() => ({
    session,
    user,
    accountProfile,
    isAuthReady,
    isFirebaseConfigured,
    signInWithPassword,
    signInWithGoogle,
    signInWithApple,
    refreshSession,
    refreshProfile,
    cacheAccountProfile,
    signOut,
    deleteAccount,
  }), [session, user, accountProfile, isAuthReady]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
