const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { requireAuth } = require('../middleware/requireAuth');
const { rateLimitByUser } = require('../middleware/rateLimit');
const { processImageAndPrompt, exportZipFromUrls, serveCleanedImage } = require('../controllers/processController');

// Upload limit from env (default 5MB); reject oversized with 413
const MAX_UPLOAD_MB = Number(process.env.MAX_UPLOAD_MB) || 5;
const maxFileSize = MAX_UPLOAD_MB * 1024 * 1024;

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: maxFileSize },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed (PNG, JPG, JPEG, GIF, WEBP).'));
    }
  }
});

// Multer LIMIT_FILE_SIZE is handled in server.js error middleware (413).

// Shared handler for generation (used by both /process and /generate).
// Must await the async controller so the response is sent before the request chain ends.
const generationHandler = async (req, res, next) => {
  const route = req.path || req.originalUrl?.split('?')[0] || 'unknown';
  console.log(`[${new Date().toISOString()}] ${route} called user_id=${req.user?.id}`);
  if (req.file) {
    console.log(`Uploaded file: name=${req.file.originalname}, type=${req.file.mimetype}, size=${req.file.size}`);
  }
  try {
    await processImageAndPrompt(req, res);
  } catch (err) {
    next(err);
  }
};

// Protected routes: requireAuth → rateLimitByUser (per user_id)
// POST /api/process (protected)
router.post('/process', requireAuth, rateLimitByUser, upload.single('image'), generationHandler);

// POST /api/generate (protected – same as /process)
router.post('/generate', requireAuth, rateLimitByUser, upload.single('image'), generationHandler);

// POST /api/export-zip (protected)
router.post('/export-zip', requireAuth, rateLimitByUser, exportZipFromUrls);

// GET /api/clean-image (protected) - Serve image with metadata stripped
router.get('/clean-image', requireAuth, rateLimitByUser, serveCleanedImage);

// GET /api/health - Production-ready: { status: "ok" }, uptime, optional dependency checks (no secrets)
router.get('/health', (req, res) => {
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
  const IDEOGRAM_API_KEY = process.env.IDEOGRAM_API_KEY;
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime_seconds: Math.floor(process.uptime()),
    dependencies: {
      openai: !!OPENAI_API_KEY,
      ideogram: !!IDEOGRAM_API_KEY
    },
    port: process.env.PORT || 3000
  });
});

module.exports = router; 