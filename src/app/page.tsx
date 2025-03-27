'use client';

import { useEffect, useState } from 'react';
import { getAuthUrl } from '@/utils/spotify-client';

interface Track {
  name: string;
  artist: string;
}

export default function Home() {
  const [userName, setUserName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [authUrl, setAuthUrl] = useState<string>('');
  const [topTracks, setTopTracks] = useState<Track[]>([]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const name = params.get('name');
    const error = params.get('error');
    const tracksParam = params.get('tracks');

    if (name) {
      setUserName(decodeURIComponent(name));
    }

    if (tracksParam) {
      try {
        const tracks = JSON.parse(tracksParam);
        setTopTracks(tracks);
      } catch (err) {
        console.error('Error parsing tracks:', err);
      }
    }

    if (error) {
      if (error === 'unregistered_user') {
        setError('This Spotify account needs to be registered in the Developer Dashboard. Please contact the application administrator.');
      } else {
        setError('Authentication failed. Please try again.');
      }
    }

    try {
      // Generate auth URL only on the client side
      const url = getAuthUrl();
      if (!url) {
        throw new Error('Failed to generate auth URL');
      }
      setAuthUrl(url);
    } catch (err) {
      setError('Failed to initialize Spotify connection. Please try again later.');
      console.error('Error generating auth URL:', err);
    }
  }, []);

  const handleDisconnect = () => {
    setUserName(null);
    setTopTracks([]);
    // Clear the URL parameters without refreshing the page
    window.history.replaceState({}, '', '/');
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-24">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-8">Spotify History</h1>
        
        {error && (
          <div className="text-red-500 mb-4">{error}</div>
        )}

        {userName ? (
          <div className="flex flex-col items-center gap-6">
            <div className="flex items-center gap-4">
              <div className="text-xl">
                Welcome, {userName}!
              </div>
              <button
                onClick={handleDisconnect}
                className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-full transition-colors text-sm"
              >
                Disconnect
              </button>
            </div>

            {topTracks.length > 0 && (
              <div className="mt-8">
                <h2 className="text-2xl font-semibold mb-4">Your Top Tracks</h2>
                <div className="space-y-2 text-left">
                  {topTracks.map((track, index) => (
                    <div key={index} className="flex items-center gap-4">
                      <span className="text-gray-500 w-8">{index + 1}.</span>
                      <div className="truncate">
                        <span className="mr-2">{track.name}</span>
                        <span className="font-bold">• {track.artist}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <a
            href={authUrl}
            className="bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-6 rounded-full transition-colors"
          >
            Connect with Spotify
          </a>
        )}
      </div>
    </main>
  );
}
