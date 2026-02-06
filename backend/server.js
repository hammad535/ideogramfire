// Main Express server for IdeogramFIRE
// Load environment variables from root .env file
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const express = require('express');
const cors = require('cors');

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
console.log(`[${startupTimestamp}] ===========================================`);

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Serve static frontend
app.use(express.static(path.join(__dirname, '../frontend/build')));

// API routes
const apiRouter = require('./routes/api');
app.use('/api', apiRouter);

// Fallback to frontend for any other route
app.get('*', (req, res) => {
  console.log(`[${new Date().toISOString()}] Serving frontend for ${req.url}`);
  res.sendFile(path.join(__dirname, '../frontend/build/index.html'));
});

// Error logging middleware
app.use((err, req, res, next) => {
  console.error(`[${new Date().toISOString()}] ERROR:`, err);
  res.status(500).json({ error: 'Internal server error.' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
}); 