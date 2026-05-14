import 'react-native-url-polyfill/auto';
import { AppState, Platform } from 'react-native';
import DefaultPreference from 'react-native-default-preference';
import { createClient, processLock } from '@supabase/supabase-js';

export const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
export const supabasePublishableKey =
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
export const supabaseAnonKey =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
export const supabaseKey = supabasePublishableKey || supabaseAnonKey;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseKey);

const nativeStorage = {
  getItem: (key) => DefaultPreference.get(key),
  setItem: (key, value) => DefaultPreference.set(key, value),
  removeItem: (key) => DefaultPreference.clear(key),
};

export const supabase = createClient(
  supabaseUrl || 'https://example.supabase.co',
  supabaseKey || 'missing-key',
  {
    auth: {
      ...(Platform.OS !== 'web' ? { storage: nativeStorage } : {}),
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
      lock: processLock,
      flowType: 'pkce',
    },
  }
);

if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') {
      supabase.auth.startAutoRefresh();
    } else {
      supabase.auth.stopAutoRefresh();
    }
  });
}
