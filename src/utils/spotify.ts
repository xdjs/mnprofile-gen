/**
 * Copyright (c) 2024-present xDJs LLC
 * 
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

// Spotify API endpoints
export const SPOTIFY_AUTH_URL = 'https://accounts.spotify.com/authorize';
export const SPOTIFY_TOKEN_URL = 'https://accounts.spotify.com/api/token';
export const SPOTIFY_API_URL = 'https://api.spotify.com/v1';

// Spotify API scopes
export const SPOTIFY_SCOPES = [
  'user-read-currently-playing',
  'user-top-read',
  'user-read-recently-played',
  'user-library-read'
];

// Client-side environment variables
export const SPOTIFY_CLIENT_ID = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID;
export const SPOTIFY_REDIRECT_URI = process.env.NEXT_PUBLIC_REDIRECT_URI;

// Server-side environment variables
export const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;

// Client-side environment validation
if (typeof window !== 'undefined') {
  if (!SPOTIFY_CLIENT_ID) {
    throw new Error('NEXT_PUBLIC_SPOTIFY_CLIENT_ID is not defined in environment variables');
  }
  if (!SPOTIFY_REDIRECT_URI) {
    throw new Error('NEXT_PUBLIC_REDIRECT_URI is not defined in environment variables');
  }
}

// Server-side environment validation
if (typeof window === 'undefined') {
  if (!SPOTIFY_CLIENT_SECRET) {
    throw new Error('SPOTIFY_CLIENT_SECRET is not defined in environment variables');
  }
}

// Type definitions
export interface Track {
  name: string;
  artist: string;
}

interface SpotifyArtist {
  name: string;
}

interface SpotifyTrack {
  name: string;
  artists: SpotifyArtist[];
}

interface SpotifyTopTracksResponse {
  items: SpotifyTrack[];
  total: number;
  limit: number;
  offset: number;
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
    client_id: SPOTIFY_CLIENT_ID!,
    scope: scopes,
    redirect_uri: SPOTIFY_REDIRECT_URI!,
    show_dialog: 'true'
  });

  return `${SPOTIFY_AUTH_URL}?${params.toString()}`;
};

export const getAccessToken = async (code: string) => {
  console.log('Starting Spotify token exchange...');
  if (!SPOTIFY_CLIENT_ID) {
    throw new Error('SPOTIFY_CLIENT_ID is not defined');
  }

  if (!SPOTIFY_CLIENT_SECRET) {
    throw new Error('SPOTIFY_CLIENT_SECRET is not defined');
  }

  if (!SPOTIFY_REDIRECT_URI) {
    throw new Error('NEXT_PUBLIC_REDIRECT_URI is not defined');
  }

  const params = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: SPOTIFY_REDIRECT_URI,
  });

  console.log('Token request configuration:', {
    endpoint: SPOTIFY_TOKEN_URL,
    grantType: 'authorization_code',
    codePreview: code.substring(0, 10) + '...',
    redirectUri: SPOTIFY_REDIRECT_URI,
  });

  try {
    console.log('Making token exchange request to Spotify...');
    const response = await fetch(SPOTIFY_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${Buffer.from(
          `${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`
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
        headers: Object.fromEntries(response.headers.entries())
      });
      throw new Error(`Failed to get access token: ${errorText}`);
    }

    const data = await response.json();
    console.log('Token exchange successful:', {
      hasAccessToken: !!data.access_token,
      hasRefreshToken: !!data.refresh_token,
      tokenType: data.token_type,
      expiresIn: data.expires_in,
      scope: data.scope
    });

    if (!data.access_token) {
      console.error('No access token in response:', data);
      throw new Error('No access token received from Spotify');
    }

    return data;
  } catch (error) {
    console.error('Error during token exchange:', {
      error,
      stack: error instanceof Error ? error.stack : undefined
    });
    throw error;
  }
};

export const getUserProfile = async (accessToken: string) => {
  console.log('Starting Spotify user profile request...');
  try {
    console.log('Making profile request to Spotify API...');
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
        headers: Object.fromEntries(response.headers.entries())
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
    console.log('Profile request successful:', {
      id: data.id,
      displayName: data.display_name,
      type: data.type,
      product: data.product,
      country: data.country
    });

    if (!data.display_name) {
      console.error('Invalid profile data:', data);
      throw new Error('Invalid user profile data received');
    }

    return data;
  } catch (error) {
    console.error('Error getting user profile:', {
      error,
      stack: error instanceof Error ? error.stack : undefined
    });
    throw error;
  }
};

export const getTopTracks = async (access_token: string, timeRange: string, limit: string): Promise<Track[]> => {
  console.log('Starting Spotify top tracks request...');
  try {
    const endpoint = `${SPOTIFY_API_URL}/me/top/tracks?time_range=${timeRange}&limit=${limit}`;
    console.log('Making top tracks request:', {
      endpoint,
      timeRange,
      limit
    });
    
    const response = await fetch(endpoint, {
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Error fetching top tracks:', {
        status: response.status,
        statusText: response.statusText,
        error: errorData,
        headers: Object.fromEntries(response.headers.entries())
      });
      throw new Error(`Failed to fetch top tracks: ${response.statusText}`);
    }

    const data = await response.json() as SpotifyTopTracksResponse;
    console.log('Top tracks response:', {
      total: data.total,
      limit: data.limit,
      offset: data.offset,
      itemsCount: data.items.length,
      firstTrackPreview: data.items[0] ? {
        name: data.items[0].name,
        artist: data.items[0].artists[0].name
      } : null
    });

    return data.items.map((item: SpotifyTrack) => ({
      name: item.name,
      artist: item.artists[0].name,
    }));
  } catch (error) {
    console.error('Error in getTopTracks:', {
      error,
      stack: error instanceof Error ? error.stack : undefined
    });
    throw error;
  }
}; 