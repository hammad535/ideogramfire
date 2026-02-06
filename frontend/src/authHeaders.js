import { supabase } from './supabaseClient';

/**
 * Returns headers with Bearer token when user is logged in, else {}.
 * Use before /api/process, /api/generate, /api/export-zip, /api/clean-image.
 */
export async function getAuthHeaders() {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {};
}
