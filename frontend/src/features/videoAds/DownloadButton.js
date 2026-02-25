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

  /** Escape a value for CSV: wrap in quotes and double internal quotes */
  const escapeCsv = (val) => {
    const s = val == null ? '' : String(val);
    return '"' + s.replace(/"/g, '""').replace(/\r/g, '').replace(/\n/g, ' ') + '"';
  };

  const downloadCSV = () => {
    const headers = ['segment_number', 'duration', 'location', 'dialogue', 'segment_json'];
    const rows = segments.map(segment => {
      const dialogue = segment.action_timeline?.dialogue || '';
      const segmentJson = JSON.stringify(segment);
      return [
        escapeCsv(segment.segment_info?.segment_number ?? ''),
        escapeCsv(segment.segment_info?.duration || '00:00-00:08'),
        escapeCsv(segment.segment_info?.location ?? ''),
        escapeCsv(dialogue),
        escapeCsv(segmentJson),
      ];
    });
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `veo3-segments-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadPDF = () => {
    const segmentBlocks = segments.map(s => {
      const num = s.segment_info?.segment_number ?? 'N/A';
      const duration = s.segment_info?.duration || '00:00-00:08';
      const location = s.segment_info?.location ?? 'N/A';
      const jsonStr = JSON.stringify(s, null, 2);
      return `<div class="segment-block" style="page-break-after:always;">
        <h2 class="segment-heading">Segment ${num}</h2>
        <p class="segment-meta"><strong>Duration:</strong> ${duration} &nbsp; <strong>Location:</strong> ${location}</p>
        <pre class="segment-json">${jsonStr.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>
      </div>`;
    });
    const pdfContent = `<!DOCTYPE html><html><head><title>Veo 3 Script Segments</title><meta charset="utf-8"><style>
      body{font-family:Arial,sans-serif;margin:24px;color:#1e293b;}
      .segment-block{margin-bottom:32px;}
      .segment-heading{font-size:1.25rem;margin:0 0 8px 0;}
      .segment-meta{font-size:0.875rem;color:#64748b;margin:0 0 12px 0;}
      .segment-json{font-family:ui-monospace,monospace;font-size:11px;line-height:1.4;white-space:pre-wrap;word-break:break-all;background:#f1f5f9;border:1px solid #e2e8f0;border-radius:8px;padding:16px;margin:0;overflow-x:auto;}
    </style></head><body><h1>Veo 3 Script Segments</h1><p>Generated: ${new Date().toLocaleString()}</p><p>Total: ${segments.length}</p>${segmentBlocks.join('')}</body></html>`;
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
