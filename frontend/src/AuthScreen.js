import React, { useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Container,
  TextField,
  Typography
} from '@mui/material';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import { supabase, isSupabaseConfigured } from './supabaseClient';

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: '#14b8a6' },
    background: { default: '#0b1220', paper: '#0f172a' },
    text: { primary: '#e2e8f0', secondary: '#94a3b8' }
  },
  shape: { borderRadius: 16 }
});

function AuthScreen({ onAuthenticated }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!email.trim() || !password) {
      setError('Please enter email and password.');
      return;
    }
    if (!isSupabaseConfigured || !supabase) {
      setError('Auth is not configured. Add REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_ANON_KEY.');
      return;
    }
    setLoading(true);
    try {
      if (isSignUp) {
        const { data, error: signUpError } = await supabase.auth.signUp({ email: email.trim(), password });
        if (signUpError) throw signUpError;
        setError('Check your email to confirm your account, then sign in.');
        return;
      }
      const { data, error: signInError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (signInError) throw signInError;
      if (onAuthenticated) onAuthenticated(data.user);
    } catch (err) {
      setError(err.message || 'Login failed.');
    } finally {
      setLoading(false);
    }
  };

  if (!isSupabaseConfigured) {
    return (
      <ThemeProvider theme={theme}>
        <Container maxWidth="sm" sx={{ py: 4 }}>
          <Card elevation={12} sx={{ p: 3 }}>
            <Typography color="error">
              Auth is not configured. Set REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_ANON_KEY in frontend/.env
            </Typography>
          </Card>
        </Container>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider theme={theme}>
      <Container maxWidth="sm" sx={{ py: 4 }}>
        <Card elevation={12} sx={{ overflow: 'hidden' }}>
          <Box sx={{ background: 'linear-gradient(135deg, #0f766e 0%, #14b8a6 50%, #22c55e 100%)', p: 2.5 }}>
            <Typography variant="h5" sx={{ color: 'white', fontWeight: 600 }}>
              IdeogramFIRE
            </Typography>
            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.85)' }}>
              Sign in to use the creative engine
            </Typography>
          </Box>
          <CardContent sx={{ p: 3 }}>
            <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField
                label="Email"
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(''); }}
                fullWidth
                autoComplete="email"
                required
              />
              <TextField
                label="Password"
                type="password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(''); }}
                fullWidth
                autoComplete={isSignUp ? 'new-password' : 'current-password'}
                required
              />
              {error && (
                <Typography color="error" variant="body2" sx={{ mt: 0.5 }}>
                  {error}
                </Typography>
              )}
              <Button
                type="submit"
                variant="contained"
                disabled={loading}
                sx={{ mt: 1, py: 1.2, textTransform: 'none' }}
              >
                {loading ? 'Please wait...' : (isSignUp ? 'Sign up' : 'Sign in')}
              </Button>
              <Button
                type="button"
                variant="text"
                size="small"
                onClick={() => { setIsSignUp(!isSignUp); setError(''); }}
                sx={{ textTransform: 'none' }}
              >
                {isSignUp ? 'Already have an account? Sign in' : 'Need an account? Sign up'}
              </Button>
            </Box>
          </CardContent>
        </Card>
      </Container>
    </ThemeProvider>
  );
}

export default AuthScreen;
