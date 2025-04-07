/**
 * Copyright (c) 2024-present xDJs LLC
 * 
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { NextResponse } from 'next/server';
import { getAccessToken, getUserProfile, getTopTracks } from '@/utils/spotify';

interface StateParams {
  timeRange: string;
  trackLimit: string;
}

export async function GET(request: Request) {
  console.log('Starting auth callback request');
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const stateParam = searchParams.get('state');

  console.log('Auth callback params:', {
    hasCode: !!code,
    codePreview: code ? `${code.substring(0, 10)}...` : null,
    hasState: !!stateParam
  });

  let timeRange = 'short_term';
  let trackLimit = '10';

  if (stateParam) {
    try {
      const state = JSON.parse(stateParam) as StateParams;
      timeRange = state.timeRange;
      trackLimit = state.trackLimit;
      console.log('Successfully parsed state:', { timeRange, trackLimit });
    } catch (e) {
      console.error('Error parsing state parameter:', e);
    }
  }

  if (!code) {
    console.error('No code received in callback');
    return NextResponse.redirect(new URL('/?error=auth_failed', request.url));
  }

  try {
    // Validate environment variables
    if (!process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID || !process.env.SPOTIFY_CLIENT_SECRET) {
      console.error('Missing Spotify credentials:', {
        hasClientId: !!process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID,
        hasClientSecret: !!process.env.SPOTIFY_CLIENT_SECRET
      });
      throw new Error('Missing Spotify credentials');
    }

    console.log('Getting access token...');
    const { access_token, refresh_token } = await getAccessToken(code);
    
    if (!access_token) {
      console.error('No access token received');
      throw new Error('Failed to get access token');
    }

    if (!refresh_token) {
      console.error('No refresh token received');
      throw new Error('Failed to get refresh token');
    }

    console.log('Successfully received tokens:', {
      hasAccessToken: !!access_token,
      accessTokenPreview: `${access_token.substring(0, 10)}...`,
      hasRefreshToken: !!refresh_token,
      refreshTokenPreview: `${refresh_token.substring(0, 10)}...`
    });

    console.log('Getting user profile...');
    try {
      const profile = await getUserProfile(access_token);
      console.log('Got user profile:', {
        displayName: profile.display_name,
        id: profile.id
      });

      console.log('Getting top tracks...');
      const topTracks = await getTopTracks(access_token, timeRange, trackLimit);
      console.log('Got top tracks:', {
        count: topTracks.length,
        timeRange,
        trackLimit
      });

      // Create response with cookies
      const response = NextResponse.redirect(new URL('/', request.url));
      
      // Set cookies
      const cookieOptions = {
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax' as const,
        path: '/',
        maxAge: 3600
      };

      console.log('Setting cookies with options:', cookieOptions);

      response.cookies.set('spotify_name', profile.display_name, cookieOptions);
      response.cookies.set('spotify_tracks', JSON.stringify(topTracks), cookieOptions);
      response.cookies.set('spotify_refresh_token', refresh_token, {
        ...cookieOptions,
        httpOnly: true
      });
      response.cookies.set('spotify_timeRange', timeRange, cookieOptions);
      response.cookies.set('spotify_trackLimit', trackLimit, cookieOptions);

      console.log('Auth callback completed successfully');
      return response;
    } catch (profileError) {
      console.error('Error in profile/tracks flow:', profileError);
      // Handle specific error for unregistered users
      if (profileError instanceof Error && profileError.message.includes('needs to be registered')) {
        console.warn('User needs to be registered in Spotify Dashboard');
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