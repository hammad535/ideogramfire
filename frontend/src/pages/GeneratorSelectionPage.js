import React from 'react';
import logo from '../assets/logo.png';
import { supabase } from '../supabaseClient';

function signOut() {
  if (supabase) supabase.auth.signOut({ scope: 'local' });
}

function GeneratorSelectionPage() {
  return (
    <div className="page-shell flex flex-col items-center justify-center p-4">
      <div className="main-container flex flex-col items-center justify-center relative">
        <div className="absolute top-0 right-0 flex items-center gap-2">
          <button
            type="button"
            onClick={signOut}
            className="btn-header-action"
          >
            Log out
          </button>
        </div>
        <img src={logo} alt="Ifficient" className="h-8 w-auto mb-6" />
        <h1 className="page-title gradient-text-enhanced text-2xl md:text-3xl font-bold mb-2 text-center">PPC Image Generator</h1>
        <p className="text-[var(--text-secondary)] text-sm mb-8 text-center">Choose a generator</p>

        <div className="grid gap-6 w-full max-w-md">
          <button
            type="button"
            onClick={() => { window.location.hash = '#/image-ads'; }}
            className="glass-card w-full p-8 text-left hover:shadow-xl transition-all duration-200 border border-[var(--glass-border)] rounded-2xl card-hover"
          >
            <h2 className="gradient-text-enhanced text-xl font-semibold mb-2">Image Ads Generator</h2>
            <p className="text-[var(--text-secondary)] text-sm">Create PPC images from uploads. Paid Ads & Organic Content modes.</p>
          </button>

          <button
            type="button"
            onClick={() => { window.location.hash = '#/video-ads'; }}
            className="glass-card w-full p-8 text-left hover:shadow-xl transition-all duration-200 border border-[var(--glass-border)] rounded-2xl card-hover"
          >
            <h2 className="gradient-text-enhanced text-xl font-semibold mb-2">Video Ads Generator</h2>
            <p className="text-[var(--text-secondary)] text-sm">Generate video segments. Standard, Continuation, Standard Plus, New Continuation.</p>
          </button>
        </div>
      </div>
    </div>
  );
}

export default GeneratorSelectionPage;
