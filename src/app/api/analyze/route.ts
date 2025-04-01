import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: Request) {
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

    const tracks = JSON.parse(decodeURIComponent(tracksCookie));
    
    // Create a prompt for OpenAI
    const prompt = `Analyze these Spotify tracks and provide insights about the user's music taste:
    ${tracks.map((track: any, index: number) => `${index + 1}. ${track.name} by ${track.artist}`).join('\n')}
    
    Please provide:
    1. A brief analysis of their music taste
    2. Common themes or genres
    3. Notable artists or patterns
    4. A fun fact or observation`;

    // Get analysis from OpenAI
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are a music analyst who provides insightful and engaging analysis of people's music tastes."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 500
    });

    const analysis = completion.choices[0].message.content;

    return NextResponse.json({ analysis });
  } catch (error) {
    console.error('Error analyzing tracks:', error);
    return NextResponse.json(
      { error: 'Failed to analyze tracks' },
      { status: 500 }
    );
  }
} 