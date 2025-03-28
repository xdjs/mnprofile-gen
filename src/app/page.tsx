'use client';

import { useState, useEffect } from 'react';
import { getSpotifyAuthUrl } from '@/utils/spotify-client';

interface Track {
  name: string;
  artist: string;
}

// Helper function to parse cookies
function parseCookies() {
  const cookies = document.cookie.split('; ').reduce((acc, cookie) => {
    const [name, value] = cookie.split('=');
    acc[name] = decodeURIComponent(value);
    return acc;
  }, {} as Record<string, string>);
  
  console.log('All cookies:', document.cookie);
  console.log('Parsed cookies:', cookies);
  return cookies;
}

export default function Home() {
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState('short_term');
  const [trackLimit, setTrackLimit] = useState('10');
  const [isLoading, setIsLoading] = useState(false);

  // Function to check and update user data from cookies
  const checkUserData = () => {
    console.log('Checking user data...');
    const cookies = parseCookies();
    const name = cookies.spotify_name;
    const tracksCookie = cookies.spotify_tracks;
    
    console.log('Found cookies:', { name, hasTracks: !!tracksCookie });
    
    if (name) {
      console.log('Setting display name:', name);
      setDisplayName(name);
    }
    
    if (tracksCookie) {
      try {
        console.log('Raw tracks cookie:', tracksCookie);
        const tracksData = JSON.parse(tracksCookie);
        console.log('Parsed tracks data:', tracksData);
        
        if (!Array.isArray(tracksData)) {
          console.error('Tracks data is not an array:', tracksData);
          return;
        }
        
        if (tracksData.length === 0) {
          console.log('No tracks found in data');
          return;
        }
        
        console.log('Setting tracks:', tracksData);
        setTracks(tracksData);
      } catch (e) {
        console.error('Error parsing tracks from cookie:', e);
        console.error('Raw tracks cookie value:', tracksCookie);
      }
    } else {
      console.log('No tracks cookie found');
    }
  };

  useEffect(() => {
    // Check for error in URL parameters
    const params = new URLSearchParams(window.location.search);
    const errorParam = params.get('error');
    if (errorParam) {
      if (errorParam === 'unregistered_user') {
        setError('Please register your Spotify account at https://www.spotify.com/signup before connecting.');
      } else if (errorParam === 'auth_failed') {
        setError('Failed to connect with Spotify. Please try again.');
      }
      // Clear the error from URL
      window.history.replaceState({}, '', '/');
    }

    // Initial check for user data
    checkUserData();

    // Set up an interval to check for updates
    const interval = setInterval(checkUserData, 1000);

    // Cleanup interval on unmount
    return () => clearInterval(interval);
  }, []);

  const handleConnect = () => {
    setIsLoading(true);
    const url = getSpotifyAuthUrl();
    const params = new URLSearchParams({
      timeRange,
      trackLimit
    });
    window.location.href = `${url}&${params.toString()}`;
  };

  const handleDisconnect = () => {
    // Clear cookies
    document.cookie = 'spotify_name=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    document.cookie = 'spotify_tracks=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    setDisplayName(null);
    setTracks([]);
  };

  const handleRefresh = () => {
    setIsLoading(true);
    checkUserData();
    setIsLoading(false);
  };

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">Spotify Top Tracks</h1>
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {!displayName ? (
          <div className="space-y-4">
            <div className="flex items-center space-x-4">
              <div>
                <label htmlFor="timeRange" className="block text-sm font-medium text-gray-700 mb-1">
                  Time Range
                </label>
                <select
                  id="timeRange"
                  value={timeRange}
                  onChange={(e) => setTimeRange(e.target.value)}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                >
                  <option value="short_term">1 month</option>
                  <option value="medium_term">6 months</option>
                  <option value="long_term">12 months</option>
                </select>
              </div>

              <div>
                <label htmlFor="trackLimit" className="block text-sm font-medium text-gray-700 mb-1">
                  How many tracks?
                </label>
                <select
                  id="trackLimit"
                  value={trackLimit}
                  onChange={(e) => setTrackLimit(e.target.value)}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                >
                  <option value="10">10</option>
                  <option value="20">20</option>
                  <option value="50">50</option>
                </select>
              </div>
            </div>

            <button
              onClick={handleConnect}
              disabled={isLoading}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
            >
              {isLoading ? 'Connecting...' : 'Connect with Spotify'}
            </button>
          </div>
        ) : (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-semibold">Welcome, {displayName}!</h2>
              <div className="flex items-center space-x-4">
                <button
                  onClick={handleRefresh}
                  disabled={isLoading}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
                >
                  {isLoading ? 'Refreshing...' : 'Refresh'}
                </button>
                <button
                  onClick={handleDisconnect}
                  style={{
                    backgroundColor: '#dc2626',
                    color: 'white'
                  }}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm hover:bg-[#b91c1c] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
                >
                  Disconnect
                </button>
              </div>
            </div>

            {tracks.length > 0 ? (
              <div className="space-y-2">
                {tracks.map((track, index) => (
                  <div key={index} className="text-gray-700">
                    {track.name} • <span className="font-medium">{track.artist}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">No tracks found.</p>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
