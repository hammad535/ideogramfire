import express from 'express';
import OpenAIService from './services/openaiService.js';
import archiver from 'archiver';

const router = express.Router();

router.post('/generate', async (req, res) => {
  console.log('[VideoSegments Generate] Request received:', {
    bodyKeys: Object.keys(req.body),
    scriptLength: req.body.script?.length || 0
  });

  if (!process.env.OPENAI_API_KEY || !process.env.OPENAI_API_KEY.trim()) {
    console.log('[VideoSegments Generate] Rejected: OPENAI_API_KEY not set');
    return res.status(503).json({
      error: 'OpenAI is not configured',
      message: 'Set OPENAI_API_KEY in .env to use segment generation'
    });
  }

  try {
    const {
      script,
      ageRange,
      gender,
      product,
      room,
      style,
      jsonFormat = 'standard',
      continuationMode = false,
      voiceType,
      energyLevel,
      settingMode = 'single',
      locations = [],
      cameraStyle,
      timeOfDay,
      backgroundLife,
      productStyle,
      energyArc,
      narrativeStyle,
      ethnicity,
      characterFeatures,
      clothingDetails,
      accentRegion
    } = req.body;

    if (!script || script.trim().length < 50) {
      console.log('[VideoSegments Generate] Validation failed: Script too short');
      return res.status(400).json({
        error: 'Script must be at least 50 characters long'
      });
    }

    console.log('[VideoSegments Generate] Starting OpenAI generation with:', {
      ageRange,
      gender,
      product,
      room,
      style,
      jsonFormat,
      continuationMode,
      settingMode,
      scriptWords: script.trim().split(/\s+/).length
    });

    const params = {
      script: script.trim(),
      ageRange,
      gender,
      product,
      room,
      style,
      jsonFormat,
      voiceType,
      energyLevel,
      settingMode,
      locations,
      cameraStyle,
      timeOfDay,
      backgroundLife,
      productStyle,
      energyArc,
      narrativeStyle,
      ethnicity,
      characterFeatures,
      clothingDetails,
      accentRegion
    };

    const result = continuationMode
      ? await OpenAIService.generateSegmentsWithVoiceProfile(params)
      : await OpenAIService.generateSegments(params);

    console.log('[VideoSegments Generate] Success:', {
      segments: result.segments.length,
      characterId: result.metadata.characterId,
      hasVoiceProfile: !!result.voiceProfile
    });

    res.json({
      success: true,
      segments: result.segments,
      metadata: result.metadata,
      voiceProfile: result.voiceProfile
    });
  } catch (error) {
    console.error('[VideoSegments Generate] Error:', {
      message: error.message,
      stack: error.stack,
      response: error.response?.data
    });
    res.status(500).json({
      error: 'Failed to generate segments',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.response?.data : undefined
    });
  }
});

router.post('/download', async (req, res) => {
  try {
    const { segments } = req.body;

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename=veo3-segments.zip');

    const archive = archiver('zip', { zlib: { level: 9 } });
    archive.pipe(res);

    segments.forEach((segment, index) => {
      archive.append(JSON.stringify(segment, null, 2), {
        name: `segment_${(index + 1).toString().padStart(2, '0')}.json`
      });
    });

    archive.append('Instructions for Veo 3:\n1. Upload each JSON in order\n2. Generate 8-second clips\n3. Edit together with overlaps', {
      name: 'README.txt'
    });

    archive.finalize();
  } catch (error) {
    console.error('[VideoSegments] Download error:', error);
    res.status(500).json({ error: 'Failed to create download' });
  }
});

export default router;
