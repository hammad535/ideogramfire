import React, { useState } from 'react';
import { generateNewCont } from './apiNewCont';
import DownloadButton from './DownloadButton';
import ResultsDisplay from './ResultsDisplay';
import {
  SECTION_LABELS,
  AGE_RANGES,
  GENDERS,
  JSON_FORMATS,
  VOICE_TYPES,
  ACCENT_REGIONS,
  SETTING_MODES,
  ROOMS,
  TIME_OF_DAY,
  LIGHTING_TYPES,
  CAMERA_STYLES,
  STYLES,
  NARRATIVE_STYLES,
  ENERGY_ARCS,
  PRODUCT_DISPLAY_STYLES,
  ETHNICITY_OPTIONS,
  ORIENTATION_OPTIONS,
  RESOLUTION_OPTIONS,
  TRANSITION_TYPES,
} from './videoAdsFormConfig';

const defaultLocationsForMode = (mode) => {
  if (mode === 'home-tour') return ['living room', 'kitchen', 'bedroom', 'home office'];
  if (mode === 'indoor-outdoor') return ['living room', 'porch', 'kitchen', 'backyard'];
  return [];
};

function NewContinuationMode() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [results, setResults] = useState(null);
  const [formData, setFormData] = useState({
    script: '',
    targetWordsPerSegment: '20',
    jsonFormat: 'continuation-minimal',
    ageRange: '25-34',
    gender: 'female',
    product: '',
    room: 'living room',
    style: 'casual and friendly',
    settingMode: 'single',
    locations: [],
    cameraStyle: 'static-handheld',
    timeOfDay: 'morning',
    lightingType: '',
    backgroundLife: false,
    productStyle: 'natural',
    energyArc: 'consistent',
    narrativeStyle: 'direct-review',
    voiceType: 'warm-friendly',
    energyLevel: '80',
    ethnicity: '',
    characterFeatures: '',
    accentRegion: 'neutral-american',
    orientation: 'vertical',
    resolution: '',
    transitionType: '',
    screenshotUrl: '',
    overlapSeconds: '',
    maintainOutfit: true,
    maintainLighting: true,
    maintainCameraAngle: true,
    maintainVoice: true,
    voiceContinuityEnforcement: true,
    // New Continuation — extra control
    useAnimalAvatar: false,
    animalPreset: 'tiger',
    animalVoiceStyle: 'narrator',
    anthropomorphic: false,
    exactStartFramePosition: '',
    exactEndFramePose: '',
    handPositionMarkers: '',
    eyeDirectionMarkers: '',
    breathSyncControl: '',
    microSmileTiming: '',
    gestureTimingPerWord: '',
    beatByBeatActionTimeline: '',
    transitionMatchingMethod: '',
    frameOverlapPlanning: '',
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (type === 'checkbox') {
      setFormData({ ...formData, [name]: checked });
      return;
    }
    if (name === 'settingMode') {
      setFormData({
        ...formData,
        settingMode: value,
        locations: defaultLocationsForMode(value),
      });
      return;
    }
    setFormData({ ...formData, [name]: value });
  };

  const handleLocationChange = (index, value) => {
    const next = [...formData.locations];
    next[index] = value;
    setFormData({ ...formData, locations: next });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResults(null);
    try {
      const response = await generateNewCont(formData);
      setResults({ ...response, settings: formData });
    } catch (err) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  if (results) {
    return (
      <div className="continuation-mode-container">
        <ResultsDisplay results={results} />
        <DownloadButton segments={results.segments} metadata={results.metadata} />
        <button type="button" className="btn-primary mt-4" onClick={() => setResults(null)}>Generate New Script</button>
        {error && <p className="text-red-400 text-sm mt-4">{error}</p>}
      </div>
    );
  }

  return (
    <div className="continuation-mode-container">
      <h2 className="gradient-text-enhanced text-xl font-semibold mb-2">New Continuation Mode</h2>
      <p className="text-[var(--text-secondary)] text-sm mb-4">
        Enhanced precision continuity: exact start/end frame, hand/eye markers, breath sync, gesture timing, transition matching.
      </p>
      <form onSubmit={handleSubmit} className="form-container">
        <h3 className="form-section-title">{SECTION_LABELS.core}</h3>
        <div className="form-group">
          <label>1️⃣ Script *</label>
          <textarea name="script" value={formData.script} onChange={handleChange} placeholder="Full UGC script (min 50 chars)" required minLength={50} />
        </div>
        <div className="form-group">
          <label>2️⃣ Words Per Segment * — {formData.targetWordsPerSegment}</label>
          <input type="range" name="targetWordsPerSegment" value={formData.targetWordsPerSegment} onChange={handleChange} min="15" max="30" step="1" />
          <p className="form-help-text">Target 15–30; recommended 18–22.</p>
        </div>
        <div className="form-group">
          <label>3️⃣ JSON Format *</label>
          <select name="jsonFormat" value={formData.jsonFormat} onChange={handleChange}>
            {JSON_FORMATS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>

        <h3 className="form-section-title">{SECTION_LABELS.character}</h3>
        <div className="form-group">
          <label>Age Range *</label>
          <select name="ageRange" value={formData.ageRange} onChange={handleChange}>{AGE_RANGES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select>
        </div>
        <div className="form-group">
          <label>Gender *</label>
          <select name="gender" value={formData.gender} onChange={handleChange}>{GENDERS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select>
        </div>
        <div className="form-group">
          <label>Voice Type *</label>
          <select name="voiceType" value={formData.voiceType} onChange={handleChange}>{VOICE_TYPES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select>
        </div>
        <div className="form-group">
          <label>Energy Level (%) * — {formData.energyLevel}%</label>
          <input type="range" name="energyLevel" value={formData.energyLevel} onChange={handleChange} min="50" max="100" step="5" />
        </div>
        <div className="form-group">
          <label>Accent / Regional Voice *</label>
          <select name="accentRegion" value={formData.accentRegion} onChange={handleChange}>{ACCENT_REGIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select>
        </div>
        <div className="form-group">
          <label>Ethnicity / Appearance (optional)</label>
          <select name="ethnicity" value={formData.ethnicity || ''} onChange={handleChange}>{ETHNICITY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select>
        </div>
        <div className="form-group">
          <label>Specific Physical Features (optional)</label>
          <input type="text" name="characterFeatures" value={formData.characterFeatures || ''} onChange={handleChange} placeholder="e.g., hair, beard, glasses..." />
        </div>

        <h3 className="form-section-title">{SECTION_LABELS.environment}</h3>
        <div className="form-group">
          <label>Setting Mode *</label>
          <select name="settingMode" value={formData.settingMode} onChange={handleChange}>
            {SETTING_MODES.filter((m) => ['single', 'home-tour', 'indoor-outdoor'].includes(m.value)).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        {formData.settingMode === 'single' ? (
          <div className="form-group">
            <label>Room / Setting *</label>
            <select name="room" value={formData.room} onChange={handleChange}>{ROOMS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select>
          </div>
        ) : (
          <div className="form-group">
            <label>Location Sequence</label>
            {formData.locations.map((loc, i) => (
              <div key={i} className="location-item">
                <span>Segment {i + 1}:</span>
                <select value={loc} onChange={(e) => handleLocationChange(i, e.target.value)}>{ROOMS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select>
              </div>
            ))}
          </div>
        )}
        <div className="form-group">
          <label>Time of Day *</label>
          <select name="timeOfDay" value={formData.timeOfDay} onChange={handleChange}>{TIME_OF_DAY.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select>
        </div>
        <div className="form-group">
          <label>Lighting Type (optional)</label>
          <select name="lightingType" value={formData.lightingType || ''} onChange={handleChange}>{LIGHTING_TYPES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select>
        </div>
        <div className="form-group">
          <label><input type="checkbox" name="backgroundLife" checked={formData.backgroundLife} onChange={handleChange} /> Background life (optional)</label>
        </div>

        <h3 className="form-section-title">{SECTION_LABELS.visualStyle}</h3>
        <div className="form-group">
          <label>Camera Style *</label>
          <select name="cameraStyle" value={formData.cameraStyle} onChange={handleChange}>{CAMERA_STYLES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select>
        </div>
        <div className="form-group">
          <label>Style *</label>
          <select name="style" value={formData.style} onChange={handleChange}>{STYLES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select>
        </div>
        <div className="form-group">
          <label>Narrative Style *</label>
          <select name="narrativeStyle" value={formData.narrativeStyle} onChange={handleChange}>{NARRATIVE_STYLES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select>
        </div>

        <h3 className="form-section-title">{SECTION_LABELS.product}</h3>
        <div className="form-group">
          <label>Product Name *</label>
          <input type="text" name="product" value={formData.product} onChange={handleChange} placeholder="Product name" required />
        </div>
        <div className="form-group">
          <label>Product Display Style (optional)</label>
          <select name="productStyle" value={formData.productStyle} onChange={handleChange}>{PRODUCT_DISPLAY_STYLES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select>
        </div>

        <h3 className="form-section-title">{SECTION_LABELS.story}</h3>
        <div className="form-group">
          <label>Energy Arc *</label>
          <select name="energyArc" value={formData.energyArc} onChange={handleChange}>{ENERGY_ARCS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select>
        </div>

        <h3 className="form-section-title">{SECTION_LABELS.technical}</h3>
        <div className="form-group">
          <label>Orientation (optional)</label>
          <select name="orientation" value={formData.orientation || 'vertical'} onChange={handleChange}>{ORIENTATION_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select>
        </div>
        <div className="form-group">
          <label>Resolution (optional)</label>
          <select name="resolution" value={formData.resolution || ''} onChange={handleChange}>{RESOLUTION_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select>
        </div>
        <div className="form-group">
          <label><input type="checkbox" name="voiceContinuityEnforcement" checked={formData.voiceContinuityEnforcement} onChange={handleChange} /> Voice continuity enforcement</label>
        </div>

        <h3 className="form-section-title">🔁 Continuation — Segment 2+</h3>
        <div className="form-group">
          <label>Screenshot URL (optional)</label>
          <input type="text" name="screenshotUrl" value={formData.screenshotUrl} onChange={handleChange} placeholder="Image URL for segment 2+" />
        </div>
        <div className="form-group">
          <label>Overlap seconds (optional)</label>
          <input type="text" name="overlapSeconds" value={formData.overlapSeconds} onChange={handleChange} placeholder="e.g. 0.5" />
        </div>
        <div className="form-group">
          <label>Maintain same:</label>
          <div className="flex flex-wrap gap-4 mt-1">
            <label><input type="checkbox" name="maintainOutfit" checked={formData.maintainOutfit} onChange={handleChange} /> Outfit</label>
            <label><input type="checkbox" name="maintainLighting" checked={formData.maintainLighting} onChange={handleChange} /> Lighting</label>
            <label><input type="checkbox" name="maintainCameraAngle" checked={formData.maintainCameraAngle} onChange={handleChange} /> Camera angle</label>
            <label><input type="checkbox" name="maintainVoice" checked={formData.maintainVoice} onChange={handleChange} /> Voice</label>
          </div>
        </div>

        <h3 className="form-section-title">🆕 New Continuation — Extra control</h3>
        <p className="form-help-text mb-2">Enhanced precision: exact frames, hand/eye markers, breath sync, gesture timing, transition matching.</p>
        <div className="form-group">
          <label>Exact start frame position (optional)</label>
          <input type="text" name="exactStartFramePosition" value={formData.exactStartFramePosition} onChange={handleChange} placeholder="e.g. standing, hands at sides" />
        </div>
        <div className="form-group">
          <label>Exact end frame pose (optional)</label>
          <input type="text" name="exactEndFramePose" value={formData.exactEndFramePose} onChange={handleChange} placeholder="e.g. slight turn, hand raised" />
        </div>
        <div className="form-group">
          <label>Hand position markers (optional)</label>
          <input type="text" name="handPositionMarkers" value={formData.handPositionMarkers} onChange={handleChange} placeholder="Key hand positions per beat" />
        </div>
        <div className="form-group">
          <label>Eye direction markers (optional)</label>
          <input type="text" name="eyeDirectionMarkers" value={formData.eyeDirectionMarkers} onChange={handleChange} placeholder="Where to look at key moments" />
        </div>
        <div className="form-group">
          <label>Breath sync control (optional)</label>
          <input type="text" name="breathSyncControl" value={formData.breathSyncControl} onChange={handleChange} placeholder="Breathing cues" />
        </div>
        <div className="form-group">
          <label>Micro-smile timing (optional)</label>
          <input type="text" name="microSmileTiming" value={formData.microSmileTiming} onChange={handleChange} placeholder="When to smile subtly" />
        </div>
        <div className="form-group">
          <label>Gesture timing per word (optional)</label>
          <input type="text" name="gestureTimingPerWord" value={formData.gestureTimingPerWord} onChange={handleChange} placeholder="Gesture beats" />
        </div>
        <div className="form-group">
          <label>Beat-by-beat action timeline (optional)</label>
          <input type="text" name="beatByBeatActionTimeline" value={formData.beatByBeatActionTimeline} onChange={handleChange} placeholder="Action timeline" />
        </div>
        <div className="form-group">
          <label>Transition matching method (optional)</label>
          <select name="transitionMatchingMethod" value={formData.transitionMatchingMethod || ''} onChange={handleChange}>
            <option value="">Not specified</option>
            <option value="continuous-motion">Continuous motion</option>
            <option value="energy-match">Energy match</option>
            <option value="hard-cut">Hard cut</option>
            <option value="frame-overlap">Frame overlap</option>
          </select>
        </div>
        <div className="form-group">
          <label>Frame overlap planning (optional)</label>
          <input type="text" name="frameOverlapPlanning" value={formData.frameOverlapPlanning} onChange={handleChange} placeholder="Overlap planning notes" />
        </div>

        <div className="form-group">
          <label><input type="checkbox" name="useAnimalAvatar" checked={formData.useAnimalAvatar} onChange={handleChange} /> Use animal avatar</label>
        </div>
        {formData.useAnimalAvatar && (
          <>
            <div className="form-group">
              <label>Animal preset</label>
              <select name="animalPreset" value={formData.animalPreset} onChange={handleChange}>
                <option value="tiger">Tiger</option>
                <option value="monkey">Monkey</option>
                <option value="fish">Fish</option>
              </select>
            </div>
            <div className="form-group">
              <label>Animal voice style</label>
              <select name="animalVoiceStyle" value={formData.animalVoiceStyle} onChange={handleChange}>
                <option value="narrator">Narrator</option>
                <option value="conversational">Conversational</option>
              </select>
            </div>
            <div className="form-group">
              <label><input type="checkbox" name="anthropomorphic" checked={formData.anthropomorphic} onChange={handleChange} /> Anthropomorphic</label>
            </div>
          </>
        )}

        <button type="submit" className="btn-primary submit-button" disabled={loading}>
          {loading ? 'Generating...' : 'Generate New Continuation Segments'}
        </button>
      </form>
      {error && <p className="text-red-400 text-sm mt-4">{error}</p>}
    </div>
  );
}

export default NewContinuationMode;
