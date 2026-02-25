// Main Express server for IdeogramFIRE
// Load environment variables from root .env file
const path = require('path');
const fs = require('fs');
const http = require('http');
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

/*
 * PART 5 — Optional: clear excessive localhost cookies (run in browser DevTools Console if 431 persists).
 * Do NOT auto-delete in app code; use only for one-time cleanup.
 *
 * document.cookie.split(';').forEach(c => {
 *   const name = c.split('=')[0].trim();
 *   document.cookie = name + '=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/';
 * });
 * // For a specific origin:
 * document.cookie.split(';').forEach(c => {
 *   const name = c.split('=')[0].trim();
 *   document.cookie = name + '=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=localhost';
 * });
 */

const app = express();

// CORS: allow credentials without cookie bloat from strict origin rejection
// (Reflect request origin; avoids duplicate/invalid cookies on localhost.)
app.use(cors({
  origin: true,
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// PART 3 — Log request header size when > 8KB (debugging; no sensitive values)
const HEADER_SIZE_WARN_THRESHOLD = 8 * 1024;
app.use((req, res, next) => {
  const raw = req.rawHeaders;
  if (raw && raw.length) {
    let approx = 0;
    for (let i = 0; i < raw.length; i++) approx += (raw[i] && raw[i].length) || 0;
    if (approx > HEADER_SIZE_WARN_THRESHOLD) {
      console.warn(`[${new Date().toISOString()}] Large headers: ~${Math.round(approx / 1024)}KB for ${req.method} ${req.url}`);
    }
  }
  next();
});

// Request logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// API routes
const apiRouter = require('./routes/api');
app.use('/api', apiRouter);

// Video segment routes (ESM, auth-protected)
const { requireAuth } = require('./middleware/requireAuth');

async function mountVideoSegmentRoutes() {
  const { default: generateRoute } = await import('./api/videoSegments/generate.js');
  const { default: generateContinuationRoute } = await import('./api/videoSegments/generateContinuation.js');
  const { default: generatePlusRoute } = await import('./api/videoSegments/generate.plus.js');
  const { default: generateNewContRoute } = await import('./api/videoSegments/generate.newcont.js');
  app.use('/api/video-segments', requireAuth, generateRoute);
  app.use('/api/video-segments', requireAuth, generateContinuationRoute);
  app.use('/api/video-segments', requireAuth, generatePlusRoute);
  app.use('/api/video-segments', requireAuth, generateNewContRoute);
  console.log(`[${new Date().toISOString()}] Video segment routes mounted at /api/video-segments`);
}

// Error handler: CORS -> 403; others -> 500; log stack server-side only
function generateRequestId() {
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
}

// Mount video segment routes then static/404 and start server
mountVideoSegmentRoutes()
  .then(() => {
    if (SERVE_FRONTEND && hasFrontendBuild) {
      app.use(express.static(frontendBuildPath));
      app.get('*', (req, res) => {
        console.log(`[${new Date().toISOString()}] Serving frontend for ${req.url}`);
        res.sendFile(frontendIndexPath);
      });
    } else {
      app.get('/', (req, res) => {
        res.json({ status: 'ok', mode: 'api-only' });
      });
      app.use((req, res) => {
        res.status(404).json({ error: 'Not found', path: req.path });
      });
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
    // PART 1 — Allow larger headers (avoids 431). In-code: maxHeaderSize below.
    // Safe CLI start: node --max-http-header-size=65536 server.js
    const server = http.createServer(
      { maxHeaderSize: 65536 },
      app
    );
    let triedFallback = false;
    function tryListen(port) {
      server.listen(port, '0.0.0.0', () => {
        console.log(`Server running on port ${port} (NODE_ENV=${process.env.NODE_ENV || 'undefined'})`);
      });
    }
    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE' && !triedFallback) {
        triedFallback = true;
        const nextPort = (parseInt(PORT, 10) || 3000) + 1;
        console.warn(`[${new Date().toISOString()}] Port ${PORT} in use, trying ${nextPort}...`);
        tryListen(nextPort);
      } else {
        console.error(err);
        process.exit(1);
      }
    });
    tryListen(PORT);
  })
  .catch((err) => {
    console.error('Failed to mount video segment routes:', err);
    process.exit(1);
  });
