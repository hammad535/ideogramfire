import OpenAI from 'openai';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const INDOOR_LOCATIONS = new Set([
  'living room', 'bedroom', 'bathroom', 'home office', 'kitchen',
  'dining room', 'hallway', 'entryway', 'laundry room', 'walk-in closet'
]);

function contains(text = '', needle) {
  return (text || '').toLowerCase().includes(needle);
}

function sanitizeSegmentForPlausibility(segment) {
  try {
    const loc = (segment?.segment_info?.location || '').toLowerCase();
    const isIndoor = INDOOR_LOCATIONS.has(loc);
    if (!isIndoor) return segment;
    const props = segment?.scene_continuity?.props_in_frame || '';
    const env = segment?.scene_continuity?.environment || '';
    const actions = segment?.action_timeline?.synchronized_actions || '';
    const dialogue = segment?.action_timeline?.dialogue || '';
    let fixedProps = props, fixedEnv = env, fixedActions = actions;
    if (contains(props, 'solar panel') || contains(env, 'solar panel') || contains(actions, 'solar panel')) {
      fixedProps = fixedProps.replace(/solar panels?/gi, 'solar panel monitoring display');
      fixedEnv = fixedEnv.replace(/solar panels?/gi, 'solar panel monitoring display');
      fixedActions = fixedActions.replace(/solar panels?/gi, 'monitoring display');
    }
    if (contains(props, 'generator') || contains(env, 'generator') || contains(actions, 'generator')) {
      fixedProps = fixedProps.replace(/generator(s)?/gi, 'energy system status display');
      fixedEnv = fixedEnv.replace(/generator(s)?/gi, 'energy system status display');
      fixedActions = fixedActions.replace(/generator(s)?/gi, 'energy system status');
    }
    if (contains(env, 'snow ') || contains(props, 'snow ')) {
      fixedEnv = fixedEnv.replace(/snow(\w*)/gi, 'natural winter light visible through windows');
      fixedProps = fixedProps.replace(/snow(\w*)/gi, 'winter scenery visible outside');
    }
    if (segment.scene_continuity) {
      segment.scene_continuity.props_in_frame = fixedProps;
      segment.scene_continuity.environment = fixedEnv;
    }
    if (segment.action_timeline) {
      segment.action_timeline.synchronized_actions = fixedActions;
      segment.action_timeline.dialogue = dialogue;
    }
  } catch (_) {}
  return segment;
}

const INSTRUCTIONS_DIR = path.join(__dirname, '../../../../instructions');

class OpenAIServicePlus {
  constructor() {
    const key = process.env.OPENAI_API_KEY?.trim();
    this.openai = key ? new OpenAI({ apiKey: key }) : null;
    this.templateInstructions = null;
  }

  get client() {
    if (!this.openai) throw new Error('OPENAI_API_KEY is not set. Add it to .env to use segment generation.');
    return this.openai;
  }

  async loadTemplate(format = 'standard') {
    const filename = format === 'enhanced' ? 'veo3-enhanced-continuity-plus.md' : 'veo3-json-guidelines-plus.md';
    const templatePath = path.join(INSTRUCTIONS_DIR, filename);
    console.log(`[OpenAI Plus] Loading template: ${filename}`);
    return await fs.readFile(templatePath, 'utf8');
  }

  async generateSegments(params) {
    console.log('[OpenAI Plus] Starting generation with format:', params.jsonFormat || 'standard');
    const template = await this.loadTemplate(params.jsonFormat);
    const scriptSegments = await this.splitScript(params.script);
    console.log('[OpenAI Plus] Script split into', scriptSegments.length, 'segments');
    let locations = [];
    if (params.settingMode === 'ai-inspired') {
      locations = await this.inferLocationsFromScript({ script: params.script, desiredCount: scriptSegments.length, product: params.product, style: params.style });
    } else if (params.settingMode === 'single') {
      locations = Array(scriptSegments.length).fill(params.room);
    } else {
      locations = params.locations || [];
      while (locations.length < scriptSegments.length) locations.push(locations[locations.length - 1] || 'living room');
    }
    console.log('[OpenAI Plus] Generating base descriptions...');
    const baseDescriptions = await this.generateBaseDescriptions({ ...params, locations }, template);
    const segments = [];
    for (let i = 0; i < scriptSegments.length; i++) {
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
      segments.push(sanitizeSegmentForPlausibility(segment));
    }
    return {
      segments,
      metadata: { totalSegments: segments.length, estimatedDuration: segments.length * 8, characterId: this.generateCharacterId(params) }
    };
  }

  async splitScript(script) {
    const wordsPerSecond = 150 / 60;
    const minWordsFor6Seconds = 15;
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
            if (currentWordCount < minWordsFor6Seconds) { currentSegment += ' ' + nextSentence; currentWordCount += nextWords; } else { i--; break; }
          } else { currentSegment += ' ' + nextSentence; currentWordCount += nextWords; }
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
          if (merged.split(/\s+/).length <= 30) { finalSegments.push(merged); i++; continue; }
        }
      }
      finalSegments.push(segment);
    }
    return finalSegments;
  }

  async inferLocationsFromScript({ script, desiredCount, product, style }) {
    try {
      const response = await this.client.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: 'You analyze UGC scripts and propose realistic filming locations per segment. Return only JSON.' },
          { role: 'user', content: `Script:\n${script}\n\nProduct: ${product || 'N/A'}\nStyle: ${style || 'casual'}\nSegments Needed: ${desiredCount}\n\nReturn a JSON object with a single key 'locations' that is an array of ${desiredCount} plain strings (e.g., living room, kitchen, office).` }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.4,
        max_tokens: 500
      });
      const parsed = JSON.parse(response.choices[0].message.content);
      let locations = Array.isArray(parsed.locations) ? parsed.locations : [];
      locations = locations.map(l => String(l).toLowerCase());
      while (locations.length < desiredCount) locations.push(locations[locations.length - 1] || 'living room');
      if (locations.length > desiredCount) locations = locations.slice(0, desiredCount);
      return locations;
    } catch (error) {
      return Array(desiredCount).fill('living room');
    }
  }

  async inferCameraFromScript({ script, desiredCount, product, style }) {
    try {
      const response = await this.client.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: 'Propose camera styles per segment. Return only JSON.' },
          { role: 'user', content: `Script:\n${script}\n\nProduct: ${product || 'N/A'}\nSegments Needed: ${desiredCount}\n\nReturn JSON with key 'camera' = array of ${desiredCount} strings from ["static-handheld","slow-push","orbit","dynamic","pov-selfie"].` }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.5,
        max_tokens: 400
      });
      const parsed = JSON.parse(response.choices[0].message.content);
      let camera = Array.isArray(parsed.camera) ? parsed.camera : [];
      while (camera.length < desiredCount) camera.push(camera[camera.length - 1] || 'static-handheld');
      if (camera.length > desiredCount) camera = camera.slice(0, desiredCount);
      return camera;
    } catch (error) {
      return Array(desiredCount).fill('static-handheld');
    }
  }

  async generateBaseDescriptions(params, template) {
    const isEnhanced = params.jsonFormat === 'enhanced';
    const response = await this.client.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: `${template}\n\nGenerate base descriptions. Return ONLY valid JSON. No subtitles/captions/SFX/music.` },
        { role: "user", content: `Create base descriptions for:\nAge: ${params.ageRange}\nGender: ${params.gender}\nEthnicity: ${params.ethnicity || 'unspecified'}\nSetting Mode: ${params.settingMode || 'single'}\n${params.settingMode === 'single' ? `Room: ${params.room}` : `Locations: ${params.locations?.join(', ') || 'various'}`}\nStyle: ${params.style}\nProduct: ${params.product}\n\nReturn JSON with keys: physical (250+ words), clothing (150+ words), environment (${isEnhanced ? '250+' : '150+'} words), voice (${isEnhanced ? '100+' : '50+'} words), productHandling (50+ words).` }
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
      max_tokens: 5000
    });
    return JSON.parse(response.choices[0].message.content);
  }

  async generateSegment(params) {
    let cameraStyle = params.cameraStyle;
    if (cameraStyle === 'ai-inspired') {
      if (!params._inferredCamera) {
        params._inferredCamera = await this.inferCameraFromScript({ script: params.script, desiredCount: params.totalSegments, product: params.product, style: params.style });
      }
      cameraStyle = params._inferredCamera[params.segmentNumber - 1] || 'static-handheld';
    }
    const response = await this.client.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: `${params.template}\n\nGenerate a Veo 3 JSON segment. Use base descriptions WORD-FOR-WORD. No subtitles/captions/SFX/music.` },
        { role: "user", content: `Create segment ${params.segmentNumber} of ${params.totalSegments}:\n\nDialogue: "${params.scriptPart}"\nProduct: ${params.product}\nCurrent Location: ${params.currentLocation}\n\nCamera: ${cameraStyle}\nTime of Day: ${params.timeOfDay || 'morning'}\nEnergy: ${this.getEnergyLevel(params.energyArc, params.segmentNumber, params.totalSegments)}\n\nBase: Physical ${params.baseDescriptions.physical}\nClothing ${params.baseDescriptions.clothing}\nEnvironment ${params.baseDescriptions.environment}\nVoice ${params.baseDescriptions.voice}\nProduct Handling ${params.baseDescriptions.productHandling || 'Natural handling'}\n\n${params.previousSegment ? `Previous ended: ${params.previousSegment.action_timeline?.transition_prep}` : 'Opening segment.'}\n\nGenerate complete JSON: segment_info, character_description, scene_continuity, action_timeline. No subtitles/captions/SFX/music.` }
      ],
      response_format: { type: "json_object" },
      temperature: 0.5,
      max_tokens: 5000
    });
    return JSON.parse(response.choices[0].message.content);
  }

  generateCharacterId(params) {
    return `${params.gender}_${params.ageRange}_${Date.now()}_plus`.replace(/\s+/g, '_');
  }

  getEnergyLevel(energyArc, segmentNumber, totalSegments) {
    const progress = segmentNumber / totalSegments;
    switch (energyArc) {
      case 'building': return `${Math.round(60 + (35 * progress))}% - Building from calm to excited`;
      case 'problem-solution': if (progress < 0.3) return '70%'; if (progress < 0.7) return '60%'; return '90%';
      case 'discovery': if (progress < 0.5) return '75%'; return '85%';
      default: return '80% - Steady energy';
    }
  }
}

export default new OpenAIServicePlus();
