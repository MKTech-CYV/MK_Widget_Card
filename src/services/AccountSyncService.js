import { StorageService } from './StorageService';
import {
  bankQrPresetToLocalData,
  ecardPresetToLocalData,
  fetchBankQrPresets,
  fetchECardPresets,
  fetchProfileWithSelectedPresets,
  saveBankQrPreset,
  saveECardPreset,
} from './AccountPresetService';

const compactText = (value) => `${value || ''}`.trim();

const hasMeaningfulECard = (data = {}) => Boolean(compactText(data.fullName));

const hasMeaningfulBankQr = (data = {}) => (
  Boolean(compactText(data.bankAccount)) && Boolean(compactText(data.bankAccountHolderName))
);

// On first login, guests may already have a card filled out locally. Push it
// up as their first backend preset so free accounts don't lose it, then let
// whatever is already on the backend (if any) win from here on.
export const syncAccountDataOnLogin = async (userId) => {
  if (!userId) return null;

  StorageService.init();
  const localData = await StorageService.getUserData().catch(() => null) || {};

  const [ecardPresets, bankPresets] = await Promise.all([
    fetchECardPresets().catch(() => []),
    fetchBankQrPresets().catch(() => []),
  ]);

  if (!ecardPresets.length && hasMeaningfulECard(localData)) {
    await saveECardPreset({ userId, data: localData }).catch(() => null);
  }

  if (!bankPresets.length && hasMeaningfulBankQr(localData)) {
    await saveBankQrPreset({
      userId,
      data: localData,
      bankDisplayName: localData.bankName,
    }).catch(() => null);
  }

  return pullSelectedAccountDataToLocal(userId, localData);
};

// Backend is the source of truth once signed in: mirror the account's
// selected eCard/QR Bank presets into local storage (used for instant
// display and for the native widget, which only reads local storage).
export const pullSelectedAccountDataToLocal = async (userId, baseData) => {
  if (!userId) return null;

  StorageService.init();
  const currentData = baseData || await StorageService.getUserData().catch(() => null) || {};
  const profile = await fetchProfileWithSelectedPresets(userId).catch(() => null);

  const selectedEcard = profile?.selected_ecard || null;
  const selectedBank = profile?.selected_bank_qr || null;

  if (!selectedEcard && !selectedBank) {
    return currentData;
  }

  let mergedData = { ...currentData };
  const sourceUpdate = {};

  if (selectedEcard) {
    mergedData = { ...mergedData, ...ecardPresetToLocalData(selectedEcard) };
    sourceUpdate.ecardPresetId = selectedEcard.id;
  }

  if (selectedBank) {
    mergedData = { ...mergedData, ...bankQrPresetToLocalData(selectedBank) };
    sourceUpdate.bankPresetId = selectedBank.id;
  }

  const finalData = StorageService.markAccountPresetSource(mergedData, sourceUpdate);
  await StorageService.setUserData(finalData);
  return finalData;
};
