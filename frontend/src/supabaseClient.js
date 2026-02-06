import { createClient } from '@supabase/supabase-js';

// Create React App uses REACT_APP_* env vars (see frontend/.env)
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

let client = null;
if (isSupabaseConfigured) {
  client = createClient(supabaseUrl, supabaseAnonKey);
} else {
  console.warn('[Auth] Missing REACT_APP_SUPABASE_URL or REACT_APP_SUPABASE_ANON_KEY in frontend/.env. Auth is disabled.');
}

export const supabase = client;
