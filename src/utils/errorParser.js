const NETWORK_REGEX = /(network|failed to fetch|request to .* failed|offline|internet)/i;

export const isNetworkError = (error) => {
  if (!error) return false;
  const message = `${error?.message || error || ''}`;
  return NETWORK_REGEX.test(message);
};

export const getFriendlyErrorMessage = (error) => {
  if (!error) return '';
  const message = `${error?.message || error || ''}`.trim();
  if (!message) return '';
  if (isNetworkError(error)) {
    return 'Không có kết nối mạng. Vui lòng kiểm tra kết nối Internet.';
  }
  return message;
};
