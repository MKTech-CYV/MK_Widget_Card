import {
  collection, doc, getDoc, getDocs, updateDoc, deleteDoc,
  query, where, orderBy, serverTimestamp, writeBatch, runTransaction,
} from 'firebase/firestore';
import { db, auth, isFirebaseConfigured } from './firebaseClient';
import { deleteStorageFileFromUrl, deleteStorageFileFromUrlIfChanged } from './FirebaseStorageService';
import { revokeShortEcardLink } from './ShareLinkService';

const requireUid = () => {
  if (!isFirebaseConfigured) {
    throw new Error('Firebase is not configured.');
  }

  const uid = auth.currentUser?.uid;
  if (!uid) {
    throw new Error('Please sign in before using account presets.');
  }

  return uid;
};

const compactText = (value) => `${value || ''}`.trim();

// Matches the real cap from the old Postgres RLS policy (pg_policies:
// "Users can insert own ecards"/"...bank qrs", `count(*) < 10`). Enforced
// here via a Firestore transaction against a counter on `profiles` (count(*)
// isn't cheap/atomic in Security Rules the way Postgres RLS made it). A
// `getAfter()` Security Rules layer for defense-in-depth was designed but
// deliberately not shipped — that needs the Firestore emulator + rules unit
// tests to verify it doesn't false-block legitimate writes, which is out of
// scope for now. A user bypassing their *own* quota client-side is low
// severity (self-inconvenience, not cross-user exposure).
const ECARD_PRESET_LIMIT = 10;
const BANK_QR_PRESET_LIMIT = 10;

const presetLimitError = (message) => {
  const error = new Error(message);
  error.code = 'preset-limit-reached';
  return error;
};

export const isPresetLimitPolicyError = (error) => error?.code === 'preset-limit-reached';

const buildECardLabel = (data = {}) => (
  compactText(data.fullName) || compactText(data.email) || 'eCard'
);

const buildBankLabel = (data = {}, bankDisplayName = '') => {
  const bank = compactText(bankDisplayName) || compactText(data.bankName) || 'QR Bank';
  const account = compactText(data.bankAccount);
  return account ? `${bank} • ${account.slice(-4)}` : bank;
};

const buildBankQrUrl = (data = {}, holderName = '') => {
  if (!data.bankName || !data.bankAccount) return '';
  return `https://img.vietqr.io/image/${data.bankName}-${data.bankAccount}-qr_only.png?accountName=${encodeURIComponent(holderName)}`;
};

const getECardAvatarUrl = (preset = {}) => (
  compactText(preset.avatar_url || preset.social?.avatarUrl || preset.social?.avatar || '')
);

const getECardLogoUrl = (preset = {}) => compactText(preset.logo_url || '');

const deleteECardAvatarFromStorage = async (avatarUrl) => {
  await deleteStorageFileFromUrl(avatarUrl, 'ecards').catch(() => null);
};

const cleanupReplacedECardAvatar = async (previousPreset, nextPreset) => {
  const previousUrl = getECardAvatarUrl(previousPreset);
  const nextUrl = getECardAvatarUrl(nextPreset);
  await deleteStorageFileFromUrlIfChanged({
    previousUrl,
    nextUrl,
    bucket: 'ecards',
  }).catch(() => null);

  await deleteStorageFileFromUrlIfChanged({
    previousUrl: getECardLogoUrl(previousPreset),
    nextUrl: getECardLogoUrl(nextPreset),
    bucket: 'ecards',
  }).catch(() => null);
};

export const ecardToPresetPayload = ({ userId, data, label }) => ({
  user_id: userId,
  label: compactText(label) || buildECardLabel(data),
  full_name: compactText(data.fullName),
  job_title: compactText(data.title),
  company: compactText(data.company),
  department: compactText(data.department),
  email: compactText(data.email),
  phone: compactText(data.phone),
  phone_country_code: compactText(data.countryCode) || '84',
  website: compactText(data.website),
  address: compactText(data.address),
  avatar_url: compactText(data.avatarUrl) || compactText(data.avatar),
  logo_url: compactText(data.logoUrl),
  about: compactText(data.about),
  social: {
    linkedin: compactText(data.linkedin),
    facebook: compactText(data.facebook),
    zalo: compactText(data.zalo),
    zaloCountryCode: compactText(data.zaloCountryCode),
    whatsapp: compactText(data.whatsapp),
    whatsappCountryCode: compactText(data.whatsappCountryCode),
    telegram: compactText(data.telegram),
    bio: compactText(data.bio),
    countryCode: compactText(data.countryCode),
    avatar: compactText(data.avatar),
    avatarUrl: compactText(data.avatarUrl),
  },
  last_used_at: serverTimestamp(),
});

export const bankQrToPresetPayload = ({ userId, data, bankDisplayName, label }) => {
  const holderName = compactText(data.bankAccountHolderName);

  return {
    user_id: userId,
    bank_code: compactText(data.bankName),
    bank_name: compactText(bankDisplayName) || compactText(data.bankName),
    account_number: compactText(data.bankAccount),
    account_holder_name: holderName,
    label: compactText(label) || buildBankLabel(data, bankDisplayName),
    qr_payload: {
      bankName: compactText(data.bankName),
      bankAccount: compactText(data.bankAccount),
      bankAccountHolderName: holderName,
    },
    qr_url: buildBankQrUrl(data, holderName),
    last_used_at: serverTimestamp(),
  };
};

export const ecardPresetToLocalData = (preset = {}) => {
  const social = preset.social || {};
  const avatar = social.avatar || preset.avatar_url || '';

  return {
    fullName: preset.full_name || '',
    phone: preset.phone || '',
    email: preset.email || '',
    title: preset.job_title || '',
    company: preset.company || '',
    department: preset.department || '',
    website: preset.website || '',
    address: preset.address || '',
    linkedin: social.linkedin || '',
    facebook: social.facebook || '',
    zalo: social.zalo || '',
    zaloCountryCode: social.zaloCountryCode || social.zalo_country_code || '84',
    whatsapp: social.whatsapp || '',
    whatsappCountryCode: social.whatsappCountryCode || social.whatsapp_country_code || '84',
    telegram: social.telegram || '',
    bio: social.bio || '',
    about: preset.about || '',
    countryCode: preset.phone_country_code || social.countryCode || social.country_code || '84',
    avatar,
    avatarUrl: social.avatarUrl || preset.avatar_url || '',
    logoUrl: preset.logo_url || '',
  };
};

export const bankQrPresetToLocalData = (preset = {}) => ({
  bankName: preset.bank_code || preset.bank_name || 'MB',
  bankAccount: preset.account_number || '',
  bankAccountHolderName: preset.account_holder_name || '',
});

const fetchECardPresetById = async (presetId) => {
  const snap = await getDoc(doc(db, 'user_ecards', presetId));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
};

const fetchBankQrPresetById = async (presetId) => {
  const snap = await getDoc(doc(db, 'user_bank_qrs', presetId));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
};

export const fetchProfileWithSelectedPresets = async (userId) => {
  const profileSnap = await getDoc(doc(db, 'profiles', userId));
  if (!profileSnap.exists()) return null;

  const profile = { id: profileSnap.id, ...profileSnap.data() };

  const [selectedEcard, selectedBankQr] = await Promise.all([
    profile.selected_ecard_id ? fetchECardPresetById(profile.selected_ecard_id) : Promise.resolve(null),
    profile.selected_bank_qr_id ? fetchBankQrPresetById(profile.selected_bank_qr_id) : Promise.resolve(null),
  ]);

  return {
    ...profile,
    selected_ecard: selectedEcard,
    selected_bank_qr: selectedBankQr,
  };
};

export const fetchECardPresets = async () => {
  const uid = requireUid();
  const presetsQuery = query(
    collection(db, 'user_ecards'),
    where('user_id', '==', uid),
    orderBy('created_at', 'desc')
  );
  const snap = await getDocs(presetsQuery);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
};

export const fetchBankQrPresets = async () => {
  const uid = requireUid();
  const presetsQuery = query(
    collection(db, 'user_bank_qrs'),
    where('user_id', '==', uid),
    orderBy('created_at', 'desc')
  );
  const snap = await getDocs(presetsQuery);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
};

export const saveECardPreset = async ({ userId, data, label }) => {
  const payload = ecardToPresetPayload({ userId, data, label });
  const newDocRef = doc(collection(db, 'user_ecards'));
  const profileRef = doc(db, 'profiles', userId);

  await runTransaction(db, async (transaction) => {
    const profileSnap = await transaction.get(profileRef);
    const currentCount = profileSnap.exists() ? (profileSnap.data().ecard_preset_count || 0) : 0;

    if (currentCount >= ECARD_PRESET_LIMIT) {
      throw presetLimitError('eCard preset limit reached.');
    }

    transaction.set(newDocRef, {
      ...payload,
      created_at: serverTimestamp(),
      updated_at: serverTimestamp(),
    });
    transaction.set(profileRef, { ecard_preset_count: currentCount + 1 }, { merge: true });
  });

  await setSelectedECardPreset(userId, newDocRef.id);
  return fetchECardPresetById(newDocRef.id);
};

export const saveBankQrPreset = async ({ userId, data, bankDisplayName, label }) => {
  const payload = bankQrToPresetPayload({ userId, data, bankDisplayName, label });
  const newDocRef = doc(collection(db, 'user_bank_qrs'));
  const profileRef = doc(db, 'profiles', userId);

  await runTransaction(db, async (transaction) => {
    const profileSnap = await transaction.get(profileRef);
    const currentCount = profileSnap.exists() ? (profileSnap.data().bank_qr_preset_count || 0) : 0;

    if (currentCount >= BANK_QR_PRESET_LIMIT) {
      throw presetLimitError('Bank QR preset limit reached.');
    }

    transaction.set(newDocRef, {
      ...payload,
      created_at: serverTimestamp(),
      updated_at: serverTimestamp(),
    });
    transaction.set(profileRef, { bank_qr_preset_count: currentCount + 1 }, { merge: true });
  });

  await setSelectedBankQrPreset(userId, newDocRef.id);
  return fetchBankQrPresetById(newDocRef.id);
};

export const updateECardPreset = async (presetId, payload, previousPreset) => {
  const previous = previousPreset === undefined
    ? await fetchECardPresetById(presetId).catch(() => null)
    : previousPreset;

  await updateDoc(doc(db, 'user_ecards', presetId), {
    ...payload,
    updated_at: serverTimestamp(),
  });

  const nextPreset = await fetchECardPresetById(presetId);
  await cleanupReplacedECardAvatar(previous, nextPreset || payload);

  return nextPreset;
};

export const updateBankQrPreset = async (presetId, payload) => {
  await updateDoc(doc(db, 'user_bank_qrs', presetId), {
    ...payload,
    updated_at: serverTimestamp(),
  });

  return fetchBankQrPresetById(presetId);
};

export const setSelectedECardPreset = async (userId, presetId) => {
  const batch = writeBatch(db);
  batch.update(doc(db, 'profiles', userId), { selected_ecard_id: presetId });
  batch.update(doc(db, 'user_ecards', presetId), { last_used_at: serverTimestamp() });
  await batch.commit();
};

export const setSelectedBankQrPreset = async (userId, presetId) => {
  const batch = writeBatch(db);
  batch.update(doc(db, 'profiles', userId), { selected_bank_qr_id: presetId });
  batch.update(doc(db, 'user_bank_qrs', presetId), { last_used_at: serverTimestamp() });
  await batch.commit();
};

// Also clears the profile's selected_*_id pointer in the same transaction if
// it pointed at the preset being deleted — otherwise the pointer dangles and
// AccountSyncService keeps trying to resolve a preset that no longer exists,
// silently falling back to whatever stale local copy was already there.
const deleteWithCounterDecrement = async (collectionName, countField, selectedField, presetId, userId) => {
  const presetRef = doc(db, collectionName, presetId);

  if (!userId) {
    await deleteDoc(presetRef);
    return false;
  }

  const profileRef = doc(db, 'profiles', userId);
  let wasSelected = false;

  await runTransaction(db, async (transaction) => {
    const profileSnap = await transaction.get(profileRef);
    const profileData = profileSnap.exists() ? profileSnap.data() : {};
    const currentCount = profileData[countField] || 0;
    wasSelected = profileData[selectedField] === presetId;

    const profileUpdates = { [countField]: Math.max(0, currentCount - 1) };
    if (wasSelected) {
      profileUpdates[selectedField] = null;
    }

    transaction.delete(presetRef);
    transaction.set(profileRef, profileUpdates, { merge: true });
  });

  return wasSelected;
};

// Returns true if the deleted preset was the account's active/selected one —
// callers should clear the matching local section when this is true.
export const deleteECardPreset = async (presetId) => {
  const preset = await fetchECardPresetById(presetId);

  const wasSelected = await deleteWithCounterDecrement(
    'user_ecards', 'ecard_preset_count', 'selected_ecard_id', presetId, preset?.user_id
  );

  await deleteECardAvatarFromStorage(getECardAvatarUrl(preset));
  await deleteECardAvatarFromStorage(getECardLogoUrl(preset));

  // The short link is dead once the preset is gone; tidy its server record.
  if (preset?.share_code) {
    revokeShortEcardLink(preset.share_code);
  }

  return wasSelected;
};

export const deleteBankQrPreset = async (presetId) => {
  const preset = await fetchBankQrPresetById(presetId);

  return deleteWithCounterDecrement(
    'user_bank_qrs', 'bank_qr_preset_count', 'selected_bank_qr_id', presetId, preset?.user_id
  );
};
