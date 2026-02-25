import React from 'react';
import logo from '../assets/logo.png';
import { supabase } from '../supabaseClient';

function signOut() {
  if (supabase) supabase.auth.signOut({ scope: 'local' });
}

function GeneratorSelectionPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-900 to-indigo-950 flex flex-col items-center justify-center p-4">
      <div className="absolute top-4 right-4">
        <button
          type="button"
          onClick={signOut}
          className="text-[var(--text-primary)] text-sm font-medium opacity-90 hover:opacity-100 transition px-3 py-1.5 rounded-lg hover:bg-white/10"
        >
          Log out
        </button>
      </div>
      <img src={logo} alt="Ifficient" className="h-[32px] w-auto mb-6" />
      <h1 className="gradient-text-enhanced text-2xl md:text-3xl font-bold mb-2 text-center">PPC Image Generator</h1>
      <p className="text-[var(--text-secondary)] text-sm mb-8 text-center">Choose a generator</p>

      <div className="grid gap-6 w-full max-w-md">
        <button
          type="button"
          onClick={() => { window.location.hash = '#/image-ads'; }}
          className="glass-card w-full p-8 text-left hover:shadow-xl transition-all duration-200 border border-[var(--glass-border)] rounded-2xl"
        >
          <h2 className="gradient-text-enhanced text-xl font-semibold mb-2">Image Ads Generator</h2>
          <p className="text-[var(--text-secondary)] text-sm">Create PPC images from uploads. Paid Ads & Organic Content modes.</p>
        </button>

        <button
          type="button"
          onClick={() => { window.location.hash = '#/video-ads'; }}
          className="glass-card w-full p-8 text-left hover:shadow-xl transition-all duration-200 border border-[var(--glass-border)] rounded-2xl"
        >
          <h2 className="gradient-text-enhanced text-xl font-semibold mb-2">Video Ads Generator</h2>
          <p className="text-[var(--text-secondary)] text-sm">Generate video segments. Standard, Continuation, Standard Plus, New Continuation.</p>
        </button>
      </div>
    </div>
  );
}

export default GeneratorSelectionPage;
