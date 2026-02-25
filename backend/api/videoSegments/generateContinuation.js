import express from 'express';
import openaiService from './services/openaiService.js';

const router = express.Router();

router.post('/generate-continuation', async (req, res) => {
  console.log('[VideoSegments API] /generate-continuation called');

  if (!process.env.OPENAI_API_KEY || !process.env.OPENAI_API_KEY.trim()) {
    return res.status(503).json({
      error: 'OpenAI is not configured',
      message: 'Set OPENAI_API_KEY in .env to use continuation generation'
    });
  }

  try {
    const { imageUrl, script, voiceProfile, previousSegment, maintainEnergy, product } = req.body;

    if (!imageUrl || !script || !voiceProfile || !product) {
      return res.status(400).json({
        error: 'Missing required fields: imageUrl, script, voiceProfile, and product are required'
      });
    }

    console.log('[VideoSegments API] Generating continuation for:', {
      imageUrl,
      scriptLength: script.length,
      hasVoiceProfile: !!voiceProfile,
      hasPreviousSegment: !!previousSegment,
      product
    });

    const segment = await openaiService.generateContinuationSegment({
      imageUrl,
      script,
      voiceProfile,
      previousSegment,
      maintainEnergy,
      product
    });

    console.log('[VideoSegments API] Continuation segment generated successfully');

    res.json({
      success: true,
      segment
    });
  } catch (error) {
    console.error('[VideoSegments API] Continuation generation error:', error);
    res.status(500).json({
      error: 'Failed to generate continuation',
      message: error.message
    });
  }
});

export default router;
