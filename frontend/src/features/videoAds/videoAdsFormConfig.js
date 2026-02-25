/**
 * UGC Script Splitter — Master input field config
 * Sections and options aligned with the MASTER INPUT FIELD LIST.
 */

export const SECTION_LABELS = {
  core: 'Section 1 — Core inputs (all modes)',
  character: 'Section 2 — Character configuration',
  environment: 'Section 3 — Environment settings',
  visualStyle: 'Section 4 — Visual style',
  product: 'Section 5 — Product settings',
  story: 'Section 6 — Story control',
  technical: 'Section 7 — Technical controls',
};

export const AGE_RANGES = [
  { value: '18-24', label: '18-24' },
  { value: '25-34', label: '25-34' },
  { value: '35-44', label: '35-44' },
  { value: '45-54', label: '45-54' },
  { value: '55+', label: '55+' },
];

export const GENDERS = [
  { value: 'female', label: 'Female' },
  { value: 'male', label: 'Male' },
  { value: 'non-binary', label: 'Non-binary' },
];

export const JSON_FORMATS = [
  { value: 'standard', label: 'Standard (300+ words)' },
  { value: 'enhanced', label: 'Enhanced (500+ words)' },
  { value: 'continuation-minimal', label: 'Continuation Minimal (segment 2+)' },
];

export const VOICE_TYPES = [
  { value: 'warm-friendly', label: 'Warm & Friendly' },
  { value: 'professional-clear', label: 'Professional & Clear' },
  { value: 'energetic-upbeat', label: 'Energetic & Upbeat' },
  { value: 'calm-soothing', label: 'Calm & Soothing' },
  { value: 'conversational-casual', label: 'Conversational & Casual' },
  { value: 'authoritative-confident', label: 'Authoritative & Confident' },
  { value: 'youthful-playful', label: 'Youthful & Playful' },
];

export const ACCENT_REGIONS = [
  { value: 'neutral-american', label: 'Neutral American' },
  { value: 'southern-us', label: 'Southern US' },
  { value: 'new-york', label: 'New York' },
  { value: 'midwest', label: 'Midwest' },
  { value: 'california', label: 'California' },
  { value: 'british-rp', label: 'British (RP)' },
  { value: 'british-regional', label: 'British Regional' },
  { value: 'australian', label: 'Australian' },
  { value: 'canadian', label: 'Canadian' },
  { value: 'irish', label: 'Irish' },
  { value: 'scottish', label: 'Scottish' },
  { value: 'international', label: 'International/Mixed' },
];

export const SETTING_MODES = [
  { value: 'single', label: 'Single Location' },
  { value: 'multiple', label: 'Multiple Locations' },
  { value: 'home-tour', label: 'Home Tour' },
  { value: 'indoor-outdoor', label: 'Indoor/Outdoor' },
];

export const ROOMS = [
  { value: 'living room', label: 'Living Room' },
  { value: 'kitchen', label: 'Kitchen' },
  { value: 'bathroom', label: 'Bathroom' },
  { value: 'bedroom', label: 'Bedroom' },
  { value: 'home office', label: 'Home Office' },
  { value: 'porch', label: 'Porch' },
  { value: 'backyard', label: 'Backyard/Patio' },
];

export const TIME_OF_DAY = [
  { value: 'morning', label: 'Morning' },
  { value: 'golden-hour', label: 'Golden Hour' },
  { value: 'afternoon', label: 'Afternoon' },
  { value: 'evening', label: 'Evening' },
  { value: 'night', label: 'Night' },
  { value: 'studio', label: 'Studio' },
];

export const LIGHTING_TYPES = [
  { value: '', label: 'Not specified' },
  { value: 'natural', label: 'Natural' },
  { value: 'artificial', label: 'Artificial' },
  { value: 'mixed', label: 'Mixed' },
];

export const CAMERA_STYLES = [
  { value: 'static', label: 'Static' },
  { value: 'static-handheld', label: 'Static Handheld' },
  { value: 'dynamic', label: 'Dynamic' },
  { value: 'slow-push', label: 'Slow Push In' },
  { value: 'orbit', label: 'Subtle Orbit' },
  { value: 'dynamic-handheld', label: 'Dynamic Handheld' },
];

export const STYLES = [
  { value: 'casual and friendly', label: 'Casual & Friendly' },
  { value: 'professional', label: 'Professional' },
  { value: 'energetic', label: 'Energetic' },
  { value: 'calm and soothing', label: 'Calm & Soothing' },
  { value: 'luxury', label: 'Luxury' },
];

export const NARRATIVE_STYLES = [
  { value: 'direct-review', label: 'Direct Review' },
  { value: 'storytelling', label: 'Storytelling' },
  { value: 'problem-solution', label: 'Problem-Solution' },
  { value: 'day-in-life', label: 'Day in Life' },
  { value: 'problem-solver', label: 'Problem Solver' },
  { value: 'comparison', label: 'Comparison Story' },
];

export const ENERGY_ARCS = [
  { value: 'consistent', label: 'Consistent' },
  { value: 'build-up', label: 'Build-Up' },
  { value: 'high-start-soft-end', label: 'High Start → Soft End' },
  { value: 'building', label: 'Building Excitement' },
  { value: 'problem-solution', label: 'Problem to Solution' },
  { value: 'discovery', label: 'Discovery Journey' },
];

export const PRODUCT_DISPLAY_STYLES = [
  { value: 'natural', label: 'Natural Integration' },
  { value: 'hero-shot', label: 'Hero Shot' },
  { value: 'background', label: 'Background' },
  { value: 'showcase', label: 'Feature Showcase' },
  { value: 'before-after', label: 'Before/After Demo' },
  { value: 'lifestyle', label: 'Lifestyle Context' },
];

export const ETHNICITY_OPTIONS = [
  { value: '', label: 'Not specified' },
  { value: 'caucasian', label: 'Caucasian' },
  { value: 'african-american', label: 'African American' },
  { value: 'hispanic-latino', label: 'Hispanic/Latino' },
  { value: 'asian-east', label: 'East Asian' },
  { value: 'asian-south', label: 'South Asian' },
  { value: 'middle-eastern', label: 'Middle Eastern' },
  { value: 'mixed-race', label: 'Mixed Race' },
  { value: 'pacific-islander', label: 'Pacific Islander' },
  { value: 'native-american', label: 'Native American' },
];

export const ORIENTATION_OPTIONS = [
  { value: 'vertical', label: 'Vertical' },
  { value: 'landscape', label: 'Landscape' },
];

export const RESOLUTION_OPTIONS = [
  { value: '', label: 'Default' },
  { value: '720p', label: '720p' },
  { value: '1080p', label: '1080p' },
];

export const TRANSITION_TYPES = [
  { value: '', label: 'Not specified' },
  { value: 'continuous-motion', label: 'Continuous motion' },
  { value: 'energy-match', label: 'Energy match' },
  { value: 'hard-cut', label: 'Hard cut' },
  { value: 'overlap', label: 'Overlap' },
];

export const DEFAULT_FORM_STATE = {
  script: '',
  targetWordsPerSegment: '20',
  jsonFormat: 'standard',
  ageRange: '25-34',
  gender: 'female',
  voiceType: 'warm-friendly',
  energyLevel: '80',
  accentRegion: 'neutral-american',
  ethnicity: '',
  characterFeatures: '',
  settingMode: 'single',
  room: 'living room',
  locations: [],
  timeOfDay: 'morning',
  lightingType: '',
  product: '',
  productStyle: 'natural',
  cameraStyle: 'static-handheld',
  style: 'casual and friendly',
  narrativeStyle: 'direct-review',
  energyArc: 'consistent',
  backgroundLife: false,
  orientation: 'vertical',
  resolution: '',
  transitionType: '',
  showPreview: false,
  // Optional / advanced
  locationSequence: [],
  cameraAngle: '',
  cameraHeight: '',
  productInteractionStyle: '',
  emotionalArc: '',
  overlapSeconds: '',
  voiceContinuityEnforcement: false,
};
