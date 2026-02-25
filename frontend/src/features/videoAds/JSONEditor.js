import React, { useState } from 'react';

function JSONEditor({ segment, onUpdate, onClose }) {
  const [text, setText] = useState(JSON.stringify(segment, null, 2));

  const handleSave = () => {
    try {
      const updated = JSON.parse(text);
      onUpdate(updated);
      onClose();
    } catch (e) {
      alert('Invalid JSON');
    }
  };

  return (
    <div className="json-editor-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div className="json-editor-modal" style={{ background: 'var(--bg-paper)', borderRadius: 12, maxWidth: 600, width: '100%', maxHeight: '80vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: 16, borderBottom: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0 }}>Edit JSON</h3>
          <div>
            <button type="button" className="btn-primary" onClick={handleSave} style={{ marginRight: 8 }}>Save</button>
            <button type="button" onClick={onClose} style={{ padding: '6px 12px', border: '1px solid var(--glass-border)', borderRadius: 8, background: 'transparent', color: 'var(--text-primary)' }}>Cancel</button>
          </div>
        </div>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          style={{ flex: 1, minHeight: 300, padding: 16, fontFamily: 'monospace', fontSize: 12, background: 'rgba(15,23,42,0.5)', border: 'none', color: 'var(--text-primary)', resize: 'vertical' }}
          spellCheck={false}
        />
      </div>
    </div>
  );
}

export default JSONEditor;
