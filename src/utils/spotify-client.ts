import { SPOTIFY_AUTH_URL, SPOTIFY_CLIENT_ID, SPOTIFY_REDIRECT_URI, SPOTIFY_SCOPES } from './spotify';

export function getSpotifyAuthUrl(timeRange?: string, trackLimit?: string): string {
  if (!SPOTIFY_CLIENT_ID) {
    throw new Error('SPOTIFY_CLIENT_ID is not defined');
  }

  // Create state object with timeRange and trackLimit
  const state = JSON.stringify({
    timeRange: timeRange || 'short_term',
    trackLimit: trackLimit || '10'
  });

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: SPOTIFY_CLIENT_ID,
    scope: SPOTIFY_SCOPES.join(' '),
    redirect_uri: SPOTIFY_REDIRECT_URI,
    state: state,
    show_dialog: 'true'
  });

  return `${SPOTIFY_AUTH_URL}?${params.toString()}`;
} 