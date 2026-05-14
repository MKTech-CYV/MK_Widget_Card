const cleanText = (value) => `${value || ''}`.trim();

const getIdentityData = (user) => {
  const identity = Array.isArray(user?.identities) ? user.identities[0] : null;
  return identity?.identity_data || {};
};

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

export const getUserProfile = (user) => {
  const metadata = user?.user_metadata || {};
  const identityData = getIdentityData(user);
  const email = cleanText(user?.email || metadata.email || identityData.email);
  const displayName = cleanText(
    metadata.full_name ||
    metadata.name ||
    metadata.display_name ||
    identityData.full_name ||
    identityData.name ||
    identityData.display_name
  ) || cleanText(email.split('@')[0]) || 'MK eCard';
  const avatarUrl = cleanText(
    metadata.avatar_url ||
    metadata.picture ||
    identityData.avatar_url ||
    identityData.picture
  );
  const provider = cleanText(user?.app_metadata?.provider || user?.identities?.[0]?.provider || 'email');

  return {
    displayName,
    email,
    avatarUrl,
    initials: makeInitials(displayName, email),
    provider,
    shortId: user?.id ? `${user.id.slice(0, 8)}...${user.id.slice(-6)}` : '',
  };
};
