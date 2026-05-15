import { isSupabaseConfigured, supabase, supabaseAnonKey, supabaseKey, supabasePublishableKey, supabaseUrl } from './supabaseClient';
import { deleteStorageFile, parseStoragePathFromPublicUrl } from './SupabaseStorageService';
import { getFriendlyErrorMessage } from '../utils/errorParser';

const requireAuthSession = async () => {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase is not configured.');
  }

  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  if (!data?.session?.access_token || !data.session.user?.id) {
    throw new Error('Please sign in before using account presets.');
  }

  return data.session;
};

const restRequest = async (path, { method = 'GET', body, prefer } = {}) => {
  const session = await requireAuthSession();
  const restKey = supabasePublishableKey || supabaseAnonKey || supabaseKey;
  const baseUrl = supabaseUrl.replace(/\/$/, '');

  let response;
  try {
    response = await fetch(`${baseUrl}/rest/v1${path}`, {
      method,
      headers: {
        Accept: 'application/json',
        apikey: restKey,
        Authorization: `Bearer ${session.access_token}`,
        ...(body ? { 'Content-Type': 'application/json' } : {}),
        ...(prefer ? { Prefer: prefer } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
  } catch (error) {
    const friendly = getFriendlyErrorMessage(error);
    throw new Error(friendly || 'Không có kết nối mạng. Vui lòng kiểm tra kết nối Internet.');
  }

  if (!response.ok) {
    const message = await response.text().catch(() => '');
    throw new Error(message || `Supabase request failed (${response.status})`);
  }

  if (response.status === 204) return null;

  const text = await response.text();
  return text ? JSON.parse(text) : null;
};

const firstRow = (value) => (Array.isArray(value) ? value[0] : value);

const compactText = (value) => `${value || ''}`.trim();

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

export const ecardToPresetPayload = ({ userId, data }) => ({
  user_id: userId,
  label: buildECardLabel(data),
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
  last_used_at: new Date().toISOString(),
});

export const bankQrToPresetPayload = ({ userId, data, bankDisplayName }) => {
  const holderName = compactText(data.bankAccountHolderName);

  return {
    user_id: userId,
    bank_code: compactText(data.bankName),
    bank_name: compactText(bankDisplayName) || compactText(data.bankName),
    account_number: compactText(data.bankAccount),
    account_holder_name: holderName,
    label: buildBankLabel(data, bankDisplayName),
    qr_payload: {
      bankName: compactText(data.bankName),
      bankAccount: compactText(data.bankAccount),
      bankAccountHolderName: holderName,
    },
    qr_url: buildBankQrUrl(data, holderName),
    last_used_at: new Date().toISOString(),
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
    countryCode: preset.phone_country_code || social.countryCode || social.country_code || '84',
    avatar,
    avatarUrl: social.avatarUrl || preset.avatar_url || '',
  };
};

export const bankQrPresetToLocalData = (preset = {}) => ({
  bankName: preset.bank_code || preset.bank_name || 'MB',
  bankAccount: preset.account_number || '',
  bankAccountHolderName: preset.account_holder_name || '',
});

export const fetchProfileWithSelectedPresets = async (userId) => {
  const data = await restRequest(
    `/profiles?select=*,selected_ecard:user_ecards(*),selected_bank_qr:user_bank_qrs(*)&id=eq.${encodeURIComponent(userId)}`
  );
  return firstRow(data) || null;
};

export const fetchECardPresets = async () => {
  const data = await restRequest('/user_ecards?select=*&order=created_at.desc');
  return Array.isArray(data) ? data : [];
};

export const fetchBankQrPresets = async () => {
  const data = await restRequest('/user_bank_qrs?select=*&order=created_at.desc');
  return Array.isArray(data) ? data : [];
};

export const saveECardPreset = async ({ userId, data }) => {
  const created = await restRequest('/user_ecards', {
    method: 'POST',
    body: ecardToPresetPayload({ userId, data }),
    prefer: 'return=representation',
  });
  const preset = firstRow(created);

  if (preset?.id) {
    await setSelectedECardPreset(userId, preset.id);
  }

  return preset;
};

export const saveBankQrPreset = async ({ userId, data, bankDisplayName }) => {
  const created = await restRequest('/user_bank_qrs', {
    method: 'POST',
    body: bankQrToPresetPayload({ userId, data, bankDisplayName }),
    prefer: 'return=representation',
  });
  const preset = firstRow(created);

  if (preset?.id) {
    await setSelectedBankQrPreset(userId, preset.id);
  }

  return preset;
};

export const updateECardPreset = async (presetId, payload) => {
  const updated = await restRequest(`/user_ecards?id=eq.${encodeURIComponent(presetId)}`, {
    method: 'PATCH',
    body: {
      ...payload,
      updated_at: new Date().toISOString(),
    },
    prefer: 'return=representation',
  });

  return firstRow(updated);
};

export const updateBankQrPreset = async (presetId, payload) => {
  const updated = await restRequest(`/user_bank_qrs?id=eq.${encodeURIComponent(presetId)}`, {
    method: 'PATCH',
    body: {
      ...payload,
      updated_at: new Date().toISOString(),
    },
    prefer: 'return=representation',
  });

  return firstRow(updated);
};

export const setSelectedECardPreset = async (userId, presetId) => {
  await restRequest(`/profiles?id=eq.${encodeURIComponent(userId)}`, {
    method: 'PATCH',
    body: { selected_ecard_id: presetId },
    prefer: 'return=minimal',
  });
  await restRequest(`/user_ecards?id=eq.${encodeURIComponent(presetId)}`, {
    method: 'PATCH',
    body: { last_used_at: new Date().toISOString() },
    prefer: 'return=minimal',
  });
};

export const setSelectedBankQrPreset = async (userId, presetId) => {
  await restRequest(`/profiles?id=eq.${encodeURIComponent(userId)}`, {
    method: 'PATCH',
    body: { selected_bank_qr_id: presetId },
    prefer: 'return=minimal',
  });
  await restRequest(`/user_bank_qrs?id=eq.${encodeURIComponent(presetId)}`, {
    method: 'PATCH',
    body: { last_used_at: new Date().toISOString() },
    prefer: 'return=minimal',
  });
};

const fetchECardPresetById = async (presetId) => {
  const data = await restRequest(`/user_ecards?id=eq.${encodeURIComponent(presetId)}&select=*,social`);
  return firstRow(data);
};

export const deleteECardPreset = async (presetId) => {
  const preset = await fetchECardPresetById(presetId);
  const avatarUrl = compactText(preset?.avatar_url || preset?.social?.avatarUrl || preset?.social?.avatar || '');
  const storageInfo = parseStoragePathFromPublicUrl(avatarUrl);

  if (storageInfo?.bucket && storageInfo?.path) {
    await deleteStorageFile(storageInfo).catch(() => null);
  }

  await restRequest(`/user_ecards?id=eq.${encodeURIComponent(presetId)}`, {
    method: 'DELETE',
    prefer: 'return=minimal',
  });
};

export const deleteBankQrPreset = async (presetId) => {
  await restRequest(`/user_bank_qrs?id=eq.${encodeURIComponent(presetId)}`, {
    method: 'DELETE',
    prefer: 'return=minimal',
  });
};
