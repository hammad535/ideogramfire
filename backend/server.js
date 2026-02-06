// Main Express server for IdeogramFIRE
// Load environment variables from root .env file
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const express = require('express');
const cors = require('cors');

// Verify environment variables (never log secret values)
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const IDEOGRAM_API_KEY = process.env.IDEOGRAM_API_KEY;
const PORT = process.env.PORT || 3000;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN;
const SERVE_FRONTEND = process.env.SERVE_FRONTEND === 'true';
const isProduction = process.env.NODE_ENV === 'production';

// Frontend build path and existence check
const frontendBuildPath = path.join(__dirname, '../frontend/build');
const frontendIndexPath = path.join(frontendBuildPath, 'index.html');
const hasFrontendBuild = fs.existsSync(frontendIndexPath);

// Startup: list which env vars are present (mask secrets)
const startupTimestamp = new Date().toISOString();
const mask = (v) => (v && v.length > 8 ? `${v.substring(0, 7)}...${v.slice(-4)}` : '(not set)');
console.log(`[${startupTimestamp}] ========== SERVER STARTUP ==========`);
console.log(`[${startupTimestamp}] Env (present/masked):`);
console.log(`[${startupTimestamp}]   - PORT: ${PORT || '(default 3000)'}`);
console.log(`[${startupTimestamp}]   - SERVE_FRONTEND: ${SERVE_FRONTEND}`);
console.log(`[${startupTimestamp}]   - OPENAI_API_KEY: ${OPENAI_API_KEY ? mask(OPENAI_API_KEY) : 'MISSING'}`);
console.log(`[${startupTimestamp}]   - IDEOGRAM_API_KEY: ${IDEOGRAM_API_KEY ? mask(IDEOGRAM_API_KEY) : 'MISSING'}`);
console.log(`[${startupTimestamp}]   - SUPABASE_URL: ${SUPABASE_URL ? '(set)' : 'MISSING'}`);
console.log(`[${startupTimestamp}]   - SUPABASE_SERVICE_ROLE_KEY: ${SUPABASE_SERVICE_ROLE_KEY ? '(set)' : 'MISSING'}`);
console.log(`[${startupTimestamp}]   - FRONTEND_ORIGIN: ${FRONTEND_ORIGIN || '(not set)'}`);
console.log(`[${startupTimestamp}]   - NODE_ENV: ${process.env.NODE_ENV || '(not set)'}`);

if (!OPENAI_API_KEY || !IDEOGRAM_API_KEY) {
  console.error(`[${startupTimestamp}] ========== CONFIGURATION ERROR ==========`);
  console.error(`[${startupTimestamp}] Missing OPENAI_API_KEY or IDEOGRAM_API_KEY. /api/process will return 500 until .env is set.`);
}
console.log(`[${startupTimestamp}] ===========================================`);

const app = express();

// CORS: production = frontend URL only; development = localhost. No-origin (Postman/curl) allowed.
function normalizeOrigin(origin) {
  if (!origin || typeof origin !== 'string') return null;
  return origin.replace(/\/+$/, '');
}
const productionAllowedOrigins = new Set(['https://ideogramfire.onrender.com']);
if (FRONTEND_ORIGIN) productionAllowedOrigins.add(normalizeOrigin(FRONTEND_ORIGIN));

const devOrigins = new Set([
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:3002',
  'http://localhost:5173',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:3001',
  'http://127.0.0.1:3002',
  'http://127.0.0.1:5173',
]);
if (FRONTEND_ORIGIN) devOrigins.add(normalizeOrigin(FRONTEND_ORIGIN));

app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true); // Postman, curl, same-origin
    const normalized = normalizeOrigin(origin);
    if (isProduction) {
      if (productionAllowedOrigins.has(normalized)) return cb(null, true);
      console.error(`[CORS] Blocked origin (production): ${origin}`);
      return cb(new Error('Not allowed by CORS'));
    }
    if (devOrigins.has(normalized)) return cb(null, true);
    console.error(`[CORS] Blocked origin (development): ${origin}`);
    return cb(new Error('Not allowed by CORS'));
  },
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// API routes
const apiRouter = require('./routes/api');
app.use('/api', apiRouter);

// SERVE_FRONTEND: only serve static + SPA fallback when true and build exists
if (SERVE_FRONTEND && hasFrontendBuild) {
  app.use(express.static(frontendBuildPath));
  app.get('*', (req, res) => {
    console.log(`[${new Date().toISOString()}] Serving frontend for ${req.url}`);
    res.sendFile(frontendIndexPath);
  });
} else {
  // API-only mode: GET / and unknown routes return JSON
  app.get('/', (req, res) => {
    res.json({ status: 'ok', mode: 'api-only' });
  });
  app.use((req, res) => {
    res.status(404).json({ error: 'Not found', path: req.path });
  });
}

// Error handler: CORS -> 403; others -> 500; log stack server-side only
function generateRequestId() {
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
}
app.use((err, req, res, next) => {
  console.error(`[${new Date().toISOString()}] ERROR:`, err.message || err);
  if (err.stack) console.error(err.stack);
  if (res.headersSent) return;
  const request_id = req.headers['x-request-id'] || generateRequestId();
  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({ error: 'Not allowed by CORS', request_id });
  }
  res.status(500).json({ error: 'Internal server error.', request_id });
});

// Start server (Render sets PORT; listen on 0.0.0.0 for cloud)
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT} (NODE_ENV=${process.env.NODE_ENV || 'undefined'})`);
});
