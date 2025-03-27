import { NextResponse } from 'next/server';
import { getAccessToken, getUserProfile, getTopTracks } from '@/utils/spotify';

// Map numeric values to Spotify API time ranges
const mapTimeRange = (value: string): string => {
  switch (value) {
    case '1':
      return 'short_term';
    case '6':
      return 'medium_term';
    case '12':
      return 'long_term';
    default:
      return 'short_term'; // Default to 1 month if invalid
  }
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const timeRange = mapTimeRange(searchParams.get('timeRange') || '1');
  const trackLimit = searchParams.get('trackLimit') || '10';

  if (!code) {
    console.error('No code received in callback');
    return NextResponse.redirect(new URL('/', request.url));
  }

  try {
    // Validate environment variables
    if (!process.env.SPOTIFY_CLIENT_ID || !process.env.SPOTIFY_CLIENT_SECRET) {
      console.error('Missing Spotify credentials:', {
        hasClientId: !!process.env.SPOTIFY_CLIENT_ID,
        hasClientSecret: !!process.env.SPOTIFY_CLIENT_SECRET
      });
      throw new Error('Missing Spotify credentials');
    }

    console.log('Getting access token...');
    const { access_token } = await getAccessToken(code);
    if (!access_token) {
      console.error('No access token received');
      throw new Error('Failed to get access token');
    }

    console.log('Getting user profile...');
    try {
      const userProfile = await getUserProfile(access_token);
      if (!userProfile || !userProfile.display_name) {
        console.error('Invalid user profile:', userProfile);
        throw new Error('Failed to get user profile');
      }

      console.log('Getting top tracks with time range:', timeRange);
      const topTracks = await getTopTracks(access_token, timeRange, trackLimit);

      console.log('Successfully authenticated user:', userProfile.display_name);
      const params = new URLSearchParams({
        name: userProfile.display_name,
        tracks: JSON.stringify(topTracks)
      });
      return NextResponse.redirect(new URL(`/?${params.toString()}`, request.url));
    } catch (profileError) {
      // Handle specific error for unregistered users
      if (profileError instanceof Error && profileError.message.includes('needs to be registered')) {
        return NextResponse.redirect(new URL('/?error=unregistered_user', request.url));
      }
      throw profileError;
    }
  } catch (error) {
    console.error('Error during Spotify authentication:', error);
    return NextResponse.redirect(new URL('/?error=auth_failed', request.url));
  }
} 