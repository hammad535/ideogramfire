const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { processImageAndPrompt, exportZipFromUrls, serveCleanedImage } = require('../controllers/processController');
const { requireAuth } = require('../middleware/requireAuth');

// Multer config for file upload validation
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed (PNG, JPG, JPEG, GIF, WEBP).'));
    }
  }
});

// POST /api/process (protected)
router.post('/process', requireAuth, upload.single('image'), (req, res, next) => {
  console.log(`[${new Date().toISOString()}] /api/process called`);
  if (req.file) {
    console.log(`Uploaded file: name=${req.file.originalname}, type=${req.file.mimetype}, size=${req.file.size}`);
  }
  processImageAndPrompt(req, res, next);
});

// POST /api/export-zip (protected)
router.post('/export-zip', requireAuth, exportZipFromUrls);

// GET /api/clean-image (protected) - Serve image with metadata stripped
router.get('/clean-image', requireAuth, serveCleanedImage);

// GET /api/health - Health check endpoint to verify API keys are loaded
router.get('/health', (req, res) => {
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
  const IDEOGRAM_API_KEY = process.env.IDEOGRAM_API_KEY;
  
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    apiKeys: {
      openai: OPENAI_API_KEY ? `Loaded (${OPENAI_API_KEY.substring(0, 7)}...${OPENAI_API_KEY.substring(OPENAI_API_KEY.length - 4)})` : 'Missing',
      ideogram: IDEOGRAM_API_KEY ? `Loaded (${IDEOGRAM_API_KEY.substring(0, 7)}...${IDEOGRAM_API_KEY.substring(IDEOGRAM_API_KEY.length - 4)})` : 'Missing',
      allLoaded: !!(OPENAI_API_KEY && IDEOGRAM_API_KEY)
    },
    port: process.env.PORT || 3000
  });
});

module.exports = router; 