'use client';

import { useState, useEffect, useRef } from 'react';
import { getSpotifyAuthUrl } from '@/utils/spotify-client';

interface Track {
  name: string;
  artist: string;
}

interface ParsedCookies {
  spotify_name?: string;
  spotify_tracks?: Track[];
  spotify_timeRange?: string;
  spotify_trackLimit?: string;
}

// Helper function to parse cookies
function parseCookies(): ParsedCookies {
  console.log('Raw document.cookie:', document.cookie);
  
  const cookies = document.cookie.split('; ').reduce((acc: ParsedCookies, cookie) => {
    if (!cookie) return acc;
    
    const parts = cookie.split('=');
    if (parts.length !== 2) return acc;
    
    const [name, value] = parts;
    if (!name || !value) return acc;
    
    console.log('Processing cookie:', { 
      name, 
      valuePreview: value ? value.substring(0, 50) + '...' : 'undefined'
    });
    
    try {
      // First decode the URI component
      const decodedValue = decodeURIComponent(value);
      console.log('Decoded value length:', decodedValue.length);
      
      // For spotify_tracks, attempt to parse as JSON
      if (name === 'spotify_tracks') {
        const parsedTracks = JSON.parse(decodedValue) as Track[];
        console.log('Parsed tracks count:', parsedTracks.length);
        acc.spotify_tracks = parsedTracks;
      } else if (name === 'spotify_name') {
        acc.spotify_name = decodedValue;
      } else if (name === 'spotify_timeRange') {
        acc.spotify_timeRange = decodedValue;
      } else if (name === 'spotify_trackLimit') {
        acc.spotify_trackLimit = decodedValue;
      }
    } catch (e) {
      console.error(`Error parsing cookie ${name}:`, e);
      console.error('Full cookie value:', value);
    }
    return acc;
  }, { 
    spotify_name: undefined, 
    spotify_tracks: undefined,
    spotify_timeRange: undefined,
    spotify_trackLimit: undefined
  });
  
  console.log('Final parsed cookies:', {
    hasName: !!cookies.spotify_name,
    tracksCount: cookies.spotify_tracks?.length,
    timeRange: cookies.spotify_timeRange,
    trackLimit: cookies.spotify_trackLimit
  });
  
  return cookies;
}

export default function Home() {
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState('short_term');
  const [trackLimit, setTrackLimit] = useState('10');
  const [isLoading, setIsLoading] = useState(false);

  // Use ref to track current displayName value
  const displayNameRef = useRef(displayName);

  // Update ref when displayName changes
  useEffect(() => {
    displayNameRef.current = displayName;
  }, [displayName]);

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

    // Function to check user data
    const checkData = () => {
      console.log('Running checkData...');
      const cookies = parseCookies();
      
      if (cookies.spotify_name && cookies.spotify_name !== displayNameRef.current) {
        console.log('Updating display name:', cookies.spotify_name);
        setDisplayName(cookies.spotify_name);
      }

      if (cookies.spotify_timeRange) {
        console.log('Updating time range:', cookies.spotify_timeRange);
        setTimeRange(cookies.spotify_timeRange);
      }

      if (cookies.spotify_trackLimit) {
        console.log('Updating track limit:', cookies.spotify_trackLimit);
        setTrackLimit(cookies.spotify_trackLimit);
      }
      
      if (cookies.spotify_tracks) {
        console.log('Found tracks in cookies:', {
          newTracksLength: cookies.spotify_tracks.length,
          sample: cookies.spotify_tracks[0]
        });
        
        // Update tracks if they exist in cookies
        if (cookies.spotify_tracks.length > 0) {
          console.log('Setting tracks from cookies');
          setTracks(cookies.spotify_tracks);
        }
      } else {
        console.log('No tracks in cookies');
        setTracks([]);
      }
    };

    // Initial check
    checkData();
  }, []); // Empty dependency array - only run once on mount

  const handleConnect = () => {
    setIsLoading(true);
    // Store the current options in cookies before redirecting
    document.cookie = `spotify_timeRange=${encodeURIComponent(timeRange)}; path=/; max-age=3600`;
    document.cookie = `spotify_trackLimit=${encodeURIComponent(trackLimit)}; path=/; max-age=3600`;
    const url = getSpotifyAuthUrl(timeRange, trackLimit);
    window.location.href = url;
  };

  const handleDisconnect = () => {
    // Clear all cookies
    document.cookie = 'spotify_name=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    document.cookie = 'spotify_tracks=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    document.cookie = 'spotify_timeRange=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    document.cookie = 'spotify_trackLimit=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    document.cookie = 'spotify_refresh_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    
    // Reset state to default values
    setDisplayName(null);
    setTracks([]);
    setTimeRange('short_term');
    setTrackLimit('10');
  };

  const handleRefresh = async () => {
    setIsLoading(true);
    const cookies = parseCookies();
    
    // Check if options have changed
    const optionsChanged = 
      cookies.spotify_timeRange !== timeRange || 
      cookies.spotify_trackLimit !== trackLimit;

    if (optionsChanged) {
      console.log('Options changed, fetching new data...');
      try {
        // Store the new options in cookies before making the request
        document.cookie = `spotify_timeRange=${encodeURIComponent(timeRange)}; path=/; max-age=3600`;
        document.cookie = `spotify_trackLimit=${encodeURIComponent(trackLimit)}; path=/; max-age=3600`;

        // Make API call to refresh endpoint
        const response = await fetch('/api/refresh', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            timeRange,
            trackLimit
          })
        });

        if (!response.ok) {
          throw new Error('Failed to refresh data');
        }

        // Force a check of the data after the refresh
        const updatedCookies = parseCookies();
        if (updatedCookies.spotify_tracks) {
          setTracks(updatedCookies.spotify_tracks);
        }
      } catch (error) {
        console.error('Error refreshing data:', error);
        setError('Failed to refresh data. Please try again.');
      }
    } else {
      console.log('Options unchanged, no refresh needed');
    }
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
            <div className="flex items-end space-x-4">
              <div>
                <label htmlFor="timeRange" className="block text-sm font-medium text-gray-700 mb-2">
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
                <label htmlFor="trackLimit" className="block text-sm font-medium text-gray-700 mb-2">
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
                </select>
              </div>

              <button
                onClick={handleConnect}
                disabled={isLoading}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
              >
                {isLoading ? 'Connecting...' : 'Connect with Spotify'}
              </button>
            </div>
          </div>
        ) : (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-semibold">Welcome, {displayName}!</h2>
            </div>

            <div className="flex items-end space-x-4 mb-6">
              <div>
                <label htmlFor="timeRange" className="block text-sm font-medium text-gray-700 mb-2">
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
                <label htmlFor="trackLimit" className="block text-sm font-medium text-gray-700 mb-2">
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
                </select>
              </div>

              <div className="flex items-end space-x-4">
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
                    <span className="font-medium text-gray-500 mr-2">{index + 1}.</span>
                    <span className="font-bold">{track.name}</span> • <span className="italic">{track.artist}</span>
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
