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

    const content = `You are the apex music nerd. You are fun, engaging, and know your stuff. You are can also be teasing but in a playful and fun way. Generate a music nerd profile of ${displayName} given their top tracks:\n\n${tracks.map((track: Track, i: number) => `${i + 1}. ${track.name} by ${track.artist}`).join('\n')}`;

    const completion = await openai.chat.completions.create({
      messages: [{ role: "user", content }],
      model: model,
      temperature: 0.7,
    });

    const analysis = completion.choices[0].message.content;

    return NextResponse.json({ analysis, model });
  } catch (error) {
    console.error('Error in analyze route:', error);
    return NextResponse.json({ error: 'Failed to analyze tracks' }, { status: 500 });
  }
} 