import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getSpotifyAccessToken, getTopTracks } from '@/utils/spotify-client';

export async function POST(request: Request) {
  try {
    const { timeRange, trackLimit } = await request.json();
    
    // Get the refresh token from cookies
    const cookieStore = await cookies();
    const refreshToken = cookieStore.get('spotify_refresh_token')?.value;
    
    if (!refreshToken) {
      return NextResponse.json(
        { error: 'No refresh token found' },
        { status: 401 }
      );
    }

    // Get a new access token using the refresh token
    const accessToken = await getSpotifyAccessToken(refreshToken);
    
    // Get the user's profile to get their display name
    const userProfile = await fetch('https://api.spotify.com/v1/me', {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    }).then(res => res.json());

    // Get top tracks with the new options
    const topTracks = await getTopTracks(accessToken, timeRange, parseInt(trackLimit));

    // Create response
    const response = NextResponse.json({ success: true });

    // Set cookies with the data
    const cookieOptions = {
      httpOnly: false,
      secure: false,
      sameSite: 'lax' as const,
      path: '/',
      maxAge: 3600
    };

    // Set name cookie
    response.cookies.set('spotify_name', userProfile.display_name, cookieOptions);
    
    // Set tracks cookie
    response.cookies.set('spotify_tracks', JSON.stringify(topTracks), cookieOptions);

    // Set time range and track limit cookies
    response.cookies.set('spotify_timeRange', timeRange, cookieOptions);
    response.cookies.set('spotify_trackLimit', trackLimit, cookieOptions);

    return response;
  } catch (error) {
    console.error('Error refreshing data:', error);
    return NextResponse.json(
      { error: 'Failed to refresh data' },
      { status: 500 }
    );
  }
} 