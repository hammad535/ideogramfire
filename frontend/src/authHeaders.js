import { supabase } from './supabaseClient';

export async function getAuthHeaders() {
  if (!supabase) return {};
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return {};
  return { Authorization: `Bearer ${session.access_token}` };
}
