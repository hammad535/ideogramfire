import React, { useState } from 'react';
import { generateSegments } from './apiStandard';
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

function ContinuationMode() {
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
    // Continuation-specific (Segment 2+)
    screenshotUrl: '',
    overlapSeconds: '',
    maintainOutfit: true,
    maintainLighting: true,
    maintainCameraAngle: true,
    maintainVoice: true,
    voiceContinuityEnforcement: true,
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
      const payload = { ...formData, continuationMode: true };
      const response = await generateSegments(payload);
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
      <h2 className="gradient-text-enhanced text-xl font-semibold mb-2">Continuation Mode</h2>
      <p className="text-[var(--text-secondary)] text-sm mb-4">
        Full profile for Segment 1; use Continuation Minimal for Segment 2+. Maintain same outfit, lighting, camera, and voice.
      </p>
      <form onSubmit={handleSubmit} className="form-container">
        <h3 className="form-section-title">{SECTION_LABELS.core}</h3>
        <div className="form-group">
          <label htmlFor="script">1️⃣ Script *</label>
          <textarea
            id="script"
            name="script"
            value={formData.script}
            onChange={handleChange}
            placeholder="Full UGC script (min 50 characters)"
            required
            minLength={50}
          />
        </div>
        <div className="form-group">
          <label>2️⃣ Words Per Segment * — {formData.targetWordsPerSegment}</label>
          <input
            type="range"
            name="targetWordsPerSegment"
            value={formData.targetWordsPerSegment}
            onChange={handleChange}
            min="15"
            max="30"
            step="1"
          />
          <p className="form-help-text">Target 15–30; recommended 18–22.</p>
        </div>
        <div className="form-group">
          <label htmlFor="jsonFormat">3️⃣ JSON Format *</label>
          <select id="jsonFormat" name="jsonFormat" value={formData.jsonFormat} onChange={handleChange}>
            {JSON_FORMATS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <p className="form-help-text">Use Continuation Minimal for segment 2+.</p>
        </div>

        <h3 className="form-section-title">{SECTION_LABELS.character}</h3>
        <div className="form-group">
          <label>Age Range *</label>
          <select name="ageRange" value={formData.ageRange} onChange={handleChange}>
            {AGE_RANGES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label>Gender *</label>
          <select name="gender" value={formData.gender} onChange={handleChange}>
            {GENDERS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label>Voice Type *</label>
          <select name="voiceType" value={formData.voiceType} onChange={handleChange}>
            {VOICE_TYPES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label>Energy Level (%) * — {formData.energyLevel}%</label>
          <input type="range" name="energyLevel" value={formData.energyLevel} onChange={handleChange} min="50" max="100" step="5" />
        </div>
        <div className="form-group">
          <label>Accent / Regional Voice *</label>
          <select name="accentRegion" value={formData.accentRegion} onChange={handleChange}>
            {ACCENT_REGIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label>Ethnicity / Appearance (optional)</label>
          <select name="ethnicity" value={formData.ethnicity || ''} onChange={handleChange}>
            {ETHNICITY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label>Specific Physical Features (optional)</label>
          <input
            type="text"
            name="characterFeatures"
            value={formData.characterFeatures || ''}
            onChange={handleChange}
            placeholder="e.g., hair, beard, glasses, freckles..."
          />
        </div>

        <h3 className="form-section-title">{SECTION_LABELS.environment}</h3>
        <div className="form-group">
          <label>Setting Mode *</label>
          <select name="settingMode" value={formData.settingMode} onChange={handleChange}>
            {SETTING_MODES.filter((m) => ['single', 'home-tour', 'indoor-outdoor'].includes(m.value)).map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
        {formData.settingMode === 'single' ? (
          <div className="form-group">
            <label>Room / Setting *</label>
            <select name="room" value={formData.room} onChange={handleChange}>
              {ROOMS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        ) : (
          <div className="form-group">
            <label>Location Sequence</label>
            {formData.locations.map((loc, i) => (
              <div key={i} className="location-item">
                <span>Segment {i + 1}:</span>
                <select value={loc} onChange={(e) => handleLocationChange(i, e.target.value)}>
                  {ROOMS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
            ))}
          </div>
        )}
        <div className="form-group">
          <label>Time of Day *</label>
          <select name="timeOfDay" value={formData.timeOfDay} onChange={handleChange}>
            {TIME_OF_DAY.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label>Lighting Type (optional)</label>
          <select name="lightingType" value={formData.lightingType || ''} onChange={handleChange}>
            {LIGHTING_TYPES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label>
            <input type="checkbox" name="backgroundLife" checked={formData.backgroundLife} onChange={handleChange} />
            Background life (optional)
          </label>
        </div>

        <h3 className="form-section-title">{SECTION_LABELS.visualStyle}</h3>
        <div className="form-group">
          <label>Camera Style *</label>
          <select name="cameraStyle" value={formData.cameraStyle} onChange={handleChange}>
            {CAMERA_STYLES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label>Style *</label>
          <select name="style" value={formData.style} onChange={handleChange}>
            {STYLES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label>Narrative Style *</label>
          <select name="narrativeStyle" value={formData.narrativeStyle} onChange={handleChange}>
            {NARRATIVE_STYLES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>

        <h3 className="form-section-title">{SECTION_LABELS.product}</h3>
        <div className="form-group">
          <label>Product Name *</label>
          <input type="text" name="product" value={formData.product} onChange={handleChange} placeholder="Product name" required />
        </div>
        <div className="form-group">
          <label>Product Display Style (optional)</label>
          <select name="productStyle" value={formData.productStyle} onChange={handleChange}>
            {PRODUCT_DISPLAY_STYLES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>

        <h3 className="form-section-title">{SECTION_LABELS.story}</h3>
        <div className="form-group">
          <label>Energy Arc *</label>
          <select name="energyArc" value={formData.energyArc} onChange={handleChange}>
            {ENERGY_ARCS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>

        <h3 className="form-section-title">{SECTION_LABELS.technical}</h3>
        <div className="form-group">
          <label>Orientation (optional)</label>
          <select name="orientation" value={formData.orientation || 'vertical'} onChange={handleChange}>
            {ORIENTATION_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label>Resolution (optional)</label>
          <select name="resolution" value={formData.resolution || ''} onChange={handleChange}>
            {RESOLUTION_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label>
            <input type="checkbox" name="voiceContinuityEnforcement" checked={formData.voiceContinuityEnforcement} onChange={handleChange} />
            Voice continuity enforcement
          </label>
        </div>

        <h3 className="form-section-title">🔁 Continuation — Segment 2+</h3>
        <p className="form-help-text mb-2">For generating segment 2+ from a screenshot. Optional for full run.</p>
        <div className="form-group">
          <label>Screenshot URL (optional, for segment 2+)</label>
          <input
            type="text"
            name="screenshotUrl"
            value={formData.screenshotUrl}
            onChange={handleChange}
            placeholder="Paste image URL to continue from screenshot"
          />
        </div>
        <div className="form-group">
          <label>Overlap seconds (optional)</label>
          <input
            type="text"
            name="overlapSeconds"
            value={formData.overlapSeconds}
            onChange={handleChange}
            placeholder="e.g. 0.5"
          />
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

        <button type="submit" className="btn-primary submit-button" disabled={loading}>
          {loading ? 'Generating...' : 'Generate Continuation Segments'}
        </button>
      </form>
      {error && <p className="text-red-400 text-sm mt-4">{error}</p>}
    </div>
  );
}

export default ContinuationMode;
