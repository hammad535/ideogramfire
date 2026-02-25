import React, { useState } from 'react';
import { downloadSegments } from './apiStandard';

function DownloadButton({ segments, metadata }) {
  const [showFormats, setShowFormats] = useState(false);

  const handleDownload = async (format = 'zip') => {
    try {
      if (format === 'zip') {
        await downloadSegments(segments);
      } else if (format === 'json') {
        downloadJSON();
      } else if (format === 'csv') {
        downloadCSV();
      } else if (format === 'pdf') {
        downloadPDF();
      }
    } catch (error) {
      alert('Failed to download segments. Please try again.');
    }
  };

  const downloadJSON = () => {
    const data = { metadata: metadata || {}, segments, generatedAt: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `veo3-segments-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const downloadCSV = () => {
    const headers = ['Segment Number', 'Duration', 'Script Text', 'Word Count', 'Character State', 'Location', 'Camera Position'];
    const rows = segments.map(segment => [
      segment.segment_info?.segment_number || '',
      segment.segment_info?.duration || '00:00-00:08',
      `"${(segment.action_timeline?.dialogue || '').replace(/"/g, '""')}"`,
      segment.action_timeline?.dialogue?.split(/\s+/).length || 0,
      `"${(segment.character_description?.current_state || '').replace(/"/g, '""')}"`,
      segment.segment_info?.location || '',
      segment.scene_continuity?.camera_position || ''
    ]);
    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `veo3-segments-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadPDF = () => {
    const pdfContent = `<!DOCTYPE html><html><head><title>Veo 3 Script Segments</title><style>body{font-family:Arial;margin:40px}.segment{margin-bottom:30px;border:1px solid #ddd;padding:20px}</style></head><body><h1>Veo 3 Script Segments</h1><p>Generated: ${new Date().toLocaleString()}</p><p>Total: ${segments.length}</p>${segments.map(s => `<div class="segment"><h2>Segment ${s.segment_info?.segment_number || 'N/A'}</h2><p>${s.action_timeline?.dialogue || ''}</p><p>Location: ${s.segment_info?.location || 'N/A'}</p></div>`).join('')}</body></html>`;
    const w = window.open('', '_blank');
    w.document.write(pdfContent);
    w.document.close();
    setTimeout(() => w.print(), 250);
  };

  return (
    <div className="download-section">
      <button className="download-button btn-primary" onClick={() => setShowFormats(!showFormats)}>Download Segments</button>
      {showFormats && (
        <div className="download-formats" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
          <button type="button" className="btn-primary" onClick={() => handleDownload('zip')}>ZIP</button>
          <button type="button" className="btn-primary" onClick={() => handleDownload('json')}>JSON</button>
          <button type="button" className="btn-primary" onClick={() => handleDownload('csv')}>CSV</button>
          <button type="button" className="btn-primary" onClick={() => handleDownload('pdf')}>PDF</button>
        </div>
      )}
    </div>
  );
}

export default DownloadButton;
