import React, { useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from './supabaseClient';
import logo from './assets/logo.png';

const DOMAIN_RESTRICTION_MESSAGE = 'Only @iefficient.com emails are allowed to sign up.';

function isDomainRestrictionError(message) {
  if (!message || typeof message !== 'string') return false;
  const lower = message.toLowerCase();
  return (
    lower.includes('database error saving new user') ||
    lower.includes('only @iefficient.com emails are allowed') ||
    lower.includes('not allowed') ||
    lower.includes('failed to create user')
  );
}

function AuthScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);

  useEffect(() => {
    document.title = 'PPC Image Generator';
  }, []);

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
      if (data?.user) {
        /* Auth state will update via onAuthStateChange in App.js */
      }
    } catch (err) {
      const message = err.message || 'Login failed.';
      if (isSignUp && isDomainRestrictionError(message)) {
        setError(DOMAIN_RESTRICTION_MESSAGE);
      } else {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  };

  if (!isSupabaseConfigured) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="glass-card max-w-md w-full p-6">
          <p className="text-red-400 text-sm">
            Auth is not configured. Set REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_ANON_KEY in frontend/.env
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-slate-900 via-slate-900 to-indigo-950">
      <div className="glass-card w-full max-w-md overflow-hidden">
        <div className="p-6 pb-4">
          <img src={logo} alt="Ifficient" className="h-[38px] w-auto mb-3" />
          <h1 className="gradient-text-enhanced text-2xl mb-1">Ifficient PPC Image Generator</h1>
          <p className="text-slate-300 text-sm">Sign in to use the PPC image generator</p>
        </div>
        <div className="p-6 pt-2">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label htmlFor="auth-email" className="block text-sm font-medium text-slate-300 mb-1.5">
                Email
              </label>
              <input
                id="auth-email"
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(''); }}
                className="input-enhanced"
                autoComplete="email"
                required
              />
            </div>
            <div>
              <label htmlFor="auth-password" className="block text-sm font-medium text-slate-300 mb-1.5">
                Password
              </label>
              <input
                id="auth-password"
                type="password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(''); }}
                className="input-enhanced"
                autoComplete={isSignUp ? 'new-password' : 'current-password'}
                required
              />
            </div>
            {error && (
              <p className="text-red-400 text-sm">{error}</p>
            )}
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-3 mt-1"
            >
              {loading ? 'Please wait...' : (isSignUp ? 'Sign up' : 'Sign in')}
            </button>
            <button
              type="button"
              onClick={() => { setIsSignUp(!isSignUp); setError(''); }}
              className="text-slate-400 hover:text-slate-300 text-sm text-center py-2 transition-colors"
            >
              {isSignUp ? 'Already have an account? Sign in' : 'Need an account? Sign up'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default AuthScreen;
