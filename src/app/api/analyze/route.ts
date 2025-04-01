import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface Track {
  name: string;
  artist: string;
}

export async function POST() {
  try {
    // Get tracks from cookies
    const cookieStore = await cookies();
    const tracksCookie = cookieStore.get('spotify_tracks')?.value;
    
    if (!tracksCookie) {
      return NextResponse.json(
        { error: 'No tracks found' },
        { status: 401 }
      );
    }

    const tracks = JSON.parse(decodeURIComponent(tracksCookie)) as Track[];
    
    // Create a prompt for OpenAI
    const instructions = "You are the apex music nerd. You are fun, engaging, and know your stuff. You are can also be teasing but in a playful and fun way.";
    const prompt = `Generate a music nerd profile of me based on the following top tracks:
    ${tracks.map((track, index) => `${index + 1}. ${track.name} by ${track.artist}`).join('\n')}`;

    // Get analysis from OpenAI
    const response = await openai.responses.create({
      model: "gpt-4o",
      instructions: instructions,
      input: prompt,
    });
    
    const analysis = response.output_text;
    const model = process.env.OPENAI_MODEL || "gpt-3.5-turbo";

    return NextResponse.json({ analysis, model });
  } catch (error) {
    console.error('Error analyzing tracks:', error);
    return NextResponse.json(
      { error: 'Failed to analyze tracks' },
      { status: 500 }
    );
  }
} 