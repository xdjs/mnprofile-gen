/**
 * Copyright (c) 2024-present xDJs LLC
 * 
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { NextResponse } from 'next/server';
import OpenAI from 'openai';

interface Track {
  name: string;
  artist: string;
}

// Helper function to parse cookies
function parseCookies(cookieString: string): { spotify_tracks?: Track[] } {
  if (!cookieString) return {};
  
  return cookieString.split('; ').reduce((acc: { spotify_tracks?: Track[] }, cookie) => {
    const [name, value] = cookie.split('=');
    if (name === 'spotify_tracks') {
      try {
        const decodedValue = decodeURIComponent(value);
        acc.spotify_tracks = JSON.parse(decodedValue);
      } catch (e) {
        console.error('Error parsing spotify_tracks cookie:', e);
      }
    }
    return acc;
  }, {});
}

export async function POST(request: Request) {
  try {
    const { displayName } = await request.json();
    const cookies = parseCookies(request.headers.get('cookie') || '');
    const tracks = cookies.spotify_tracks || [];
    const model = process.env.OPENAI_MODEL || "gpt-3.5-turbo";

    if (!tracks.length) {
      return NextResponse.json({ error: 'No tracks found' }, { status: 400 });
    }

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // Generate text analysis
    const textContent = `You are the apex music nerd. You are fun, engaging, and know your stuff. You are can also be teasing but in a playful and fun way. Generate a music nerd profile of ${displayName} given their top tracks:\n\n${tracks.map((track: Track, i: number) => `${i + 1}. ${track.name} by ${track.artist}`).join('\n')}`;

    const textCompletion = await openai.chat.completions.create({
      messages: [{ role: "user", content: textContent }],
      model: model,
      temperature: 0.7,
    });

    const analysis = textCompletion.choices[0].message.content;

    // Generate image
    const imagePrompt = `Generate an image of college me in my dorm bedroom. I'm wearing fan clothing and accessories, and I'm listening intently to music. The room is cluttered yet tastefully filled with CDs, records, posters, books, and other memorabilia and merch that reflect my obsessiveness with the music style, national origin, and aesthetic of the musicians who made these tracks: ${tracks.map(track => `${track.name} by ${track.artist}`).join(', ')}`;

    console.log('Generating image with prompt:', imagePrompt);

    const imageResponse = await openai.images.generate({
      model: "dall-e-3",
      prompt: imagePrompt,
      n: 1,
      size: "1024x1024",
      quality: "standard",
      style: "vivid",
    });

    const imageUrl = imageResponse.data[0].url;

    return NextResponse.json({ analysis, model, imageUrl });
  } catch (error) {
    console.error('Error in analyze route:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorDetails = error instanceof Error && (error as any).response?.data 
      ? (error as any).response.data 
      : { message: errorMessage };
    
    return NextResponse.json({ 
      error: 'Failed to analyze tracks',
      details: errorDetails
    }, { status: 500 });
  }
} 