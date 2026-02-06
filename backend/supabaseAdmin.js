// Backend-only Supabase admin client for token verification.
// Reads SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY from process.env only. Never log or expose the service key.
const { createClient } = require('@supabase/supabase-js');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

let supabaseAdmin = null;
if (supabaseUrl && serviceRoleKey) {
  supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false }
  });
}

module.exports = { supabaseAdmin };
