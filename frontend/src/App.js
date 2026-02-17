import React, { useState, useEffect } from 'react';
import './App.css';
import promptGuide from './PromptFORGPT';
import { saveAs } from 'file-saver';
import { supabase, isSupabaseConfigured } from './supabaseClient';
import { getAuthHeaders } from './authHeaders';
import { API_BASE } from './apiBase';
import AuthScreen from './AuthScreen';
import logo from './assets/logo.png';

function signOut() {
  if (supabase) supabase.auth.signOut({ scope: 'local' });
}

function App() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [creativeMode, setCreativeMode] = useState('paid');
  const [image, setImage] = useState(null);
  const [vertical, setVertical] = useState('');
  const [ageGroup, setAgeGroup] = useState('');
  const [angle, setAngle] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [results, setResults] = useState([]);

  // Auth: on mount get session, then subscribe to changes. Strict gate: no user = login screen only.
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      setAuthLoading(false);
      setUser(null);
      return;
    }
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setUser(session?.user ?? null);
      } catch {
        setUser(null);
      }
      setAuthLoading(false);
    })();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        setUser(null);
        return;
      }
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  // Reset generator state when user identity changes (e.g. logout then login as different user).
  useEffect(() => {
    if (!user?.id) return;
    setCreativeMode('paid');
    setImage(null);
    setVertical('');
    setAgeGroup('');
    setAngle('');
    setResults([]);
    setError('');
  }, [user?.id]);

  const resetForModeChange = () => {
    setImage(null);
    setVertical('');
    setAgeGroup('');
    setAngle('');
    setResults([]);
    setError('');
  };

  const handleModeSelect = (mode) => {
    setCreativeMode(mode);
    resetForModeChange();
  };

  const handleChangeMode = () => {
    setCreativeMode(null);
    resetForModeChange();
  };

  const handleModeToggle = (event, newMode) => {
    if (loading) return;
    if (!newMode || newMode === creativeMode) return;
    handleModeSelect(newMode);
  };

  const handleDownloadImage = async (url, idx) => {
    const downloadTimestamp = new Date().toISOString();
    console.log(`[${downloadTimestamp}] [FRONTEND] Downloading image ${idx + 1}...`);
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`${API_BASE}/api/clean-image?url=${encodeURIComponent(url)}`, { headers });
      if (!response.ok) {
        if (response.status === 401) signOut();
        throw new Error(`Failed to download image ${idx + 1}`);
      }
      const blob = await response.blob();
      const ext = url.split('.').pop().split('?')[0] || 'jpg';
      saveAs(blob, `image_${idx + 1}.${ext}`);
      console.log(`[${downloadTimestamp}] [FRONTEND] Image ${idx + 1} downloaded successfully`);
    } catch (err) {
      console.error(`[${downloadTimestamp}] [FRONTEND] Image download failed:`, err.message);
      setError('Failed to download image.');
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      console.log('[FRONTEND] Image selected:', {
        name: file.name,
        type: file.type,
        size: `${(file.size / 1024).toFixed(2)} KB`,
        lastModified: new Date(file.lastModified).toISOString()
      });
    }
    setImage(file);
    setError('');
  };

  const handleVerticalChange = (e) => {
    setVertical(e.target.value);
    setError('');
  };

  const handleAgeGroupChange = (e) => {
    setAgeGroup(e.target.value);
    setError('');
  };

  const handleAngleChange = (e) => {
    setAngle(e.target.value);
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const submitTimestamp = new Date().toISOString();
    console.log(`[${submitTimestamp}] [FRONTEND] ========== FORM SUBMISSION START ==========`);
    console.log(`[${submitTimestamp}] [FRONTEND] Form Data:`, {
      creativeMode,
      vertical,
      ageGroup,
      angle,
      hasImage: !!image,
      imageName: image?.name,
      imageType: image?.type,
      imageSize: image ? `${(image.size / 1024).toFixed(2)} KB` : 'N/A'
    });
    
    setError('');
    if (!creativeMode) {
      console.warn(`[${submitTimestamp}] [FRONTEND] Validation failed: No creative mode selected`);
      setError('Please select a creative mode.');
      return;
    }
    if (!image) {
      console.warn(`[${submitTimestamp}] [FRONTEND] Validation failed: No image uploaded`);
      setError('Please upload an image.');
      return;
    }
    if (!vertical.trim() || !ageGroup.trim()) {
      console.warn(`[${submitTimestamp}] [FRONTEND] Validation failed: Missing vertical or age group`);
      setError('Please enter both vertical and age group.');
      return;
    }
    
    setLoading(true);
    const formData = new FormData();
    let promptString = `Vertical: ${vertical} | Age Group: ${ageGroup}`;
    if (angle.trim()) {
      promptString += ` | Angle: ${angle}`;
    }
    promptString += ` | ${promptGuide}`;
    
    console.log(`[${submitTimestamp}] [FRONTEND] Constructed prompt string:`, {
      promptLength: promptString.length,
      promptPreview: promptString.substring(0, 200) + '...',
      vertical,
      ageGroup,
      angle: angle || 'none',
      guideLength: promptGuide.length
    });
    
    formData.append('image', image);
    formData.append('prompt', promptString);
    formData.append('creativeMode', creativeMode);
    
    const requestStartTime = Date.now();
    console.log(`[${submitTimestamp}] [FRONTEND] Sending POST request to /api/process...`);
    
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`${API_BASE}/api/process`, {
        method: 'POST',
        headers,
        body: formData
      });
      
      const requestEndTime = Date.now();
      const requestDuration = requestEndTime - requestStartTime;
      const responseTimestamp = new Date().toISOString();
      
      console.log(`[${responseTimestamp}] [FRONTEND] ========== API RESPONSE RECEIVED ==========`);
      console.log(`[${responseTimestamp}] [FRONTEND] Response Details:`, {
        status: res.status,
        statusText: res.statusText,
        duration: `${requestDuration}ms (${(requestDuration / 1000).toFixed(2)}s)`,
        ok: res.ok
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        console.error(`[${responseTimestamp}] [FRONTEND] API Error Response:`, data);
        if (res.status === 401) signOut();
        setError(data.error || 'An error occurred.');
        setLoading(false);
        return;
      }
      
      console.log(`[${responseTimestamp}] [FRONTEND] Success Response Data:`, {
        imagesCount: data.images?.length || 0,
        promptsCount: data.prompts?.length || 0,
        imageUrls: data.images?.slice(0, 3).map(url => url.substring(0, 80) + '...') || []
      });
      
      setResults(data.images || []);
      // Prompts are logged in backend only, not stored in frontend
      
      console.log(`[${responseTimestamp}] [FRONTEND] State updated with results`);
      console.log(`[${responseTimestamp}] [FRONTEND] ========== FORM SUBMISSION COMPLETE ==========`);
    } catch (err) {
      const errorTimestamp = new Date().toISOString();
      console.error(`[${errorTimestamp}] [FRONTEND] ========== NETWORK ERROR ==========`);
      console.error(`[${errorTimestamp}] [FRONTEND] Network Error:`, err);
      console.error(`[${errorTimestamp}] [FRONTEND] Error Message:`, err.message);
      console.error(`[${errorTimestamp}] [FRONTEND] Error Stack:`, err.stack);
      setError('Network error.');
    } finally {
      setLoading(false);
      console.log(`[${new Date().toISOString()}] [FRONTEND] Loading state set to false`);
    }
  };

  // Export all images as zip (server-side with metadata stripping)
  const handleExportAll = async () => {
    const exportTimestamp = new Date().toISOString();
    console.log(`[${exportTimestamp}] [FRONTEND] ========== ZIP EXPORT START ==========`);
    console.log(`[${exportTimestamp}] [FRONTEND] Exporting ${results.length} images to ZIP (with metadata stripped)`);
    
    setError('');
    setLoading(true);
    const exportStartTime = Date.now();
    
    try {
      console.log(`[${exportTimestamp}] [FRONTEND] Sending request to backend for ZIP export with metadata stripping...`);
      
      const authHeaders = await getAuthHeaders();
      const response = await fetch(`${API_BASE}/api/export-zip`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders
        },
        body: JSON.stringify({ urls: results })
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        if (response.status === 401) signOut();
        throw new Error(errorData.error || 'Failed to export ZIP');
      }
      
      const blob = await response.blob();
      const exportDuration = Date.now() - exportStartTime;
      
      console.log(`[${new Date().toISOString()}] [FRONTEND] ZIP received:`, {
        size: `${(blob.size / 1024).toFixed(2)} KB`,
        totalTime: `${exportDuration}ms`
      });
      
      saveAs(blob, 'ideogramfire-images.zip');
      
      console.log(`[${new Date().toISOString()}] [FRONTEND] ZIP export complete in ${exportDuration}ms`);
      console.log(`[${new Date().toISOString()}] [FRONTEND] ========== ZIP EXPORT COMPLETE ==========`);
    } catch (err) {
      const errorTimestamp = new Date().toISOString();
      console.error(`[${errorTimestamp}] [FRONTEND] ========== ZIP EXPORT ERROR ==========`);
      console.error(`[${errorTimestamp}] [FRONTEND] Error exporting zip:`, err);
      console.error(`[${errorTimestamp}] [FRONTEND] Error Message:`, err.message);
      console.error(`[${errorTimestamp}] [FRONTEND] Error Stack:`, err.stack);
      setError('Failed to export images as zip.');
    } finally {
      setLoading(false);
      console.log(`[${new Date().toISOString()}] [FRONTEND] Loading state set to false after export`);
    }
  };

  const isPaidMode = creativeMode === 'paid';
  const verticalPlaceholder = isPaidMode
    ? 'e.g. ads, social, etc.'
    : 'e.g. lifestyle, education, stories, etc.';
  const anglePlaceholder = isPaidMode
    ? 'e.g. money back, savings, government incentives, health subsidies, etc. (optional)'
    : 'e.g. curiosity, relatability, personal story, myth-busting, etc. (optional)';
  const headerTitle = 'PPC Image Generator';
  const modeIndicator = isPaidMode
    ? 'Mode: Paid Ads · Conversion-focused'
    : 'Mode: Organic Content · Engagement-first';

  // Hard gate: never render generator unless Supabase is configured and user is authenticated.
  const isProductionRender = typeof window !== 'undefined' && window.location.hostname.includes('onrender.com');
  if (!isSupabaseConfigured) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-900 to-indigo-950 flex items-center justify-center p-4">
        <div className="glass-card max-w-md p-6 text-center">
          {isProductionRender && (
            <p className="text-red-400 font-semibold mb-2">
              Production: Supabase not configured. Generator is blocked.
            </p>
          )}
          <p className="text-[var(--text-secondary)]">
            Supabase not configured. Set REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_ANON_KEY in Render environment and rebuild.
          </p>
        </div>
      </div>
    );
  }
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-900 to-indigo-950 flex items-center justify-center">
        <p className="text-[var(--text-primary)]">Loading...</p>
      </div>
    );
  }
  if (!user) {
    return <AuthScreen />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-900 to-indigo-950 py-4 md:py-2" key={user?.id}>
      <div className="max-w-3xl mx-auto px-4 py-3 md:py-1">
        <div className="glass-card form-card overflow-hidden">
          <div className="mode-card-header generator-header">
            <div className="app-header-row">
              <div className="app-header-left">
                <img src={logo} alt="Ifficient" className="app-header-logo flex-shrink-0" />
                <div className="min-w-0">
                  <h1 className="gradient-text-enhanced gradient-title text-xl md:text-2xl">{headerTitle}</h1>
                  <p className="text-[var(--text-secondary)] text-sm mt-0.5">{modeIndicator}</p>
                </div>
              </div>
              <div className="app-header-right">
                <div
                  className="inline-flex rounded-full border border-[var(--glass-border)] glass-morphism p-0.5"
                  style={{ opacity: loading ? 0.6 : 1, pointerEvents: loading ? 'none' : 'auto' }}
                >
                  <button
                    type="button"
                    onClick={() => handleModeToggle(null, 'paid')}
                    className={`px-4 py-1.5 text-sm font-medium rounded-full transition-all duration-200 ${
                      creativeMode === 'paid'
                        ? 'toggle-pill-selected'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/10'
                    }`}
                  >
                    Paid Ads
                  </button>
                  <button
                    type="button"
                    onClick={() => handleModeToggle(null, 'organic')}
                    className={`px-4 py-1.5 text-sm font-medium rounded-full transition-all duration-200 ${
                      creativeMode === 'organic'
                        ? 'toggle-pill-selected'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/10'
                    }`}
                  >
                    Organic Content
                  </button>
                </div>
                <button
                  type="button"
                  onClick={signOut}
                  className="text-[var(--text-primary)] text-sm font-medium opacity-90 hover:opacity-100 transition px-3 py-1.5 rounded-lg hover:bg-white/10 flex-shrink-0"
                >
                  Log out
                </button>
              </div>
            </div>
            {loading && (
              <p className="text-[var(--text-secondary)] text-xs mt-3 text-right">Processing… please wait</p>
            )}
          </div>
          <div className="p-6 md:p-8">
            <form onSubmit={handleSubmit} className="grid gap-4">
              <label className="block cursor-pointer">
                <span className="flex flex-col gap-1.5 p-4 rounded-xl border-2 border-dashed border-slate-400/55 bg-[rgba(15,23,42,0.35)] hover:border-white/85 hover:bg-[rgba(15,23,42,0.55)] transition-all duration-200 text-left">
                  <span className="font-semibold text-[var(--text-primary)]">
                    {image ? `Image Selected: ${image.name}` : 'Drag & drop an image or click to upload'}
                  </span>
                  <span className="text-sm text-[var(--text-secondary)]">
                    PNG, JPG, JPEG, GIF, WEBP · max 5MB
                  </span>
                </span>
                <input type="file" className="hidden" accept="image/*" onChange={handleImageChange} />
              </label>
              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">Vertical</label>
                <input
                  type="text"
                  className="input-enhanced"
                  value={vertical}
                  onChange={handleVerticalChange}
                  placeholder={verticalPlaceholder}
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">Angle</label>
                <input
                  type="text"
                  className="input-enhanced"
                  value={angle}
                  onChange={handleAngleChange}
                  placeholder={anglePlaceholder}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">Age Group</label>
                <input
                  type="text"
                  className="input-enhanced"
                  value={ageGroup}
                  onChange={handleAgeGroupChange}
                  placeholder="e.g. 18-35, all ages, etc."
                />
              </div>
              <div className="flex gap-3 flex-wrap">
                <button type="submit" className="btn-primary" disabled={loading}>
                  {loading ? 'Generating...' : 'Generate'}
                </button>
                {results.length > 0 && (
                  <button
                    type="button"
                    onClick={handleExportAll}
                    className="border border-white/30 rounded-xl px-4 py-2 text-sm font-medium text-[var(--text-primary)] bg-transparent hover:bg-white/10 transition-all duration-200"
                  >
                    Export All
                  </button>
                )}
              </div>
            </form>
            {error && <div className="error mt-4">{error}</div>}
            {loading && <div className="loading mt-3">Processing...</div>}
          </div>
        </div>

        {results.length > 0 && (
          <div className="mt-8">
            <h2 className="gradient-text-enhanced text-xl font-semibold mb-4">Generated Images</h2>
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
              {results.map((url, idx) => {
                const renderTimestamp = new Date().toISOString();
                if (idx === 0) {
                  console.log(`[${renderTimestamp}] [FRONTEND] ========== RENDERING IMAGES START ==========`);
                  console.log(`[${renderTimestamp}] [FRONTEND] Rendering ${results.length} images`);
                }

                const handleImageLoad = () => {
                  console.log(`[${new Date().toISOString()}] [FRONTEND] Image ${idx + 1}/${results.length} loaded successfully:`, url.substring(0, 80) + '...');
                };

                const handleImageError = (e) => {
                  console.error(`[${new Date().toISOString()}] [FRONTEND] Image ${idx + 1}/${results.length} failed to load:`, url);
                  console.error(`[${new Date().toISOString()}] [FRONTEND] Error event:`, e);
                };

                if (idx === results.length - 1) {
                  setTimeout(() => {
                    console.log(`[${new Date().toISOString()}] [FRONTEND] All ${results.length} images rendered in DOM`);
                    console.log(`[${new Date().toISOString()}] [FRONTEND] ========== RENDERING IMAGES COMPLETE ==========`);
                  }, 0);
                }

                return (
                  <div key={url} className="glass-card overflow-hidden hover:shadow-xl transition-shadow duration-200">
                    <img
                      src={url}
                      alt={`Generated ${idx + 1}`}
                      onLoad={handleImageLoad}
                      onError={handleImageError}
                      className="w-full h-48 object-cover"
                    />
                    <div className="p-3 flex justify-between items-center">
                      <span className="text-sm text-[var(--text-secondary)]">Image {idx + 1}</span>
                      <button
                        type="button"
                        className="btn-primary download-btn text-sm py-1.5 px-3"
                        onClick={() => handleDownloadImage(url, idx)}
                      >
                        Download
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App; 