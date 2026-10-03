/**
 * Loads the live threat feed for the user's location from the backend.
 */

/**
 * Current alerts and source health.
 * @param {{lat: number, lng: number}} location
 * @param {string} voivodeship user's voivodeship, narrows official regional messages
 * @returns {Promise<{ fetchedAt: string, sources: object[], alerts: object[] }>}
 */
export async function fetchLiveThreats(location, voivodeship) {
  const params = new URLSearchParams({
    lat: location.lat.toFixed(3),
    lng: location.lng.toFixed(3),
    voivodeship: voivodeship || '',
  });
  const response = await fetch(`/api/threats?${params}`);
  if (!response.ok) throw new Error(`Threats request failed: ${response.status}`);
  return response.json();
}
