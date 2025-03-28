import { NextResponse } from 'next/server';
import { getAccessToken, getUserProfile, getTopTracks } from '@/utils/spotify';
import { cookies } from 'next/headers';

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

  console.log('Callback received with params:', { 
    code: code?.substring(0, 10) + '...', 
    timeRange, 
    trackLimit,
    fullUrl: request.url 
  });

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

      console.log('Getting top tracks with params:', { timeRange, trackLimit });
      const topTracks = await getTopTracks(access_token, timeRange, trackLimit);

      console.log('Successfully authenticated user:', userProfile.display_name);
      console.log('Retrieved tracks:', {
        count: topTracks.length,
        expectedCount: parseInt(trackLimit),
        firstTrack: topTracks[0]
      });
      
      // Create response with redirect
      const response = NextResponse.redirect(new URL('/', request.url));
      
      // Set cookies with the data
      const cookieOptions = {
        httpOnly: false, // Allow client-side access
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax' as const,
        path: '/',
        maxAge: 3600 // 1 hour
      };

      console.log('Setting cookies with options:', cookieOptions);
      
      response.cookies.set('spotify_name', userProfile.display_name, cookieOptions);
      response.cookies.set('spotify_tracks', JSON.stringify(topTracks), cookieOptions);

      // Log the cookies that were set
      console.log('Cookies set:', {
        name: userProfile.display_name,
        tracksCount: topTracks.length,
        expectedTracksCount: parseInt(trackLimit)
      });

      return response;
    } catch (profileError) {
      // Handle specific error for unregistered users
      if (profileError instanceof Error && profileError.message.includes('needs to be registered')) {
        const response = NextResponse.redirect(new URL('/?error=unregistered_user', request.url));
        response.cookies.delete('spotify_name');
        response.cookies.delete('spotify_tracks');
        return response;
      }
      throw profileError;
    }
  } catch (error) {
    console.error('Error during Spotify authentication:', error);
    const response = NextResponse.redirect(new URL('/?error=auth_failed', request.url));
    response.cookies.delete('spotify_name');
    response.cookies.delete('spotify_tracks');
    return response;
  }
} 