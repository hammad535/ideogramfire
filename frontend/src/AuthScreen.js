import React, { useState } from 'react';
import { Box, Button, Card, CardContent, TextField, Typography } from '@mui/material';
import { supabase } from './supabaseClient';

export default function AuthScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', error: false });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage({ text: '', error: false });
    setLoading(true);
    const ts = new Date().toISOString();
    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({ email, password });
        console.log(`[${ts}] [Auth] signUp:`, data?.user?.email, error?.message || 'ok');
        if (error) throw error;
        setMessage({ text: 'Check your email to confirm sign up.', error: false });
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        console.log(`[${ts}] [Auth] signIn:`, data?.user?.email, error?.message || 'ok');
        if (error) throw error;
      }
    } catch (err) {
      console.error(`[${ts}] [Auth] Error:`, err.message);
      setMessage({ text: err.message || 'Something went wrong', error: true });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: 2
      }}
    >
      <Card sx={{ maxWidth: 400, width: '100%' }}>
        <CardContent sx={{ p: 3 }}>
          <Typography variant="h5" gutterBottom>
            {isSignUp ? 'Sign up' : 'Log in'}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            IdeogramFIRE
          </Typography>
          <form onSubmit={handleSubmit}>
            <TextField
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              fullWidth
              required
              margin="normal"
              autoComplete="email"
            />
            <TextField
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              fullWidth
              required
              margin="normal"
              autoComplete={isSignUp ? 'new-password' : 'current-password'}
            />
            {message.text && (
              <Typography
                variant="body2"
                sx={{ mt: 1, color: message.error ? 'error.main' : 'text.secondary' }}
              >
                {message.text}
              </Typography>
            )}
            <Button
              type="submit"
              variant="contained"
              fullWidth
              disabled={loading}
              sx={{ mt: 2 }}
            >
              {loading ? 'Please wait...' : isSignUp ? 'Sign up' : 'Log in'}
            </Button>
            <Button
              type="button"
              variant="text"
              fullWidth
              onClick={() => { setIsSignUp(!isSignUp); setMessage({ text: '', error: false }); }}
              sx={{ mt: 1 }}
            >
              {isSignUp ? 'Already have an account? Log in' : "Don't have an account? Sign up"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </Box>
  );
}
