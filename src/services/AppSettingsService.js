import { isSupabaseConfigured, supabase } from './supabaseClient';
import { StorageService } from './StorageService';

export const DEFAULT_REMOTE_SETTINGS = {
  paymentEnabled: false,
  updatedAt: null,
};

const normalizeRemoteSettings = (row = {}) => ({
  paymentEnabled: row.payment_enabled !== false,
  updatedAt: row.updated_at || null,
});

export const getCachedRemoteSettings = async () => {
  StorageService.init();
  return await StorageService.getCachedRemoteSettings().catch(() => null);
};

export const fetchRemoteAppSettings = async () => {
  StorageService.init();

  if (!isSupabaseConfigured) {
    return (await getCachedRemoteSettings()) || DEFAULT_REMOTE_SETTINGS;
  }

  const { data, error } = await supabase
    .from('app_settings')
    .select('payment_enabled,updated_at')
    .eq('id', 1)
    .maybeSingle();

  if (error) throw error;

  const settings = data ? normalizeRemoteSettings(data) : DEFAULT_REMOTE_SETTINGS;
  await StorageService.setCachedRemoteSettings(settings).catch(() => null);
  return settings;
};
