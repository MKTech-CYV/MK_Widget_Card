import { isSupabaseConfigured, supabase } from './supabaseClient';

export const fetchProfile = async (userId) => {
  if (!isSupabaseConfigured || !userId) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (error) throw error;
  return data || null;
};

export const updateProfileAvatar = async (userId, avatarUrl) => {
  if (!isSupabaseConfigured || !userId) return null;

  const { data, error } = await supabase
    .from('profiles')
    .upsert({ id: userId, avatar_url: avatarUrl }, { onConflict: 'id' })
    .select('*')
    .single();

  if (error) throw error;
  return data;
};
