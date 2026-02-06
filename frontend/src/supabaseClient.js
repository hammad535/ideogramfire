import { createClient } from '@supabase/supabase-js';

const url = process.env.REACT_APP_SUPABASE_URL;
const anon = process.env.REACT_APP_SUPABASE_ANON_KEY;
export const isSupabaseConfigured = Boolean(url && anon);

const supabase = isSupabaseConfigured ? createClient(url, anon) : null;

export { supabase };
