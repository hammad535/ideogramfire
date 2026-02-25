import React, { useState, useEffect } from 'react';
import SettingsDisplay from '../../components/SettingsDisplay';
import JSONEditor from './JSONEditor';

function ResultsDisplay({ results }) {
  const { segments, metadata, settings } = results;
  const [displayedSegments, setDisplayedSegments] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [editingSegmentIndex, setEditingSegmentIndex] = useState(null);
  const [localSegments, setLocalSegments] = useState([]);
  const [expandedJsonIndex, setExpandedJsonIndex] = useState(null);
  const [copyFeedbackIndex, setCopyFeedbackIndex] = useState(null);

  useEffect(() => {
    setDisplayedSegments([]);
    setCurrentIndex(0);
    setLocalSegments(segments || []);
  }, [segments]);

  useEffect(() => {
    if (segments && segments.length > 0 && currentIndex < segments.length) {
      const t = setTimeout(() => {
        setDisplayedSegments((prev) => [...prev, segments[currentIndex]]);
        setCurrentIndex((prev) => prev + 1);
      }, 400);
      return () => clearTimeout(t);
    }
  }, [segments, currentIndex]);

  const handleSegmentUpdate = (index, updatedSegment) => {
    const newSegments = [...localSegments];
    newSegments[index] = updatedSegment;
    setLocalSegments(newSegments);
    const newDisplayed = [...displayedSegments];
    newDisplayed[index] = updatedSegment;
    setDisplayedSegments(newDisplayed);
    setEditingSegmentIndex(null);
  };

  const getScriptWordCount = (segment) => {
    const dialogue = segment?.action_timeline?.dialogue || '';
    return dialogue.trim() ? dialogue.split(/\s+/).length : 0;
  };

  const formatSegmentTime = (segment, index) => {
    const dur = segment?.segment_info?.duration;
    if (dur && typeof dur === 'string') return dur;
    const segNum = segment?.segment_info?.segment_number ?? index + 1;
    const start = (segNum - 1) * 8;
    const end = segNum * 8;
    return `00:${String(Math.floor(start / 60)).padStart(2, '0')}:${String(start % 60).padStart(2, '0')}-00:${String(Math.floor(end / 60)).padStart(2, '0')}:${String(end % 60).padStart(2, '0')}`;
  };

  const downloadSegmentJson = (segment, index) => {
    const blob = new Blob([JSON.stringify(segment, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `segment_${String(index + 1).padStart(2, '0')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const copySegmentJson = (segment, index) => {
    const json = JSON.stringify(segment, null, 2);
    navigator.clipboard.writeText(json).then(() => {
      setCopyFeedbackIndex(index);
      setTimeout(() => setCopyFeedbackIndex(null), 2000);
    }).catch(() => {});
  };

  const segList = displayedSegments.length ? displayedSegments : (localSegments.length ? localSegments : []);

  return (
    <div className="results-container standard-results">
      <h2 className="results-main-title section-title">Generated Segments</h2>

      <div className="results-metadata">
        <p><strong>Total Segments:</strong> {metadata?.totalSegments ?? segList.length}</p>
        <p><strong>Estimated Duration:</strong> {metadata?.estimatedDuration ?? segList.length * 8} seconds</p>
        <p><strong>Character ID:</strong> {metadata?.characterId ?? '—'}</p>
      </div>

      {settings && (
        <>
          <hr className="results-section-divider" />
          <SettingsDisplay settings={settings} />
        </>
      )}

      <hr className="results-section-divider" />
      <h3 className="section-title">Segments</h3>
      <div className="segments-list">
        {segList.map((segment, index) => {
          const scriptText = segment?.action_timeline?.dialogue || 'N/A';
          const wordCount = getScriptWordCount(segment);
          const location = segment?.segment_info?.location ?? segment?.segment_info?.location_override ?? 'N/A';
          const camera = segment?.scene_continuity?.camera_position ?? segment?.scene_continuity?.environment ?? 'N/A';
          const characterState = segment?.character_description?.current_state ?? segment?.character_description?.character_state ?? 'N/A';
          const voiceMatching = segment?.character_description?.voice_matching ?? 'N/A';
          const isExpanded = expandedJsonIndex === index;

          const segNum = segment?.segment_info?.segment_number ?? index + 1;
          const durationStr = formatSegmentTime(segment, index);
          const segmentForJson = localSegments[index] ?? segment;

          return (
            <div key={index} className="segment-card card-base">
              <div className="segment-card-header cardHeader">
                <div className="segment-card-header-left">
                  <h3 className="segment-card-title">Segment {segNum}</h3>
                  <span className="pill pill-duration">{durationStr}</span>
                  <span className="pill pill-words">{wordCount} words</span>
                </div>
                <div className="segment-card-actions">
                  <button type="button" className="btn-segment-edit" onClick={() => setEditingSegmentIndex(index)}>Edit</button>
                  <button type="button" className="btn-segment-save" onClick={() => setEditingSegmentIndex(index)}>Save</button>
                  <button type="button" className="btn-segment-download" onClick={() => downloadSegmentJson(segmentForJson, index)}>Download</button>
                </div>
              </div>

              <div className="segment-card-body">
                <div className="segment-detail segment-detail-script">
                  <span className="segment-detail-label">Script</span>
                  <div className="segment-detail-content">{scriptText}</div>
                </div>
                <div className="segment-detail">
                  <span className="segment-detail-label">Location</span>
                  <div className="segment-detail-content">{location}</div>
                </div>
                <div className="segment-detail">
                  <span className="segment-detail-label">Camera</span>
                  <div className="segment-detail-content">{typeof camera === 'string' ? camera : JSON.stringify(camera)}</div>
                </div>
                <div className="segment-detail">
                  <span className="segment-detail-label">Character State</span>
                  <div className="segment-detail-content">{typeof characterState === 'string' ? characterState : JSON.stringify(characterState)}</div>
                </div>
                <div className="segment-detail">
                  <span className="segment-detail-label">Voice Matching</span>
                  <div className="segment-detail-content">{typeof voiceMatching === 'string' ? voiceMatching : JSON.stringify(voiceMatching)}</div>
                </div>

                <div className="segment-json-toggle">
                  <button
                    type="button"
                    className="btn-view-json"
                    onClick={() => setExpandedJsonIndex(isExpanded ? null : index)}
                    aria-expanded={isExpanded}
                  >
                    <span className="json-toggle-icon">{isExpanded ? '▼' : '▶'}</span>
                    View Full JSON
                  </button>
                  {isExpanded && (
                    <div className="json-panel segment-json-content">
                      <div className="json-panel-toolbar">
                        <button
                          type="button"
                          className="btn-copy-json btn-primary"
                          onClick={() => copySegmentJson(segmentForJson, index)}
                        >
                          {copyFeedbackIndex === index ? 'Copied!' : 'Copy JSON'}
                        </button>
                      </div>
                      <pre className="segment-json-pre">{JSON.stringify(segmentForJson, null, 2)}</pre>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {editingSegmentIndex !== null && (localSegments[editingSegmentIndex] ?? segList[editingSegmentIndex]) && (
        <JSONEditor
          segment={localSegments[editingSegmentIndex] ?? segList[editingSegmentIndex]}
          onUpdate={(updated) => handleSegmentUpdate(editingSegmentIndex, updated)}
          onClose={() => setEditingSegmentIndex(null)}
        />
      )}
    </div>
  );
}

export default ResultsDisplay;
