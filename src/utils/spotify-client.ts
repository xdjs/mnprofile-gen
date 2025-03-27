const SPOTIFY_AUTH_URL = 'https://accounts.spotify.com/authorize';

export const scopes = [
  'user-read-currently-playing',
  'user-top-read',
  'user-read-recently-played',
  'user-library-read'
].join(' ');

export const getAuthUrl = () => {
  if (!process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID) {
    throw new Error('NEXT_PUBLIC_SPOTIFY_CLIENT_ID is not defined');
  }

  if (!process.env.NEXT_PUBLIC_REDIRECT_URI) {
    throw new Error('NEXT_PUBLIC_REDIRECT_URI is not defined');
  }

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID,
    scope: scopes,
    redirect_uri: process.env.NEXT_PUBLIC_REDIRECT_URI,
    show_dialog: 'true'
  });

  return `${SPOTIFY_AUTH_URL}?${params.toString()}`;
}; 