const { supabaseAdmin } = require('../supabaseAdmin');

async function requireAuth(req, res, next) {
  const route = req.path || req.originalUrl?.split('?')[0] || 'unknown';
  const timestamp = new Date().toISOString();

  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  const requestId = req.id || `req-${Date.now()}`;
  const safe401 = (msg) => res.status(401).json({ error: msg || 'Unauthorized', request_id: requestId });
  const safe503 = () => res.status(503).json({ error: 'Service unavailable', request_id: requestId });

  if (!token) {
    console.log(`[${timestamp}] requireAuth failure route=${route} reason=missing_token`);
    return safe401('Missing or invalid token');
  }

  if (!supabaseAdmin) {
    console.log(`[${timestamp}] requireAuth failure route=${route} reason=supabase_not_configured`);
    return safe503();
  }

  try {
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !user) {
      console.log(`[${timestamp}] requireAuth failure route=${route} reason=invalid_token`);
      return safe401('Invalid or expired token');
    }
    req.user = { id: user.id, email: user.email ?? null };
    console.log(`[${timestamp}] requireAuth success user_id=${req.user.id} route=${route}`);
    next();
  } catch (err) {
    console.error(`[${timestamp}] requireAuth error route=${route}`, err.message);
    return safe401('Invalid or expired token');
  }
}

module.exports = { requireAuth };
