import { createClient } from '@supabase/supabase-js';

const url = process.env.REACT_APP_SUPABASE_URL;
const anon = process.env.REACT_APP_SUPABASE_ANON_KEY;
export const isSupabaseConfigured = Boolean(url && anon);

// PART 4 — Use localStorage (not cookies) so auth tokens do not bloat request headers and cause 431
const supabase = isSupabaseConfigured
  ? createClient(url, anon, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        storage: window.localStorage,
      },
    })
  : null;

export { supabase };
