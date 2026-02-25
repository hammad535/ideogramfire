import express from 'express';
import OpenAIService from './services/openaiService.js';

const router = express.Router();

router.post('/generate-new-cont', async (req, res) => {
  console.log('[VideoSegments NewCont] Request received:', {
    bodyKeys: Object.keys(req.body),
    scriptLength: req.body.script?.length || 0,
  });

  if (!process.env.OPENAI_API_KEY || !process.env.OPENAI_API_KEY.trim()) {
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
      accentRegion,
      useAnimalAvatar = false,
      animalPreset,
      animalVoiceStyle,
      anthropomorphic = false
    } = req.body;

    if (!script || script.trim().length < 50) {
      return res.status(400).json({ error: 'Script must be at least 50 characters long' });
    }

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
      accentRegion,
    };

    if (useAnimalAvatar) {
      params.avatarMode = 'animal';
      params.animal = {
        species: animalPreset,
        voiceStyle: animalVoiceStyle || 'narrator',
        anthropomorphic: !!anthropomorphic,
      };
      params.ageRange = params.ageRange || 'N/A';
      params.gender = params.gender || 'N/A';
    }

    const result = await OpenAIService.generateSegmentsWithVoiceProfile(params);

    res.json({
      success: true,
      segments: result.segments,
      metadata: result.metadata,
      voiceProfile: result.voiceProfile,
    });
  } catch (error) {
    console.error('[VideoSegments NewCont] Error:', error);
    res.status(500).json({ error: 'Failed to generate new continuation segments', message: error.message });
  }
});

export default router;
