import React, { useState, useEffect } from 'react';
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
} from '../features/videoAds/videoAdsFormConfig';

function ScriptForm({ onSubmit, loading }) {
  const [formData, setFormData] = useState({
    script: '',
    ageRange: '25-34',
    gender: 'female',
    product: '',
    room: 'living room',
    style: 'casual and friendly',
    jsonFormat: 'standard',
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
    targetWordsPerSegment: '20',
    showPreview: false,
    ethnicity: '',
    characterFeatures: '',
    accentRegion: 'neutral-american',
    orientation: 'vertical',
    resolution: '',
    transitionType: '',
  });

  const [scriptPreview, setScriptPreview] = useState([]);
  const [savedSettings, setSavedSettings] = useState([]);

  useEffect(() => {
    const saved = localStorage.getItem('ugcScriptSettings');
    if (saved) {
      try {
        setSavedSettings(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to load saved settings:', e);
      }
    }
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (type === 'checkbox') {
      setFormData({ ...formData, [name]: checked });
      return;
    }
    if (name === 'settingMode') {
      let defaultLocations = [];
      if (value === 'home-tour') defaultLocations = ['living room', 'kitchen', 'bedroom', 'home office'];
      else if (value === 'indoor-outdoor') defaultLocations = ['living room', 'porch', 'kitchen', 'backyard'];
      setFormData({ ...formData, [name]: value, locations: defaultLocations });
      return;
    }
    setFormData({ ...formData, [name]: value });
  };

  const handleLocationChange = (index, value) => {
    const newLocations = [...formData.locations];
    newLocations[index] = value;
    setFormData({ ...formData, locations: newLocations });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const previewScript = () => {
    if (!formData.script || formData.script.trim().length < 50) {
      setScriptPreview([]);
      return;
    }
    const targetWords = parseInt(formData.targetWordsPerSegment) || 20;
    const minWords = Math.max(15, targetWords - 5);
    const maxWords = targetWords + 2;
    const sentences = formData.script.match(/[^.!?]+[.!?]+/g) || [formData.script];
    const segments = [];
    let currentSegment = '';
    let currentWordCount = 0;
    for (let i = 0; i < sentences.length; i++) {
      const sentence = sentences[i].trim();
      const sentenceWords = sentence.split(/\s+/).length;
      if (currentSegment === '') {
        currentSegment = sentence;
        currentWordCount = sentenceWords;
        while (currentWordCount < minWords && i + 1 < sentences.length) {
          i++;
          const nextSentence = sentences[i].trim();
          const nextWords = nextSentence.split(/\s+/).length;
          if (currentWordCount + nextWords > maxWords) {
            if (currentWordCount < minWords) {
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
        segments.push({
          text: currentSegment,
          wordCount: currentWordCount,
          duration: Math.round((currentWordCount / 2.5) * 10) / 10,
        });
        currentSegment = '';
        currentWordCount = 0;
      }
    }
    setScriptPreview(segments);
  };

  useEffect(() => {
    if (formData.showPreview) previewScript();
  }, [formData.script, formData.targetWordsPerSegment, formData.showPreview]);

  const saveSettings = () => {
    const settingsToSave = { ...formData };
    delete settingsToSave.script;
    delete settingsToSave.showPreview;
    const settingName = prompt('Enter a name for these settings:');
    if (settingName) {
      const existingSaved = [...savedSettings];
      const newSetting = { name: settingName, date: new Date().toLocaleDateString(), settings: settingsToSave };
      const existingIndex = existingSaved.findIndex((s) => s.name === settingName);
      if (existingIndex >= 0) {
        if (window.confirm(`Settings "${settingName}" already exist. Overwrite?`)) existingSaved[existingIndex] = newSetting;
        else return;
      } else existingSaved.push(newSetting);
      localStorage.setItem('ugcScriptSettings', JSON.stringify(existingSaved));
      setSavedSettings(existingSaved);
      alert(`Settings "${settingName}" saved successfully!`);
    }
  };

  const loadSettings = (settingName) => {
    const setting = savedSettings.find((s) => s.name === settingName);
    if (setting) {
      setFormData({ ...formData, ...setting.settings, script: formData.script, showPreview: false });
      alert(`Settings "${settingName}" loaded!`);
    }
  };

  const deleteSettings = (settingName) => {
    if (window.confirm(`Delete settings "${settingName}"?`)) {
      const updated = savedSettings.filter((s) => s.name !== settingName);
      localStorage.setItem('ugcScriptSettings', JSON.stringify(updated));
      setSavedSettings(updated);
    }
  };

  const jsonFormatOptions = JSON_FORMATS.filter((f) => f.value !== 'continuation-minimal');

  return (
    <form className="form-container standard-mode-form" onSubmit={handleSubmit}>
      {/* Settings Management */}
      <div className="settings-controls">
        <h3>Settings Management</h3>
        <div className="settings-buttons">
          <button type="button" className="settings-button save-button" onClick={saveSettings}>
            Save Current Settings
          </button>
          {savedSettings.length > 0 && (
            <div className="saved-settings-list">
              <label>Load Saved Settings:</label>
              <select onChange={(e) => e.target.value && loadSettings(e.target.value)} defaultValue="">
                <option value="">Select settings to load...</option>
                {savedSettings.map((s) => (
                  <option key={s.name} value={s.name}>{s.name} ({s.date})</option>
                ))}
              </select>
              {savedSettings.map((s) => (
                <button key={`del-${s.name}`} type="button" className="delete-settings-btn" onClick={() => deleteSettings(s.name)} title={`Delete ${s.name}`}>
                  Delete
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Core: Script, Words, Preview, Product, Age, Gender */}
      <div className="form-section-block">
        <div className="form-group">
          <label htmlFor="script">Script *</label>
          <textarea
            id="script"
            name="script"
            value={formData.script}
            onChange={handleChange}
            placeholder="Paste your UGC script here (minimum 50 characters)..."
            required
            minLength={50}
          />
          <p className="form-help-text">
            Each segment needs 15–22 words (6–8 seconds of speaking). Short sentences will be automatically combined.
          </p>
        </div>
        <div className="form-group">
          <label htmlFor="targetWordsPerSegment">Words per Segment (Target: {formData.targetWordsPerSegment})</label>
          <input
            type="range"
            id="targetWordsPerSegment"
            name="targetWordsPerSegment"
            value={formData.targetWordsPerSegment}
            onChange={handleChange}
            min="15"
            max="30"
            step="1"
          />
          <p className="form-help-text">
            Adjust the target word count per 8-second segment (15 = slower pace, 30 = faster pace).
          </p>
        </div>
        {formData.script && formData.script.trim().length >= 50 && (
          <div className="form-group">
            <button
              type="button"
              className="preview-button"
              onClick={() => setFormData({ ...formData, showPreview: !formData.showPreview })}
            >
              {formData.showPreview ? 'Hide' : 'Show'} Script Preview
            </button>
          </div>
        )}
        {formData.showPreview && scriptPreview.length > 0 && (
          <div className="script-preview">
            <h4>Script Preview — {scriptPreview.length} segments</h4>
            <p className="preview-info">Total duration: ~{scriptPreview.reduce((sum, seg) => sum + seg.duration, 0).toFixed(1)} seconds</p>
            <div className="preview-segments">
              {scriptPreview.map((seg, idx) => (
                <div key={idx} className="preview-segment">
                  <div className="preview-segment-header">
                    <span className="segment-number">Segment {idx + 1}</span>
                    <span className="segment-stats">{seg.wordCount} words | ~{seg.duration}s</span>
                  </div>
                  <div className="preview-segment-text">{seg.text}</div>
                </div>
              ))}
            </div>
          </div>
        )}
        <div className="form-group">
          <label htmlFor="product">Product Name *</label>
          <input
            id="product"
            name="product"
            type="text"
            value={formData.product}
            onChange={handleChange}
            placeholder="e.g., Skincare Serum, Coffee Maker..."
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="ageRange">Age Range</label>
          <select id="ageRange" name="ageRange" value={formData.ageRange} onChange={handleChange}>
            {AGE_RANGES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label htmlFor="gender">Gender</label>
          <select id="gender" name="gender" value={formData.gender} onChange={handleChange}>
            {GENDERS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      </div>

      {/* Voice & Energy */}
      <div className="form-section-block">
        <div className="form-group">
          <label htmlFor="voiceType">Voice Type</label>
          <select id="voiceType" name="voiceType" value={formData.voiceType} onChange={handleChange}>
            {VOICE_TYPES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <p className="form-help-text">Sets the vocal tone and delivery style for consistency across segments.</p>
        </div>
        <div className="form-group">
          <label htmlFor="energyLevel">Energy Level ({formData.energyLevel}%)</label>
          <input
            type="range"
            id="energyLevel"
            name="energyLevel"
            value={formData.energyLevel}
            onChange={handleChange}
            min="50"
            max="100"
            step="5"
          />
          <p className="form-help-text">Base energy level for delivery (50% = calm, 100% = highly enthusiastic).</p>
        </div>
      </div>

      {/* Advanced Character Details */}
      <div className="form-section-block">
        <h3 className="form-section-title">Advanced Character Details</h3>
        <div className="form-group">
          <label htmlFor="ethnicity">Ethnicity/Appearance</label>
          <select id="ethnicity" name="ethnicity" value={formData.ethnicity || ''} onChange={handleChange}>
            {ETHNICITY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label htmlFor="characterFeatures">Specific Features (Optional)</label>
          <input
            id="characterFeatures"
            name="characterFeatures"
            type="text"
            value={formData.characterFeatures || ''}
            onChange={handleChange}
            placeholder="e.g., curly hair, glasses, freckles, beard..."
          />
          <p className="form-help-text">Add specific physical features to make the character more distinctive.</p>
        </div>
        <div className="form-group">
          <label htmlFor="accentRegion">Accent/Regional Voice</label>
          <select id="accentRegion" name="accentRegion" value={formData.accentRegion || 'neutral-american'} onChange={handleChange}>
            {ACCENT_REGIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      </div>

      {/* Environment: Setting Mode, Room / Location Sequence */}
      <div className="form-section-block">
        <h3 className="form-section-title">Environment Settings</h3>
        <div className="form-group">
          <label htmlFor="settingMode">Setting Mode</label>
          <select id="settingMode" name="settingMode" value={formData.settingMode} onChange={handleChange}>
            {SETTING_MODES.filter((m) => ['single', 'home-tour', 'indoor-outdoor'].includes(m.value)).map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <p className="form-help-text">
            {formData.settingMode === 'single'
              ? 'Film in one consistent location.'
              : formData.settingMode === 'home-tour'
              ? 'Move through different rooms in the home.'
              : 'Mix indoor and outdoor locations.'}
          </p>
        </div>
        {formData.settingMode === 'single' ? (
          <div className="form-group">
            <label htmlFor="room">Room/Setting</label>
            <select id="room" name="room" value={formData.room} onChange={handleChange}>
              {ROOMS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        ) : (
          <div className="form-group">
            <label>Location Sequence</label>
            {formData.locations.map((loc, idx) => (
              <div key={idx} className="location-item">
                <span>Segment {idx + 1}:</span>
                <select value={loc} onChange={(e) => handleLocationChange(idx, e.target.value)}>
                  {ROOMS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
            ))}
          </div>
        )}
        <div className="form-group">
          <label htmlFor="style">Style</label>
          <select id="style" name="style" value={formData.style} onChange={handleChange}>
            {STYLES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      </div>

      {/* JSON Format — own card */}
      <div className="form-card-inner">
        <h3 className="form-section-title">JSON Format</h3>
        <div className="form-group">
          <label htmlFor="jsonFormat">JSON Format</label>
          <select id="jsonFormat" name="jsonFormat" value={formData.jsonFormat} onChange={handleChange}>
            {jsonFormatOptions.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <p className="form-help-text">
            {formData.jsonFormat === 'enhanced'
              ? 'Enhanced format includes detailed continuity markers and micro-expressions for seamless transitions.'
              : 'Standard format provides comprehensive character and scene descriptions.'}
          </p>
        </div>
      </div>

      {/* Visual & Production Settings */}
      <div className="form-card-inner">
        <h3 className="form-section-title">Visual & Production Settings</h3>
        <div className="form-group">
          <label htmlFor="cameraStyle">Camera Style</label>
          <select id="cameraStyle" name="cameraStyle" value={formData.cameraStyle} onChange={handleChange}>
            {CAMERA_STYLES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label htmlFor="timeOfDay">Time of Day / Lighting</label>
          <select id="timeOfDay" name="timeOfDay" value={formData.timeOfDay} onChange={handleChange}>
            {TIME_OF_DAY.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label className="form-checkbox-label">
            <input type="checkbox" name="backgroundLife" checked={formData.backgroundLife} onChange={handleChange} />
            Add Background Life (pets, family members, natural sounds)
          </label>
        </div>
      </div>

      {/* Story & Presentation */}
      <div className="form-card-inner">
        <h3 className="form-section-title">Story & Presentation</h3>
        <div className="form-group">
          <label htmlFor="productStyle">Product Display Style</label>
          <select id="productStyle" name="productStyle" value={formData.productStyle} onChange={handleChange}>
            {PRODUCT_DISPLAY_STYLES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label htmlFor="energyArc">Energy Arc</label>
          <select id="energyArc" name="energyArc" value={formData.energyArc} onChange={handleChange}>
            {ENERGY_ARCS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label htmlFor="narrativeStyle">Narrative Style</label>
          <select id="narrativeStyle" name="narrativeStyle" value={formData.narrativeStyle} onChange={handleChange}>
            {NARRATIVE_STYLES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      </div>

      {/* Technical (optional) — compact */}
      <div className="form-section-block form-section-technical">
        <h3 className="form-section-title">Technical (optional)</h3>
        <div className="form-row-inline">
          <div className="form-group">
            <label htmlFor="orientation">Orientation</label>
            <select id="orientation" name="orientation" value={formData.orientation || 'vertical'} onChange={handleChange}>
              {ORIENTATION_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="resolution">Resolution</label>
            <select id="resolution" name="resolution" value={formData.resolution || ''} onChange={handleChange}>
              {RESOLUTION_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="transitionType">Transition Type</label>
            <select id="transitionType" name="transitionType" value={formData.transitionType || ''} onChange={handleChange}>
              {TRANSITION_TYPES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className="form-submit-row">
        <button type="submit" className="btn-primary submit-button" disabled={loading}>
          {loading ? 'Generating...' : 'Generate Segments'}
        </button>
      </div>
    </form>
  );
}

export default ScriptForm;
