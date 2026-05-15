import { Platform, Share } from 'react-native';

const ECARD_WEB_URL = 'https://mktechvn.com/ecard';

const cleanText = (value) => `${value || ''}`.trim();

const appendParam = (params, key, value) => {
  const cleaned = cleanText(value);
  if (cleaned) {
    params.append(key, cleaned);
  }
};

export const buildECardShareUrl = (data = {}, language = 'vi') => {
  const social = data.social || {};
  const params = new URLSearchParams();

  if (language === 'en') {
    params.append('lang', 'en');
  }

  appendParam(params, 'label', data.label);
  appendParam(params, 'full_name', data.full_name || data.fullName);
  appendParam(params, 'job_title', data.job_title || data.title);
  appendParam(params, 'company', data.company);
  appendParam(params, 'department', data.department);
  appendParam(params, 'email', data.email);
  appendParam(params, 'phone', data.phone);
  appendParam(params, 'website', data.website);
  appendParam(params, 'address', data.address);
  appendParam(params, 'avatar_url', data.avatar_url || data.avatarUrl || social.avatarUrl || social.avatar);
  appendParam(params, 'bio', data.bio || social.bio);
  appendParam(params, 'facebook', data.facebook || social.facebook);
  appendParam(params, 'instagram', data.instagram || social.instagram);
  appendParam(params, 'linkedin', data.linkedin || social.linkedin);
  appendParam(params, 'telegram', data.telegram || social.telegram);
  appendParam(params, 'tiktok', data.tiktok || social.tiktok);
  appendParam(params, 'whatsapp', data.whatsapp || social.whatsapp);
  appendParam(params, 'zalo', data.zalo || social.zalo);
  appendParam(params, 'x', data.x || social.x);
  appendParam(params, 'youtube', data.youtube || social.youtube);
  appendParam(params, 'github', data.github || social.github);
  appendParam(params, 'countryCode', data.countryCode || data.phone_country_code || social.countryCode || social.country_code);
  appendParam(params, 'zaloCountryCode', data.zaloCountryCode || social.zaloCountryCode || social.zalo_country_code);
  appendParam(params, 'whatsappCountryCode', data.whatsappCountryCode || social.whatsappCountryCode || social.whatsapp_country_code);

  const queryString = params.toString().replace(/\+/g, '%20');
  return queryString ? `${ECARD_WEB_URL}?${queryString}` : ECARD_WEB_URL;
};

export const buildBankQrShareUrl = (data = {}) => {
  const payload = data.qr_payload || {};
  const bankCode = cleanText(data.bank_code || data.bankName || payload.bankName);
  const accountNumber = cleanText(data.account_number || data.bankAccount || payload.bankAccount).replace(/[^\d]/g, '');
  const accountName = cleanText(data.account_holder_name || data.bankAccountHolderName || payload.bankAccountHolderName);

  if (bankCode && accountNumber) {
    const accountNameParam = accountName ? `?accountName=${encodeURIComponent(accountName)}` : '';
    return `https://img.vietqr.io/image/${encodeURIComponent(bankCode)}-${accountNumber}-qr_only.png${accountNameParam}`;
  }

  return cleanText(data.qr_url);
};

export const shareUrl = async ({ url, title }) => {
  const cleanUrl = cleanText(url);
  if (!cleanUrl) return null;

  const content = Platform.OS === 'ios'
    ? { title, url: cleanUrl }
    : { title, message: cleanUrl };

  const options = Platform.OS === 'ios' && title ? { subject: title } : undefined;
  return Share.share(content, options);
};
