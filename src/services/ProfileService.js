import { isSupabaseConfigured, supabase } from './supabaseClient';
import { deleteStorageFile, parseStoragePathFromPublicUrl } from './SupabaseStorageService';

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

  const previousProfile = await fetchProfile(userId).catch(() => null);
  const { data, error } = await supabase
    .from('profiles')
    .upsert({ id: userId, avatar_url: avatarUrl }, { onConflict: 'id' })
    .select('*')
    .single();

  if (error) throw error;

  const previousPath = parseStoragePathFromPublicUrl(previousProfile?.avatar_url, 'avatars');
  const nextPath = parseStoragePathFromPublicUrl(avatarUrl, 'avatars');
  if (previousPath?.bucket === 'avatars' && previousPath.path && previousPath.path !== nextPath?.path) {
    await deleteStorageFile(previousPath).catch(() => null);
  }

  return data;
};
