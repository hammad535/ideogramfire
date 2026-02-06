// Validates Authorization Bearer token via Supabase; sets req.user on success, returns 401 JSON on fail.
const { supabaseAdmin } = require('../supabaseAdmin');

function generateRequestId() {
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
}

async function requireAuth(req, res, next) {
  // CORS preflight never sends Authorization; let it through so CORS middleware can respond
  if (req.method === 'OPTIONS') {
    return next();
  }

  const request_id = req.headers['x-request-id'] || generateRequestId();

  if (!supabaseAdmin) {
    return res.status(501).json({ error: 'Auth not configured', request_id });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized', request_id });
  }

  const token = authHeader.slice(7).trim();
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized', request_id });
  }

  try {
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !user) {
      return res.status(401).json({ error: 'Unauthorized', request_id });
    }
    req.user = { id: user.id, email: user.email ?? undefined };
    next();
  } catch (err) {
    console.error(`[${new Date().toISOString()}] requireAuth error:`, err.message);
    return res.status(401).json({ error: 'Unauthorized', request_id });
  }
}

module.exports = { requireAuth };
