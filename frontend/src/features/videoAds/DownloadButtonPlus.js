import React, { useState } from 'react';
import { downloadSegmentsPlus } from './apiPlus';

function DownloadButtonPlus({ segments, metadata }) {
  const [showFormats, setShowFormats] = useState(false);

  const handleDownload = async (format = 'zip') => {
    try {
      if (format === 'zip') {
        await downloadSegmentsPlus(segments);
      } else {
        const data = { metadata: metadata || {}, segments, generatedAt: new Date().toISOString() };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `veo3-segments-plus-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      alert('Failed to download. Please try again.');
    }
  };

  return (
    <div className="download-section">
      <button type="button" className="btn-primary" onClick={() => setShowFormats(!showFormats)}>Download Segments</button>
      {showFormats && (
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <button type="button" className="btn-primary" onClick={() => handleDownload('zip')}>ZIP</button>
          <button type="button" className="btn-primary" onClick={() => handleDownload('json')}>JSON</button>
        </div>
      )}
    </div>
  );
}

export default DownloadButtonPlus;
