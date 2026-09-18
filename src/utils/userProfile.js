const cleanText = (value) => `${value || ''}`.trim();

const makeInitials = (name, email) => {
  const source = cleanText(name) || cleanText(email).split('@')[0] || 'MK';
  const parts = source
    .replace(/[_\-.]+/g, ' ')
    .split(/\s+/)
    .filter(Boolean);

  if (!parts.length) return 'MK';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();

  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
};

const PROVIDER_LABELS = {
  'google.com': 'google',
  'apple.com': 'apple',
  password: 'email',
};

export const getUserProfile = (user, accountProfile = null) => {
  const email = cleanText(user?.email);
  const displayName = cleanText(user?.displayName) || cleanText(email.split('@')[0]) || 'MK eCard';
  const avatarUrl = cleanText(
    accountProfile?.avatar_url ||
    accountProfile?.avatarUrl ||
    user?.photoURL
  );
  const providerId = user?.providerData?.[0]?.providerId || 'password';
  const provider = PROVIDER_LABELS[providerId] || 'email';

  return {
    displayName,
    email,
    avatarUrl,
    initials: makeInitials(displayName, email),
    provider,
    shortId: user?.id ? `${user.id.slice(0, 8)}...${user.id.slice(-6)}` : '',
  };
};
