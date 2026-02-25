import { API_BASE } from '../../apiBase';
import { getAuthHeaders } from '../../authHeaders';

export async function generateSegments(data) {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE}/api/video-segments/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || 'Failed to generate segments');
  }
  return response.json();
}

export async function downloadSegments(segments) {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE}/api/video-segments/download`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify({ segments }),
  });
  if (!response.ok) throw new Error('Failed to download segments');
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'veo3-segments.zip';
  a.click();
  window.URL.revokeObjectURL(url);
}
