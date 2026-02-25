import OpenAI from 'openai';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Instructions path: from api/videoSegments/services, project root is ../../../../ 
const INSTRUCTIONS_DIR = path.join(__dirname, '../../../../instructions');

class OpenAIService {
  constructor() {
    const key = process.env.OPENAI_API_KEY?.trim();
    this.openai = key ? new OpenAI({ apiKey: key }) : null;
    this.templateInstructions = null;
  }

  get client() {
    if (!this.openai) {
      throw new Error('OPENAI_API_KEY is not set. Add it to .env to use segment generation.');
    }
    return this.openai;
  }

  async loadTemplate(format = 'standard') {
    const filename = format === 'enhanced'
      ? 'veo3-enhanced-continuity.md'
      : 'veo3-json-guidelines.md';
    const templatePath = path.join(INSTRUCTIONS_DIR, filename);
    console.log(`[OpenAI] Loading template: ${filename}`);
    return await fs.readFile(templatePath, 'utf8');
  }

  async generateSegments(params) {
    console.log('[OpenAI] Starting generation with format:', params.jsonFormat || 'standard');
    console.log('[OpenAI] Setting mode:', params.settingMode || 'single');
    const template = await this.loadTemplate(params.jsonFormat);
    const scriptSegments = await this.splitScript(params.script);
    console.log('[OpenAI] Script split into', scriptSegments.length, 'segments');
    let locations = [];
    if (params.settingMode === 'single') {
      locations = Array(scriptSegments.length).fill(params.room);
    } else {
      locations = params.locations || [];
      while (locations.length < scriptSegments.length) {
        locations.push(locations[locations.length - 1] || 'living room');
      }
    }
    console.log('[OpenAI] Generating base descriptions...');
    const baseDescriptions = await this.generateBaseDescriptions(params, template);
    console.log('[OpenAI] Base descriptions generated');
    const segments = [];
    console.log('[OpenAI] Generating individual segments...');
    for (let i = 0; i < scriptSegments.length; i++) {
      console.log(`[OpenAI] Generating segment ${i + 1}/${scriptSegments.length}`);
      const segment = await this.generateSegment({
        segmentNumber: i + 1,
        totalSegments: scriptSegments.length,
        scriptPart: scriptSegments[i],
        baseDescriptions,
        previousSegment: segments[i - 1] || null,
        template,
        currentLocation: locations[i],
        previousLocation: i > 0 ? locations[i - 1] : null,
        nextLocation: i < locations.length - 1 ? locations[i + 1] : null,
        ...params
      });
      segments.push(segment);
    }
    return {
      segments,
      metadata: {
        totalSegments: segments.length,
        estimatedDuration: segments.length * 8,
        characterId: this.generateCharacterId(params)
      }
    };
  }

  async splitScript(script) {
    const wordsPerSecond = 150 / 60;
    const minWordsFor6Seconds = 15;
    const targetWordsFor8Seconds = 20;
    const maxWordsFor8Seconds = 22;
    const sentences = script.match(/[^.!?]+[.!?]+/g) || [script];
    const rawSegments = [];
    let currentSegment = '';
    let currentWordCount = 0;
    for (let i = 0; i < sentences.length; i++) {
      const sentence = sentences[i].trim();
      const sentenceWords = sentence.split(/\s+/).length;
      if (currentSegment === '') {
        currentSegment = sentence;
        currentWordCount = sentenceWords;
        while (currentWordCount < minWordsFor6Seconds && i + 1 < sentences.length) {
          i++;
          const nextSentence = sentences[i].trim();
          const nextWords = nextSentence.split(/\s+/).length;
          if (currentWordCount + nextWords > maxWordsFor8Seconds) {
            if (currentWordCount < minWordsFor6Seconds) {
              currentSegment += ' ' + nextSentence;
              currentWordCount += nextWords;
            } else {
              i--;
              break;
            }
          } else {
            currentSegment += ' ' + nextSentence;
            currentWordCount += nextWords;
          }
        }
        rawSegments.push(currentSegment);
        currentSegment = '';
        currentWordCount = 0;
      }
    }
    const finalSegments = [];
    for (let i = 0; i < rawSegments.length; i++) {
      const segment = rawSegments[i];
      const wordCount = segment.split(/\s+/).length;
      if (wordCount < minWordsFor6Seconds && i < rawSegments.length - 1) {
        const nextSegment = rawSegments[i + 1];
        const nextWords = nextSegment.split(/\s+/).length;
        if (nextWords > minWordsFor6Seconds) {
          const nextSentences = nextSegment.match(/[^.!?]+[.!?]+/g) || [nextSegment];
          if (nextSentences.length > 1) {
            const borrowedSentence = nextSentences[0];
            const borrowedWords = borrowedSentence.split(/\s+/).length;
            if (wordCount + borrowedWords <= maxWordsFor8Seconds) {
              finalSegments.push(segment + ' ' + borrowedSentence);
              rawSegments[i + 1] = nextSentences.slice(1).join(' ');
              continue;
            }
          }
        }
        if (i < rawSegments.length - 1) {
          const merged = segment + ' ' + rawSegments[i + 1];
          const mergedWords = merged.split(/\s+/).length;
          if (mergedWords <= 30) {
            finalSegments.push(merged);
            i++;
            continue;
          }
        }
      }
      finalSegments.push(segment);
    }
    return finalSegments;
  }

  async generateBaseDescriptions(params, template) {
    const isEnhanced = params.jsonFormat === 'enhanced';
    const response = await this.client.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: `${template}\n\nGenerate the base descriptions that will remain IDENTICAL across all segments. Follow the exact word count requirements. Return ONLY valid JSON.` },
        { role: "user", content: `Create base descriptions for:\n${params.avatarMode === 'animal' ? `Avatar: ANIMAL\nSpecies: ${params.animal?.species}\nAnthropomorphic: ${params.animal?.anthropomorphic ? 'Yes' : 'No'}\nVoice Style: ${params.animal?.voiceStyle || 'narrator'}` : `Age: ${params.ageRange}\nGender: ${params.gender}`}\nSetting Mode: ${params.settingMode || 'single'}\n${params.settingMode === 'single' ? `Room: ${params.room}` : `Locations: ${params.locations?.join(', ') || 'various'}`}\nStyle: ${params.style}\nProduct: ${params.product}\nCamera Style: ${params.cameraStyle || 'static-handheld'}\nTime of Day: ${params.timeOfDay || 'morning'}\nBackground Life: ${params.backgroundLife ? 'Yes' : 'No'}\nProduct Display: ${params.productStyle || 'natural'}\nEnergy Arc: ${params.energyArc || 'consistent'}\nNarrative Style: ${params.narrativeStyle || 'direct-review'}\n\nReturn a JSON object with these exact keys:\n${params.avatarMode === 'animal' ? `{"animal_physical":"[180+ words]","animal_behavior":"[150+ words]","animal_voice":"[120+ words]","lip_sync_baseline":"[100+ words]","realism_rendering":"[120+ words]","environment":"[${isEnhanced ? '250+' : '150+'} words]","productHandling":"[50+ words]"}` : `{"physical":"[${isEnhanced ? '200+' : '100+'} words]","clothing":"[${isEnhanced ? '150+' : '100+'} words]","environment":"[${isEnhanced ? '250+' : '150+'} words]","voice":"[${isEnhanced ? '100+' : '50+'} words]","productHandling":"[50+ words]"}`}\n\nThese descriptions must be detailed enough to use word-for-word across all segments.` }
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
      max_tokens: 4500
    });
    return JSON.parse(response.choices[0].message.content);
  }

  async generateSegment(params) {
    const isEnhanced = params.jsonFormat === 'enhanced';
    const response = await this.client.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: `${params.template}\n\nGenerate a Veo 3 JSON segment following the exact structure. Use the provided base descriptions WORD-FOR-WORD.` },
        { role: "user", content: `Create segment ${params.segmentNumber} of ${params.totalSegments}:\n\nDialogue for this segment: "${params.scriptPart}"\nProduct: ${params.product}\nCurrent Location: ${params.currentLocation}\n${params.previousLocation && params.previousLocation !== params.currentLocation ? `Character just moved from: ${params.previousLocation}` : ''}\n${params.nextLocation && params.nextLocation !== params.currentLocation ? `Character will move to: ${params.nextLocation}` : ''}\n\nVisual Settings:\n- Camera Style: ${params.cameraStyle || 'static-handheld'}\n- Time of Day: ${params.timeOfDay || 'morning'}\n- Background Life: ${params.backgroundLife ? 'Include subtle background activity' : 'Focus only on character'}\n- Energy Level: ${this.getEnergyLevel(params.energyArc, params.segmentNumber, params.totalSegments)}\n\nBase Descriptions (USE EXACTLY AS PROVIDED):\n${params.avatarMode === 'animal' ? `Animal Physical: ${params.baseDescriptions.animal_physical}\nAnimal Behavior: ${params.baseDescriptions.animal_behavior}\nAnimal Voice: ${params.baseDescriptions.animal_voice}\nLip-Sync Baseline: ${params.baseDescriptions.lip_sync_baseline}` : `Physical: ${params.baseDescriptions.physical}\nClothing: ${params.baseDescriptions.clothing}\nBase Voice: ${params.baseDescriptions.voice}`}\nGeneral Environment: ${params.baseDescriptions.environment}\nProduct Handling: ${params.baseDescriptions.productHandling || 'Natural handling'}\n\n${params.previousSegment ? `Previous segment ended with:\nPosition: ${params.previousSegment.action_timeline.transition_prep}` : 'This is the opening segment.'}\n\nGenerate the complete JSON with:\n1. segment_info (${isEnhanced ? 'with continuity_markers' : 'with overlap instructions'})\n2. character_description\n3. scene_continuity\n4. action_timeline (${isEnhanced ? 'with synchronized_actions, micro_expressions, breathing_rhythm' : 'synchronized with dialogue'})\n5. Include natural movement/transition if location changes` }
      ],
      response_format: { type: "json_object" },
      temperature: 0.5,
      max_tokens: 4500
    });
    return JSON.parse(response.choices[0].message.content);
  }

  generateCharacterId(params) {
    return `${(params.avatarMode === 'animal' ? params.animal?.species : 'human')}_${params.gender || 'N/A'}_${params.ageRange || 'N/A'}_${Date.now()}`.replace(/\s+/g, '_');
  }

  async generateSegmentsWithVoiceProfile(params) {
    const firstSegmentParams = { ...params, jsonFormat: 'enhanced' };
    const template = await this.loadTemplate('enhanced');
    const scriptSegments = await this.splitScript(params.script);
    let locations = [];
    if (params.settingMode === 'single') {
      locations = Array(scriptSegments.length).fill(params.room);
    } else {
      locations = params.locations || [];
      while (locations.length < scriptSegments.length) {
        locations.push(locations[locations.length - 1] || 'living room');
      }
    }
    const baseDescriptions = await this.generateBaseDescriptions(firstSegmentParams, template);
    const firstSegment = await this.generateSegment({
      segmentNumber: 1,
      totalSegments: scriptSegments.length,
      scriptPart: scriptSegments[0],
      baseDescriptions,
      previousSegment: null,
      template,
      currentLocation: locations[0],
      previousLocation: null,
      nextLocation: locations.length > 1 ? locations[1] : null,
      ...firstSegmentParams
    });
    const voiceProfile = await this.extractDetailedVoiceProfile(firstSegment, params);
    const segments = [firstSegment];
    for (let i = 1; i < scriptSegments.length; i++) {
      const segment = await this.generateContinuationStyleSegment({
        segmentNumber: i + 1,
        totalSegments: scriptSegments.length,
        scriptPart: scriptSegments[i],
        baseDescriptions,
        previousSegment: segments[i - 1],
        voiceProfile,
        currentLocation: locations[i],
        previousLocation: i > 0 ? locations[i - 1] : null,
        nextLocation: i < locations.length - 1 ? locations[i + 1] : null,
        ...params
      });
      segments.push(segment);
    }
    return {
      segments,
      metadata: {
        totalSegments: segments.length,
        estimatedDuration: segments.length * 8,
        characterId: this.generateCharacterId(params)
      },
      voiceProfile
    };
  }

  async extractDetailedVoiceProfile(segment, params) {
    const voiceProfile = {
      baseVoice: segment.character_description?.voice_matching || '',
      technical: { pitch: '165-185 Hz', rate: '145-150 wpm', tone: 'warm alto with bright overtones', breathPattern: 'natural pauses between phrases', emphasis: 'slight volume increase on key words' },
      personality: { voiceType: params.voiceType || 'warm-friendly', energyLevel: params.energyLevel || '80', naturalQualities: [] },
      continuityMarkers: { sentenceEndings: 'slight downward inflection', excitement: 'pitch rises 10-15 Hz', productMention: 'slower pace, clearer articulation' }
    };
    try {
      const response = await this.client.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: "Generate detailed voice continuity profile for video consistency. Be extremely specific about vocal qualities. Allow animal narrator styles when avatarMode=animal." },
          { role: "user", content: `Create detailed voice profile for:\n${params.avatarMode === 'animal' ? `Animal Species: ${params.animal?.species}\nVoice Style: ${params.animal?.voiceStyle || 'narrator'}\nAnthropomorphic: ${params.animal?.anthropomorphic ? 'Yes' : 'No'}` : `Age: ${params.ageRange}\nGender: ${params.gender}\nVoice Type: ${params.voiceType}`}\nEnergy Level: ${params.energyLevel}%\nScript Sample: "${segment.action_timeline?.dialogue || params.script}"\n\nReturn a JSON object with: pitchRange, speakingRate, toneQualities, breathingPattern, emotionalInflections, uniqueMarkers, regionalAccent, vocalTexture` }
        ],
        response_format: { type: "json_object" },
        temperature: 0.3,
        max_tokens: 1000
      });
      const enhancedProfile = JSON.parse(response.choices[0].message.content);
      voiceProfile.technical = { ...voiceProfile.technical, ...enhancedProfile };
      voiceProfile.personality.naturalQualities = enhancedProfile.uniqueMarkers || [];
    } catch (error) {
      console.error('[OpenAI] Error enhancing voice profile:', error);
    }
    return voiceProfile;
  }

  async generateContinuationSegment(params) {
    const templatePath = path.join(INSTRUCTIONS_DIR, 'veo3-continuation-minimal.md');
    const template = await fs.readFile(templatePath, 'utf8');
    const response = await this.client.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: `${template}\n\nGenerate a continuation segment with MINIMAL description but DETAILED voice and behavior specs. Allow animal avatar narration when avatarMode=animal.` },
        { role: "user", content: `Create a continuation segment:\n\nImage Context: Character from screenshot at ${params.imageUrl}\nPrevious Dialogue: "${params.previousSegment?.action_timeline?.dialogue || 'N/A'}"\nNew Dialogue: "${params.script}"\nProduct: ${params.product}\n\n${params.avatarMode === 'animal' ? `Avatar: ANIMAL\nSpecies: ${params.animal?.species}\nVoice Style: ${params.animal?.voiceStyle || 'narrator'}\nAnthropomorphic: ${params.animal?.anthropomorphic ? 'Yes' : 'No'}\n\n` : ''}Voice Profile to Match EXACTLY:\n${JSON.stringify(params.voiceProfile, null, 2)}\n\nGenerate the JSON following the continuation minimal structure.` }
      ],
      response_format: { type: "json_object" },
      temperature: 0.4,
      max_tokens: 3000
    });
    const segment = JSON.parse(response.choices[0].message.content);
    if (segment.character_description) {
      segment.character_description.voice_matching = params.voiceProfile.baseVoice;
      segment.character_description.voice_technical = params.voiceProfile.technical;
    }
    if (segment.action_timeline && !segment.action_timeline.voice_continuity) {
      segment.action_timeline.voice_continuity = {
        technical_specs: params.voiceProfile.technical,
        emotional_tone: "Maintaining consistent warmth and enthusiasm",
        pacing_rhythm: params.voiceProfile.technical.breathPattern || "Natural pauses between phrases",
        emphasis_patterns: params.voiceProfile.continuityMarkers?.emphasis || "Slight volume increase on key words"
      };
    }
    return segment;
  }

  async generateContinuationStyleSegment(params) {
    const template = await this.loadTemplate(params.jsonFormat || 'standard');
    const response = await this.client.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: `${template}\n\nGenerate a segment that maintains the EXACT same structure as standard segments, but with ENHANCED voice and behavior sections. Support animal avatar narration when avatarMode=animal.` },
        { role: "user", content: `Create segment ${params.segmentNumber} of ${params.totalSegments}:\n\nDialogue: "${params.scriptPart}"\nProduct: ${params.product}\nCurrent Location: ${params.currentLocation}\n\nBase Descriptions (USE EXACTLY):\n${params.avatarMode === 'animal' ? `Animal Physical: ${params.baseDescriptions.animal_physical}\nAnimal Behavior: ${params.baseDescriptions.animal_behavior}\nAnimal Voice: ${params.baseDescriptions.animal_voice}` : `Physical: ${params.baseDescriptions.physical}\nClothing: ${params.baseDescriptions.clothing}\nBase Voice: ${params.baseDescriptions.voice}`}\nEnvironment: ${params.baseDescriptions.environment}\nProduct Handling: ${params.baseDescriptions.productHandling || 'Natural handling'}\n\nVoice Profile to Maintain:\n${JSON.stringify(params.voiceProfile, null, 2)}\n\n${params.previousSegment ? `Previous segment ended with:\nPosition: ${params.previousSegment.action_timeline?.transition_prep || params.previousSegment.segment_info?.continuity_markers?.end_position}` : ''}\n\nCRITICAL: Generate complete JSON. character_description.voice_matching MINIMUM 100 words. Include behavioral_consistency MINIMUM 100 words. Maintain continuity.` }
      ],
      response_format: { type: "json_object" },
      temperature: 0.5,
      max_tokens: 4000
    });
    const segment = JSON.parse(response.choices[0].message.content);
    if (segment.character_description) {
      if (!segment.character_description.voice_matching || segment.character_description.voice_matching.length < 100) {
        segment.character_description.voice_matching = `${params.voiceProfile.baseVoice} Maintaining exact technical specifications: ${JSON.stringify(params.voiceProfile.technical)}.`;
      }
      if (!segment.character_description.behavioral_consistency) {
        segment.character_description.behavioral_consistency = `Movement and gesture patterns remain consistent with established style.`;
      }
    }
    return segment;
  }

  getEnergyLevel(energyArc, segmentNumber, totalSegments) {
    const progress = segmentNumber / totalSegments;
    switch (energyArc) {
      case 'building':
        return `${Math.round(60 + (35 * progress))}% - Building from calm to excited`;
      case 'problem-solution':
        if (progress < 0.3) return '70% - Concerned, explaining problem';
        if (progress < 0.7) return '60% - Working through solution';
        return '90% - Excited about results';
      case 'discovery':
        if (progress < 0.5) return '75% - Curious and exploring';
        return '85% - Convinced and enthusiastic';
      case 'consistent':
      default:
        return '80% - Steady, engaging energy throughout';
    }
  }
}

export default new OpenAIService();
