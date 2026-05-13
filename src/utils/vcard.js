export const emptyVCardResult = {
  isVCard: false,
  fullName: '',
  phone: '',
  email: '',
  title: '',
  company: '',
  department: '',
  website: '',
  address: '',
  linkedin: '',
  facebook: '',
  zalo: '',
  whatsapp: '',
  telegram: '',
  bio: '',
  avatarUrl: '',
  avatarDataUri: '',
  raw: '',
};

export const normalizeVCardValue = (value = '') => (
  `${value || ''}`
    .replace(/\\n/g, '\n')
    .replace(/\\,/g, ',')
    .replace(/\\;/g, ';')
    .replace(/\\\\/g, '\\')
    .trim()
);

export const escapeVCardValue = (value = '') => (
  `${value || ''}`
    .trim()
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;')
);

export const unfoldVCardLines = (value) => (
  `${value || ''}`
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .reduce((lines, line) => {
      if (/^[ \t]/.test(line) && lines.length) {
        lines[lines.length - 1] += line.slice(1);
      } else {
        lines.push(line);
      }
      return lines;
    }, [])
);

export const normalizeCountryCode = (code) => {
  const digits = `${code || '84'}`.replace(/[^\d]/g, '');
  return digits || '84';
};

export const normalizePhoneForCountry = (phone, countryCode = '84') => {
  const countryDigits = normalizeCountryCode(countryCode);
  const withoutLeadingZero = `${phone || ''}`.replace(/[^\d]/g, '').replace(/^0+/, '');

  if (withoutLeadingZero.startsWith(countryDigits) && withoutLeadingZero.length > countryDigits.length) {
    return withoutLeadingZero.slice(countryDigits.length);
  }

  return withoutLeadingZero;
};

export const formatInternationalPhone = (countryCode, phone) => {
  const localPhone = normalizePhoneForCountry(phone, countryCode);
  return localPhone ? `+${normalizeCountryCode(countryCode)}${localPhone}` : '';
};

const isRemoteUrl = (value = '') => /^https?:\/\//i.test(`${value || ''}`.trim());

const cleanUrl = (value = '') => `${value || ''}`.trim();

const cleanDisplayName = (value = '') => (
  normalizeVCardValue(value).replace(/\s*;+\s*$/g, '').trim()
);

const splitNameForVCard = (fullName = '') => {
  const parts = cleanDisplayName(fullName).split(/\s+/).filter(Boolean);
  if (parts.length <= 1) {
    return { familyName: parts[0] || '', givenName: '' };
  }

  return {
    familyName: parts[parts.length - 1],
    givenName: parts.slice(0, -1).join(' '),
  };
};

const parseMeta = (meta = '') => {
  const parts = meta.split(';').map(part => part.trim()).filter(Boolean);
  const key = (parts.shift() || '').toUpperCase();
  const params = parts.reduce((acc, part) => {
    const [rawName, ...rawValueParts] = part.split('=');
    const name = rawName.trim().toUpperCase();
    const value = rawValueParts.join('=').replace(/^"|"$/g, '').trim();

    if (!name) return acc;
    if (name === 'TYPE') {
      acc.TYPE = [
        ...(acc.TYPE || []),
        ...value.split(',').map(item => item.trim().toLowerCase()).filter(Boolean),
      ];
    } else {
      acc[name] = value || true;
    }
    return acc;
  }, {});

  return { key, params };
};

const entryHasType = (entry, type) => (
  (entry.params.TYPE || []).includes(type.toLowerCase())
);

const findValue = (entries, key, type) => {
  const upperKey = key.toUpperCase();
  const entry = entries.find(item => (
    item.key === upperKey && (!type || entryHasType(item, type))
  ));
  return entry?.value || '';
};

const findSocialValue = (entries, type) => {
  const social = entries.find(item => (
    item.key === 'X-SOCIALPROFILE' && entryHasType(item, type)
  ));
  if (social?.value) return social.value;

  const url = entries.find(item => (
    item.key === 'URL' && entryHasType(item, type)
  ));
  return url?.value || '';
};

const parseAddress = (value = '') => {
  const parts = normalizeVCardValue(value).split(';').map(part => part.trim()).filter(Boolean);
  return parts.join(', ');
};

const parsePhoto = (entry) => {
  if (!entry?.value) return {};

  if (isRemoteUrl(entry.value)) {
    return { avatarUrl: entry.value };
  }

  if (/^data:image\//i.test(entry.value)) {
    return { avatarDataUri: entry.value };
  }

  if (entry.params.ENCODING === 'b' || entry.params.ENCODING === 'BASE64') {
    const type = (entry.params.TYPE || ['jpeg'])[0] || 'jpeg';
    return { avatarDataUri: `data:image/${type.toLowerCase()};base64,${entry.value}` };
  }

  return {};
};

export const parseVCard = (rawValue) => {
  const raw = `${rawValue || ''}`.trim();
  const result = { ...emptyVCardResult, raw };
  const lines = unfoldVCardLines(raw);
  const hasVCard = lines.some(line => line.trim().toUpperCase() === 'BEGIN:VCARD');

  if (!hasVCard) {
    return result;
  }

  const entries = lines.reduce((acc, line) => {
    const separatorIndex = line.indexOf(':');
    if (separatorIndex < 0) return acc;

    const meta = line.slice(0, separatorIndex);
    const { key, params } = parseMeta(meta);
    const value = normalizeVCardValue(line.slice(separatorIndex + 1));

    if (key && value && key !== 'BEGIN' && key !== 'END' && key !== 'VERSION') {
      acc.push({ key, params, value });
    }

    return acc;
  }, []);

  const nameParts = cleanDisplayName(findValue(entries, 'N'))
    .split(';')
    .filter(Boolean)
    .reverse()
    .join(' ')
    .trim();
  const orgParts = findValue(entries, 'ORG')
    .split(';')
    .map(part => normalizeVCardValue(part))
    .filter(Boolean);
  const photoEntry = entries.find(item => item.key === 'PHOTO');
  const photo = parsePhoto(photoEntry);

  return {
    ...result,
    ...photo,
    isVCard: true,
    fullName: cleanDisplayName(findValue(entries, 'FN') || nameParts),
    phone: findValue(entries, 'TEL'),
    email: findValue(entries, 'EMAIL'),
    title: findValue(entries, 'TITLE'),
    company: orgParts[0] || '',
    department: orgParts.slice(1).join(', '),
    website: findValue(entries, 'URL', 'work') || findValue(entries, 'URL', 'website') || findValue(entries, 'URL'),
    address: parseAddress(findValue(entries, 'ADR')),
    linkedin: findSocialValue(entries, 'linkedin'),
    facebook: findSocialValue(entries, 'facebook'),
    zalo: findSocialValue(entries, 'zalo'),
    whatsapp: findSocialValue(entries, 'whatsapp'),
    telegram: findSocialValue(entries, 'telegram'),
    bio: findValue(entries, 'NOTE'),
  };
};

export const buildVCard = (data = {}) => {
  const lines = ['BEGIN:VCARD', 'VERSION:3.0'];
  const add = (key, value) => {
    const escaped = escapeVCardValue(value);
    if (escaped) lines.push(`${key}:${escaped}`);
  };
  const addRaw = (line, value) => {
    if (`${value || ''}`.trim()) lines.push(line);
  };

  add('FN', data.fullName);
  if (data.fullName) {
    const { familyName, givenName } = splitNameForVCard(data.fullName);
    lines.push(`N:${escapeVCardValue(familyName)};${escapeVCardValue(givenName)};;;`);
  }

  const phone = formatInternationalPhone(data.countryCode, data.phone);
  add('TEL;TYPE=CELL', phone);
  add('EMAIL;TYPE=INTERNET,WORK', data.email);

  const org = [data.company, data.department]
    .map(escapeVCardValue)
    .filter(Boolean)
    .join(';');
  addRaw(`ORG:${org}`, org);
  add('TITLE', data.title);
  add('URL;TYPE=WORK', cleanUrl(data.website));
  addRaw(`ADR;TYPE=WORK:;;${escapeVCardValue(data.address)};;;;`, data.address);

  [
    ['linkedin', data.linkedin],
    ['facebook', data.facebook],
    ['zalo', formatInternationalPhone(data.zaloCountryCode || data.countryCode, data.zalo)],
    ['whatsapp', formatInternationalPhone(data.whatsappCountryCode || data.countryCode, data.whatsapp)],
    ['telegram', data.telegram],
  ].forEach(([type, value]) => {
    const cleaned = cleanUrl(value);
    addRaw(`X-SOCIALPROFILE;TYPE=${type}:${escapeVCardValue(cleaned)}`, cleaned);
  });

  const avatarUrl = cleanUrl(data.avatarUrl || (isRemoteUrl(data.avatar) ? data.avatar : ''));
  addRaw(`PHOTO;VALUE=URI:${escapeVCardValue(avatarUrl)}`, avatarUrl);
  add('NOTE', data.bio);

  lines.push('END:VCARD');
  return lines.join('\n');
};
