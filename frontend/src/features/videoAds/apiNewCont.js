import { API_BASE } from '../../apiBase';
import { getAuthHeaders } from '../../authHeaders';

export async function generateNewCont(data) {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE}/api/video-segments/generate-new-cont`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || 'Failed to generate new continuation segments');
  }
  return response.json();
}
