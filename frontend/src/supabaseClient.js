import { createClient } from '@supabase/supabase-js';

export const isSupabaseConfigured = Boolean(
  process.env.REACT_APP_SUPABASE_URL && process.env.REACT_APP_SUPABASE_ANON_KEY
);

const supabase = isSupabaseConfigured
  ? createClient(
      process.env.REACT_APP_SUPABASE_URL,
      process.env.REACT_APP_SUPABASE_ANON_KEY
    )
  : null;

export { supabase };
