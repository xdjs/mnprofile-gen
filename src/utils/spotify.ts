const SPOTIFY_AUTH_URL = 'https://accounts.spotify.com/authorize';
const SPOTIFY_TOKEN_URL = 'https://accounts.spotify.com/api/token';
const SPOTIFY_API_URL = 'https://api.spotify.com/v1';

// Get environment variables, handling both client and server side
const getClientId = () => {
  // Try client-side variable first
  const clientId = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID;
  if (clientId) return clientId;
  
  // Fall back to server-side variable
  return process.env.SPOTIFY_CLIENT_ID;
};

const getClientSecret = () => {
  return process.env.SPOTIFY_CLIENT_SECRET;
};

const getRedirectUri = () => {
  // Try client-side variable first
  const redirectUri = process.env.NEXT_PUBLIC_REDIRECT_URI;
  if (redirectUri) return redirectUri;
  
  // Fall back to server-side variable
  return process.env.REDIRECT_URI;
};

// Validate environment variables
if (!getClientId()) {
  throw new Error('SPOTIFY_CLIENT_ID is not defined in environment variables');
}

if (!getClientSecret()) {
  throw new Error('SPOTIFY_CLIENT_SECRET is not defined in environment variables');
}

if (!getRedirectUri()) {
  throw new Error('REDIRECT_URI is not defined in environment variables');
}

export const scopes = [
  'user-read-currently-playing',
  'user-top-read',
  'user-read-recently-played',
  'user-library-read'
].join(' ');

export const getAuthUrl = () => {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: getClientId()!,
    scope: scopes,
    redirect_uri: getRedirectUri()!,
    show_dialog: 'true'
  });

  return `${SPOTIFY_AUTH_URL}?${params.toString()}`;
};

export const getAccessToken = async (code: string) => {
  if (!process.env.SPOTIFY_CLIENT_ID) {
    throw new Error('SPOTIFY_CLIENT_ID is not defined');
  }

  if (!process.env.SPOTIFY_CLIENT_SECRET) {
    throw new Error('SPOTIFY_CLIENT_SECRET is not defined');
  }

  if (!process.env.NEXT_PUBLIC_REDIRECT_URI) {
    throw new Error('NEXT_PUBLIC_REDIRECT_URI is not defined');
  }

  const params = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: process.env.NEXT_PUBLIC_REDIRECT_URI,
  });

  console.log('Token request params:', {
    grant_type: 'authorization_code',
    code: code.substring(0, 10) + '...',
    redirect_uri: process.env.NEXT_PUBLIC_REDIRECT_URI,
  });

  try {
    const response = await fetch(SPOTIFY_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${Buffer.from(
          `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
        ).toString('base64')}`,
      },
      body: params.toString(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Token exchange failed:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText,
      });
      throw new Error(`Failed to get access token: ${errorText}`);
    }

    const data = await response.json();
    if (!data.access_token) {
      console.error('No access token in response:', data);
      throw new Error('No access token received from Spotify');
    }

    return data;
  } catch (error) {
    console.error('Error during token exchange:', error);
    throw error;
  }
};

export const getUserProfile = async (accessToken: string) => {
  try {
    const response = await fetch(`${SPOTIFY_API_URL}/me`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Profile request failed:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText,
      });

      if (response.status === 403 && errorText.includes('not be registered')) {
        throw new Error(
          'This Spotify account needs to be registered in the Developer Dashboard. ' +
          'Please contact the application administrator to add your account.'
        );
      }

      throw new Error(`Failed to get user profile: ${errorText}`);
    }

    const data = await response.json();
    if (!data.display_name) {
      console.error('Invalid profile data:', data);
      throw new Error('Invalid user profile data received');
    }

    return data;
  } catch (error) {
    console.error('Error getting user profile:', error);
    throw error;
  }
};

export const getTopTracks = async (accessToken: string) => {
  try {
    const response = await fetch(
      `${SPOTIFY_API_URL}/me/top/tracks?time_range=long_term&limit=10`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Top tracks request failed:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText,
      });
      throw new Error(`Failed to get top tracks: ${errorText}`);
    }

    const data = await response.json();
    if (!data.items || !Array.isArray(data.items)) {
      console.error('Invalid top tracks data:', data);
      throw new Error('Invalid top tracks data received');
    }

    return data.items.map((track: any) => ({
      name: track.name,
      artist: track.artists[0].name,
    }));
  } catch (error) {
    console.error('Error getting top tracks:', error);
    throw error;
  }
}; 