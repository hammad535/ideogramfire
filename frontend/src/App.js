import React, { useState, useEffect } from 'react';
import './App.css';
import promptGuide from './PromptFORGPT';
import { saveAs } from 'file-saver';
import {
  Box,
  Button,
  Card,
  CardContent,
  Container,
  ToggleButton,
  ToggleButtonGroup,
  TextField,
  Typography
} from '@mui/material';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { supabase, isSupabaseConfigured } from './supabaseClient';
import { getAuthHeaders } from './authHeaders';
import { API_BASE } from './apiBase';
import AuthScreen from './AuthScreen';

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

  // Auth: on mount get session, then subscribe to changes. Strict gate: no user = login screen.
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      setAuthLoading(false);
      return;
    }
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
      setAuthLoading(false);
    })();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

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
  const headerTitle = isPaidMode ? 'Paid Ads Generator' : 'Organic Content Generator';
  const modeIndicator = isPaidMode
    ? 'Mode: Paid Ads · Conversion-focused'
    : 'Mode: Organic Content · Engagement-first';
  const accentGradient = isPaidMode
    ? 'linear-gradient(135deg,rgb(120, 136, 67) 0%,rgb(142, 161, 67) 50%,rgb(235, 235, 32) 100%)'
    : 'linear-gradient(135deg, #0f766e 0%, #14b8a6 50%, #22c55e 100%)';
  const accentColor = isPaidMode ? '#6366f1' : '#0f766e';
  const buttonColor = isPaidMode ? 'rgb(152, 151, 94)' : '#0f766e';
  const buttonHover = isPaidMode ? 'rgb(120, 120, 74)' : '#0d9488';
  const secondaryColor = isPaidMode ? '#312e81' : '#134e4a';

  // Strict login gating: config missing -> message; loading -> spinner; no user -> login; else generator
  if (!isSupabaseConfigured) {
    return (
      <ThemeProvider theme={createTheme({ palette: { mode: 'dark' } })}>
        <Container maxWidth="sm" sx={{ py: 4, textAlign: 'center' }}>
          <Typography color="text.secondary">
            Set REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_ANON_KEY in frontend/.env to enable login.
          </Typography>
        </Container>
      </ThemeProvider>
    );
  }
  if (authLoading) {
    return (
      <ThemeProvider theme={createTheme({ palette: { mode: 'dark' } })}>
        <Container maxWidth="md" sx={{ py: 4, textAlign: 'center' }}>
          <Typography>Loading...</Typography>
        </Container>
      </ThemeProvider>
    );
  }
  if (!user) {
    return <AuthScreen />;
  }

  const theme = createTheme({
    palette: {
      mode: 'dark',
      primary: { main: accentColor },
      secondary: { main: secondaryColor },
      background: { default: '#0b1220', paper: '#0f172a' },
      text: { primary: '#e2e8f0', secondary: '#94a3b8' }
    },
    typography: {
      fontFamily: '"Inter", "system-ui", "Segoe UI", sans-serif',
      h3: { fontWeight: 700, letterSpacing: '-0.02em' },
      h5: { fontWeight: 600 },
      body1: { fontSize: '1rem' },
      body2: { fontSize: '0.95rem' }
    },
    shape: { borderRadius: 16 }
  });

  return (
    <ThemeProvider theme={theme}>
      <Container maxWidth="md" sx={{ py: { xs: 3, md: 1 } }}>
        <Card elevation={12} className="form-card">
          <Box className="mode-card-header" sx={{ background: accentGradient, position: 'relative' }}>
            <Box sx={{ position: 'absolute', top: 20, right: 24, display: 'flex', alignItems: 'center', gap: 1 }}>
              <Button
                size="small"
                onClick={signOut}
                sx={{ color: 'rgba(255,255,255,0.9)', textTransform: 'none', minWidth: 0, px: 1 }}
              >
                Log out
              </Button>
              <ToggleButtonGroup
                exclusive
                value={creativeMode}
                onChange={handleModeToggle}
                size="small"
                disabled={loading}
                sx={{
                  backgroundColor: 'rgba(15,23,42,0.35)',
                  borderRadius: 999,
                  border: '1px solid rgba(255,255,255,0.35)',
                  backdropFilter: 'blur(6px)',
                  opacity: loading ? 0.6 : 1,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  '& .MuiToggleButtonGroup-grouped': {
                    border: 0,
                    px: 2,
                    py: 0.6,
                    textTransform: 'none',
                    color: 'rgba(255,255,255,0.7)',
                    transition: 'all 200ms ease'
                  },
                  '& .MuiToggleButtonGroup-grouped.Mui-selected': {
                    color: '#fff',
                    backgroundColor: 'rgba(255,255,255,0.18)',
                    boxShadow: '0 8px 16px rgba(15,23,42,0.28)'
                  },
                  '& .MuiToggleButtonGroup-grouped:hover': {
                    color: '#fff',
                    backgroundColor: 'rgba(255,255,255,0.12)'
                  }
                }}
              >
                <ToggleButton value="paid">Paid Ads</ToggleButton>
                <ToggleButton value="organic">Organic Content</ToggleButton>
              </ToggleButtonGroup>
              {loading && (
                <Typography
                  variant="caption"
                  sx={{
                    display: 'block',
                    mt: 0.8,
                    color: 'rgba(255,255,255,0.75)',
                    textAlign: 'right'
                  }}
                >
                  Processing… please wait
                </Typography>
              )}
            </Box>
            <Typography variant="h4" className="gradient-title">{headerTitle}</Typography>
            <Typography
              variant="body2"
              sx={{
                color: 'rgba(255,255,255,0.78)',
                mt: 0.5
              }}
            >
              {modeIndicator}
            </Typography>
          </Box>
          <CardContent sx={{ p: { xs: 2.5, md: 3.25 } }}>
            <Box component="form" onSubmit={handleSubmit} sx={{ display: 'grid', gap: 2 }}>
              <Button
                variant="outlined"
                component="label"
                sx={{
                  textTransform: 'none',
                  borderStyle: 'dashed',
                  borderWidth: 2,
                  borderColor: 'rgba(148,163,184,0.55)',
                  py: 2,
                  px: 2.4,
                  justifyContent: 'flex-start',
                  textAlign: 'left',
                  transition: 'all 200ms ease',
                  backgroundColor: 'rgba(15,23,42,0.35)',
                  '&:hover': {
                    borderColor: 'rgba(255,255,255,0.85)',
                    backgroundColor: 'rgba(15,23,42,0.55)'
                  }
                }}
              >
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.6 }}>
                  <Typography variant="body1" sx={{ fontWeight: 600 }}>
                    {image ? `Image Selected: ${image.name}` : 'Drag & drop an image or click to upload'}
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    PNG, JPG, JPEG, GIF, WEBP · max 5MB
                  </Typography>
                </Box>
                <input type="file" hidden accept="image/*" onChange={handleImageChange} />
              </Button>
              <TextField
                label="Vertical"
                value={vertical}
                onChange={handleVerticalChange}
                placeholder={verticalPlaceholder}
                fullWidth
                autoFocus
                InputLabelProps={{ shrink: true }}
                sx={{
                  '& .MuiInputLabel-root': {
                    color: 'rgba(226,232,240,0.85)'
                  },
                  '& .MuiOutlinedInput-root': {
                    backgroundColor: 'rgba(15,23,42,0.5)',
                    transition: 'all 200ms ease',
                    '&.Mui-focused fieldset': {
                      borderColor: accentColor,
                      boxShadow: `0 0 0 4px ${accentColor}33`
                    }
                  }
                }}
              />
              <TextField
                label="Angle"
                value={angle}
                onChange={handleAngleChange}
                placeholder={anglePlaceholder}
                fullWidth
                InputLabelProps={{ shrink: true }}
                sx={{
                  '& .MuiInputLabel-root': {
                    color: 'rgba(226,232,240,0.85)'
                  },
                  '& .MuiOutlinedInput-root': {
                    backgroundColor: 'rgba(15,23,42,0.5)',
                    transition: 'all 200ms ease',
                    '&.Mui-focused fieldset': {
                      borderColor: accentColor,
                      boxShadow: `0 0 0 4px ${accentColor}33`
                    }
                  }
                }}
              />
              <TextField
                label="Age Group"
                value={ageGroup}
                onChange={handleAgeGroupChange}
                placeholder="e.g. 18-35, all ages, etc."
                fullWidth
                InputLabelProps={{ shrink: true }}
                sx={{
                  '& .MuiInputLabel-root': {
                    color: 'rgba(226,232,240,0.85)'
                  },
                  '& .MuiOutlinedInput-root': {
                    backgroundColor: 'rgba(15,23,42,0.5)',
                    transition: 'all 200ms ease',
                    '&.Mui-focused fieldset': {
                      borderColor: accentColor,
                      boxShadow: `0 0 0 4px ${accentColor}33`
                    }
                  }
                }}
              />
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <Button
                  type="submit"
                  variant="contained"
                  disabled={loading}
                  sx={{
                    textTransform: 'none',
                    px: 4,
                    py: 1.2,
                    backgroundColor: buttonColor,
                    transition: 'all 200ms ease',
                    '&:hover': {
                      backgroundColor: buttonHover,
                      transform: 'translateY(-1px)',
                      boxShadow: '0 12px 24px rgba(15,23,42,0.35)'
                    }
                  }}
                >
                  {loading ? 'Generating...' : 'Generate'}
                </Button>
                {results.length > 0 && (
                  <Button
                    type="button"
                    variant="outlined"
                    onClick={handleExportAll}
                    sx={{
                      textTransform: 'none',
                      px: 3,
                      py: 1.2,
                      transition: 'all 200ms ease'
                    }}
                  >
                    Export All
                  </Button>
                )}
              </Box>
            </Box>
            {error && (
              <Box className="error" sx={{ mt: 3 }}>
                {error}
              </Box>
            )}
            {loading && (
              <Typography className="loading" sx={{ mt: 2 }}>
                Processing...
              </Typography>
            )}
          </CardContent>
        </Card>

        {results.length > 0 && (
          <Box sx={{ mt: 4 }}>
            <Typography variant="h5" sx={{ mb: 2 }}>Generated Images</Typography>
            <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' } }}>
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
                  <Card key={url} elevation={6} sx={{ overflow: 'hidden' }}>
                    <Box
                      component="img"
                      src={url}
                      alt={`Generated ${idx + 1}`}
                      onLoad={handleImageLoad}
                      onError={handleImageError}
                      sx={{ width: '100%', height: 200, objectFit: 'cover' }}
                    />
                    <CardContent sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="body2" color="text.secondary">
                        Image {idx + 1}
                      </Typography>
                      <Button
                        size="small"
                        variant="contained"
                        className="download-btn"
                        onClick={() => handleDownloadImage(url, idx)}
                        sx={{ textTransform: 'none' }}
                      >
                        Download
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </Box>
          </Box>
        )}
      </Container>
    </ThemeProvider>
  );
}

export default App; 