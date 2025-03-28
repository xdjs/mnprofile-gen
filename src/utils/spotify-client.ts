import { SPOTIFY_AUTH_URL, SPOTIFY_CLIENT_ID, SPOTIFY_REDIRECT_URI, SPOTIFY_SCOPES } from './spotify';

export function getSpotifyAuthUrl(): string {
  if (!SPOTIFY_CLIENT_ID) {
    throw new Error('NEXT_PUBLIC_SPOTIFY_CLIENT_ID is not defined');
  }

  if (!SPOTIFY_REDIRECT_URI) {
    throw new Error('NEXT_PUBLIC_REDIRECT_URI is not defined');
  }

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: SPOTIFY_CLIENT_ID,
    scope: SPOTIFY_SCOPES.join(' '),
    redirect_uri: SPOTIFY_REDIRECT_URI,
    show_dialog: 'true'
  });

  return `${SPOTIFY_AUTH_URL}?${params.toString()}`;
} 