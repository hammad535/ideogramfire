import React, { useState } from 'react';
import ScriptForm from '../../components/ScriptForm';
import { generateSegments } from './apiStandard';
import { generateSegmentsPlus } from './apiPlus';
import ResultsDisplay from './ResultsDisplay';
import ResultsDisplayPlus from './ResultsDisplayPlus';
import DownloadButton from './DownloadButton';
import DownloadButtonPlus from './DownloadButtonPlus';
import ContinuationMode from './ContinuationMode';
import NewContinuationMode from './NewContinuationMode';
import { supabase } from '../../supabaseClient';
import logo from '../../assets/logo.png';

function signOut() {
  if (supabase) supabase.auth.signOut({ scope: 'local' });
}

const TABS = [
  { id: 'standard', label: 'Standard Generation' },
  { id: 'continuation', label: 'Continuation Mode' },
  { id: 'standard-plus', label: 'Standard Plus' },
  { id: 'new-cont', label: 'New Continuation Mode' },
];

function VideoAdsPage() {
  const [activeTab, setActiveTab] = useState('standard');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [results, setResults] = useState(null);

  const handleSubmitStandard = async (formData) => {
    setLoading(true);
    setError(null);
    setResults(null);
    try {
      const response = await generateSegments(formData);
      setResults({ ...response, settings: formData });
    } catch (err) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitPlus = async (formData) => {
    setLoading(true);
    setError(null);
    setResults(null);
    try {
      const response = await generateSegmentsPlus(formData);
      setResults({ ...response, settings: formData });
    } catch (err) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    setResults(null);
    setError(null);
  };

  return (
    <div className="page-shell py-4 md:py-2">
      <div className="main-container">
        <div className="glass-card form-card overflow-hidden">
          <div className="mode-card-header generator-header app-header-row">
            <div className="app-header-left">
              <img src={logo} alt="Ifficient" className="app-header-logo flex-shrink-0" />
              <div className="min-w-0">
                <h1 className="gradient-text-enhanced gradient-title text-xl md:text-2xl">Video Ads Segment Generator</h1>
                <p className="text-[var(--text-secondary)] text-sm mt-0.5">Generate segments for video ads</p>
              </div>
            </div>
            <div className="app-header-right">
              <button
                type="button"
                onClick={() => { window.location.hash = '#/select-generator'; }}
                className="btn-header-action"
              >
                Back to selection
              </button>
              <button
                type="button"
                onClick={signOut}
                className="btn-header-action"
              >
                Log out
              </button>
            </div>
          </div>

          <div className="tabs-row">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleTabChange(tab.id)}
                className={`tab-pill ${activeTab === tab.id ? 'tab-pill-active' : ''}`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="p-6 md:p-8">
            {activeTab === 'standard' && (
              <>
                {!results ? (
                  <ScriptForm onSubmit={handleSubmitStandard} loading={loading} />
                ) : (
                  <>
                    <ResultsDisplay results={results} />
                    <DownloadButton segments={results.segments} metadata={results.metadata} />
                    <button type="button" className="btn-primary mt-4" onClick={() => setResults(null)}>Generate New Script</button>
                  </>
                )}
                {error && <p className="text-red-400 text-sm mt-4">{error}</p>}
              </>
            )}

            {activeTab === 'continuation' && <ContinuationMode />}
            {activeTab === 'standard-plus' && (
              <>
                {!results ? (
                  <ScriptForm onSubmit={handleSubmitPlus} loading={loading} />
                ) : (
                  <>
                    <ResultsDisplayPlus results={results} />
                    <DownloadButtonPlus segments={results.segments} metadata={results.metadata} />
                    <button type="button" className="btn-primary mt-4" onClick={() => setResults(null)}>Generate New Script</button>
                  </>
                )}
                {error && <p className="text-red-400 text-sm mt-4">{error}</p>}
              </>
            )}
            {activeTab === 'new-cont' && <NewContinuationMode />}
          </div>
        </div>
      </div>
    </div>
  );
}

export default VideoAdsPage;
