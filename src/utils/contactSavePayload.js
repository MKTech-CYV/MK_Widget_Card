const cleanText = (value) => `${value || ''}`.trim();

const phoneDigits = (value) => cleanText(value).replace(/[^\d]/g, '');

const normalizedTelegramUser = (value) => cleanText(value)
  .replace(/^https?:\/\/(t\.me|telegram\.me)\//i, '')
  .replace(/^@+/, '')
  .split(/[/?#]/)[0]
  .trim();

const socialUrlFromValue = (type, value) => {
  const cleaned = cleanText(value);
  if (!cleaned) return '';
  if (/^https?:\/\//i.test(cleaned)) return cleaned;

  if (type === 'zalo') {
    const digits = phoneDigits(cleaned);
    return digits ? `https://zalo.me/${digits}` : '';
  }

  if (type === 'whatsapp') {
    const digits = phoneDigits(cleaned);
    return digits ? `https://wa.me/${digits}` : '';
  }

  if (type === 'telegram') {
    const username = normalizedTelegramUser(cleaned);
    return username ? `https://t.me/${username}` : '';
  }

  return '';
};

export const buildContactNote = (result = {}, t = key => key) => {
  const rows = [
    [t('scan.phoneLabel'), result.phone],
    [t('scan.emailLabel'), result.email],
    [t('scan.titleLabel'), result.title],
    [t('scan.companyLabel'), result.company],
    [t('scan.departmentLabel'), result.department],
    [t('scan.websiteLabel'), result.website],
    [t('scan.addressLabel'), result.address],
    [t('scan.linkedinLabel'), result.linkedin],
    [t('scan.facebookLabel'), result.facebook],
    [t('scan.zaloLabel'), result.zalo],
    [t('scan.whatsappLabel'), result.whatsapp],
    [t('scan.telegramLabel'), result.telegram],
    [t('scan.bioLabel'), result.bio],
  ];

  const seen = new Set();
  const lines = rows.reduce((acc, [label, value]) => {
    const cleaned = cleanText(value);
    if (!cleaned || seen.has(`${label}:${cleaned}`)) return acc;

    seen.add(`${label}:${cleaned}`);
    acc.push(`${label}: ${cleaned}`);
    return acc;
  }, []);

  return lines.length ? `MK eCard\n${lines.join('\n')}` : '';
};

export const contactPayloadFromResult = (result = {}, t = key => key) => ({
  fullName: cleanText(result.fullName),
  phone: cleanText(result.phone),
  email: cleanText(result.email),
  title: cleanText(result.title),
  company: cleanText(result.company),
  department: cleanText(result.department),
  website: cleanText(result.website),
  address: cleanText(result.address),
  linkedin: cleanText(result.linkedin),
  facebook: cleanText(result.facebook),
  zalo: cleanText(result.zalo),
  whatsapp: cleanText(result.whatsapp),
  telegram: cleanText(result.telegram),
  zaloUrl: socialUrlFromValue('zalo', result.zalo),
  whatsappUrl: socialUrlFromValue('whatsapp', result.whatsapp),
  telegramUrl: socialUrlFromValue('telegram', result.telegram),
  bio: cleanText(result.bio),
  note: buildContactNote(result, t),
  avatarUrl: cleanText(result.avatarDataUri || result.avatarUrl),
});

export const buildExpoContact = (Contacts, result = {}, t = key => key) => {
  const payload = contactPayloadFromResult(result, t);

  return {
    [Contacts.Fields.FirstName]: payload.fullName,
    [Contacts.Fields.PhoneNumbers]: payload.phone ? [{ label: 'mobile', number: payload.phone }] : [],
    [Contacts.Fields.Emails]: payload.email ? [{ label: 'work', email: payload.email }] : [],
    [Contacts.Fields.Company]: payload.company,
    [Contacts.Fields.JobTitle]: payload.title,
    [Contacts.Fields.Department]: payload.department,
    [Contacts.Fields.Addresses]: payload.address ? [{ label: 'work', street: payload.address }] : [],
    [Contacts.Fields.UrlAddresses]: [
      payload.website ? { label: 'website', url: payload.website } : null,
      payload.linkedin ? { label: 'linkedin', url: payload.linkedin } : null,
      payload.facebook ? { label: 'facebook', url: payload.facebook } : null,
      payload.zaloUrl ? { label: 'Zalo', url: payload.zaloUrl } : null,
      payload.whatsappUrl ? { label: 'WhatsApp', url: payload.whatsappUrl } : null,
      payload.telegramUrl ? { label: 'Telegram', url: payload.telegramUrl } : null,
    ].filter(Boolean),
    [Contacts.Fields.InstantMessageAddresses]: [
      payload.zalo ? { label: 'Zalo', service: 'Zalo', username: payload.zalo } : null,
      payload.whatsapp ? { label: 'WhatsApp', service: 'WhatsApp', username: payload.whatsapp } : null,
      payload.telegram ? { label: 'Telegram', service: 'Telegram', username: payload.telegram } : null,
    ].filter(Boolean),
    [Contacts.Fields.Note]: payload.note,
  };
};
