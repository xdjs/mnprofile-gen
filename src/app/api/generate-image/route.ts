/**
 * Copyright (c) 2024 mnprofile-gen
 * 
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { NextResponse } from 'next/server';
import OpenAI from 'openai';

// Configure Edge Runtime
export const runtime = 'edge';
export const maxDuration = 30; // Maximum duration in seconds

interface Track {
  name: string;
  artist: string;
}

// Helper function to parse cookies
function parseCookies(cookieString: string): { spotify_tracks?: Track[] } {
  console.log('Parsing cookies, cookie string length:', cookieString?.length ?? 0);
  if (!cookieString) {
    console.log('No cookies provided');
    return {};
  }
  
  try {
    const cookies = cookieString.split('; ').reduce((acc: { spotify_tracks?: Track[] }, cookie) => {
      const [name, value] = cookie.split('=');
      if (name === 'spotify_tracks') {
        try {
          const decodedValue = decodeURIComponent(value);
          const parsedTracks = JSON.parse(decodedValue);
          console.log('Successfully parsed spotify_tracks cookie:', {
            tracksCount: parsedTracks.length,
            sampleTrack: parsedTracks[0]
          });
          acc.spotify_tracks = parsedTracks;
        } catch (e) {
          console.error('Error parsing spotify_tracks cookie:', e);
        }
      }
      return acc;
    }, {});
    
    console.log('Parsed cookies result:', {
      hasSpotifyTracks: !!cookies.spotify_tracks,
      tracksCount: cookies.spotify_tracks?.length
    });
    
    return cookies;
  } catch (error) {
    console.error('Error in parseCookies:', error);
    return {};
  }
}

export async function POST(request: Request) {
  console.log('Starting image generation request');
  try {
    const cookies = parseCookies(request.headers.get('cookie') || '');
    const tracks = cookies.spotify_tracks || [];

    console.log('Image generation configuration:', {
      tracksCount: tracks.length,
      hasOpenAIKey: !!process.env.OPENAI_API_KEY
    });

    if (!tracks.length) {
      console.warn('No tracks found in cookies');
      return NextResponse.json({ error: 'No tracks found' }, { status: 400 });
    }

    if (!process.env.OPENAI_API_KEY) {
      console.error('OpenAI API key not found');
      return NextResponse.json({ error: 'OpenAI API key not configured' }, { status: 500 });
    }

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // Generate image
    const imagePrompt = `Generate an image of college me in my dorm bedroom. I'm wearing fan clothing and accessories, and I'm listening intently to music. The room is cluttered yet tastefully filled with CDs, records, posters, books, and other memorabilia and merch that reflect my obsessiveness with the music style, national origin, and aesthetic of the musicians who made these tracks: ${tracks.map(track => `${track.name} by ${track.artist}`).join(', ')}`;

    console.log('Starting OpenAI image generation:', {
      promptLength: imagePrompt.length,
    });

    const startTime = performance.now();
    const imageResponse = await openai.images.generate({
      prompt: imagePrompt,
      model: 'gpt-image-1',
    });
    const duration = performance.now() - startTime;

    const base64Image = imageResponse.data?.[0]?.b64_json;
    console.log('OpenAI image generation successful:', {
      hasBase64Data: !!base64Image,
      dataLength: base64Image?.length ?? 0,
      durationMs: Math.round(duration),  // Round to nearest millisecond
    });

    // Convert base64 to data URL format for direct use in <img> tags
    const imageDataUrl = base64Image ? `data:image/png;base64,${base64Image}` : null;
    console.log('Generated image URL:', {
      hasUrl: !!imageDataUrl,
      urlPreview: imageDataUrl ? `${imageDataUrl.substring(0, 50)}...` : null
    });
    return NextResponse.json({ imageUrl: imageDataUrl });
  } catch (error) {
    console.error('Error in image generation route:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    interface ErrorResponse {
      response?: {
        data: {
          message: string;
          [key: string]: unknown;
        };
      };
    }
    
    const typedError = error as Error & ErrorResponse;
    const errorDetails = typedError instanceof Error && typedError.response?.data
      ? typedError.response.data 
      : { message: errorMessage };
    
    // Enhanced OpenAI error logging
    console.error('Error details:', {
      message: errorMessage,
      details: errorDetails,
      stack: error instanceof Error ? error.stack : undefined,
      isOpenAIError: error instanceof OpenAI.APIError,
      openAIDetails: error instanceof OpenAI.APIError ? {
        status: error.status,
        headers: error.headers,
        code: error.code,
        type: error.type
      } : undefined
    });
    
    return NextResponse.json({ 
      error: 'Failed to generate image',
      details: errorDetails
    }, { status: 500 });
  }
} 