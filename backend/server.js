// Main Express server for IdeogramFIRE
// Load environment variables from root .env file
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const express = require('express');
const cors = require('cors');
const { requestId } = require('./middleware/requestId');

// Verify environment variables are loaded
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const IDEOGRAM_API_KEY = process.env.IDEOGRAM_API_KEY;
const PORT = process.env.PORT || 3000;

// Startup logging - verify API keys without exposing secrets
const startupTimestamp = new Date().toISOString();
console.log(`[${startupTimestamp}] ========== SERVER STARTUP ==========`);
console.log(`[${startupTimestamp}] Environment Configuration:`);
console.log(`[${startupTimestamp}]   - PORT: ${PORT}`);
console.log(`[${startupTimestamp}]   - OPENAI_API_KEY: ${OPENAI_API_KEY ? `✓ Loaded (${OPENAI_API_KEY.substring(0, 7)}...${OPENAI_API_KEY.substring(OPENAI_API_KEY.length - 4)})` : '✗ MISSING'}`);
console.log(`[${startupTimestamp}]   - IDEOGRAM_API_KEY: ${IDEOGRAM_API_KEY ? `✓ Loaded (${IDEOGRAM_API_KEY.substring(0, 7)}...${IDEOGRAM_API_KEY.substring(IDEOGRAM_API_KEY.length - 4)})` : '✗ MISSING'}`);

if (!OPENAI_API_KEY || !IDEOGRAM_API_KEY) {
  console.error(`[${startupTimestamp}] ========== CONFIGURATION ERROR ==========`);
  console.error(`[${startupTimestamp}] Missing required API keys. Server will start but API calls will fail.`);
  console.error(`[${startupTimestamp}] Please ensure .env file contains OPENAI_API_KEY and IDEOGRAM_API_KEY`);
} else {
  console.log(`[${startupTimestamp}] ✓ All API keys loaded successfully`);
}
console.log(`[${startupTimestamp}]   - SERVE_FRONTEND: ${process.env.SERVE_FRONTEND === 'true' ? 'true (serving frontend/build)' : 'false (API-only)'}`);
console.log(`[${startupTimestamp}] ===========================================`);

const app = express();

// Production: trust first proxy (X-Forwarded-* headers) when behind HTTPS/load balancer
app.set('trust proxy', 1);

// Request ID for error correlation (no secrets in response)
app.use(requestId);

// CORS: strict allowlist – dev: localhost:3001; prod: FRONTEND_ORIGIN (e.g. https://app.company.com)
const allowedOrigins = ['http://localhost:3001'];
if (process.env.FRONTEND_ORIGIN) allowedOrigins.push(process.env.FRONTEND_ORIGIN.trim());
app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true); // same-origin or non-browser
    if (allowedOrigins.includes(origin)) return cb(null, true);
    cb(null, false);
  },
  optionsSuccessStatus: 200
}));

// Body parsing with reasonable limit (upload size enforced by multer in routes)
const jsonLimit = process.env.JSON_BODY_LIMIT || '1mb';
app.use(express.json({ limit: jsonLimit }));
app.use(express.urlencoded({ extended: true, limit: jsonLimit }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Serve frontend only when SERVE_FRONTEND=true (e.g. local dev). On Render, use SERVE_FRONTEND=false for API-only.
const serveFrontend = process.env.SERVE_FRONTEND === 'true';
if (serveFrontend) {
  app.use(express.static(path.join(__dirname, '../frontend/build')));
}

// API routes (always mounted)
const apiRouter = require('./routes/api');
app.use('/api', apiRouter);

// Fallback: serve frontend SPA or API-only JSON
if (serveFrontend) {
  app.get('*', (req, res) => {
    console.log(`[${new Date().toISOString()}] Serving frontend for ${req.url}`);
    res.sendFile(path.join(__dirname, '../frontend/build/index.html'));
  });
} else {
  app.get('*', (req, res) => {
    res.json({ status: 'ok', service: 'backend', hint: 'use /api/*' });
  });
}

// Error handler: log full error server-side only; return safe JSON (no stack/secrets)
app.use((err, req, res, next) => {
  const requestId = req.id || `req-${Date.now()}`;
  console.error(`[${new Date().toISOString()}] ERROR request_id=${requestId}`, err.message || err);
  if (process.env.NODE_ENV !== 'production') console.error(err.stack);
  // Payload too large (multer LIMIT_FILE_SIZE)
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ error: 'File too large.', request_id: requestId });
  }
  res.status(500).json({ error: 'Internal server error.', request_id: requestId });
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

// Unhandled rejections/exceptions: log and exit so platform (Docker/App Platform) restarts the process
function onUncaught(err) {
  console.error('[FATAL] Uncaught exception:', err);
  process.exit(1);
}
function onUnhandledRejection(reason, p) {
  console.error('[FATAL] Unhandled rejection at:', p, 'reason:', reason);
  process.exit(1);
}
process.on('uncaughtException', onUncaught);
process.on('unhandledRejection', onUnhandledRejection); 