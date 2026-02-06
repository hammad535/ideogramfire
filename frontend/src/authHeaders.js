import { supabase } from './supabaseClient';

export async function getAuthHeaders() {
  if (!supabase) return {};
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}
