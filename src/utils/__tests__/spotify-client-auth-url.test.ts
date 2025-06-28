describe('getSpotifyAuthUrl', () => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...OLD_ENV };
  });

  afterAll(() => {
    process.env = OLD_ENV;
  });

  it('constructs a valid Spotify authorization URL with state', async () => {
    process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID = 'test-client-id';
    process.env.NEXT_PUBLIC_REDIRECT_URI = 'http://localhost:3000/api/auth/callback';
    const { getSpotifyAuthUrl } = await import('../spotify-client');
    const timeRange = 'medium_term';
    const trackLimit = '20';
    const url = getSpotifyAuthUrl(timeRange, trackLimit);

    expect(url).toContain('https://accounts.spotify.com/authorize');
    expect(url).toContain('response_type=code');
    expect(url).toContain('client_id=test-client-id');
    expect(url).toContain('redirect_uri=http%3A%2F%2Flocalhost%3A3000%2Fapi%2Fauth%2Fcallback');
    expect(url).toContain('scope=user-read-private');
    expect(url).toContain('show_dialog=true');

    // Check state parameter
    const parsed = new URL(url);
    const state = parsed.searchParams.get('state');
    expect(state).toBeTruthy();
    const stateObj = JSON.parse(state!);
    expect(stateObj).toEqual({ timeRange, trackLimit });
  });

  it('throws if client ID is missing', async () => {
    delete process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID;
    process.env.NEXT_PUBLIC_REDIRECT_URI = 'http://localhost:3000/api/auth/callback';
    const { getSpotifyAuthUrl } = await import('../spotify-client');
    expect(() => getSpotifyAuthUrl('short_term', '10')).toThrow('NEXT_PUBLIC_SPOTIFY_CLIENT_ID is not defined');
  });

  it('throws if redirect URI is missing', async () => {
    process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID = 'test-client-id';
    delete process.env.NEXT_PUBLIC_REDIRECT_URI;
    const { getSpotifyAuthUrl } = await import('../spotify-client');
    expect(() => getSpotifyAuthUrl('short_term', '10')).toThrow('NEXT_PUBLIC_REDIRECT_URI is not defined');
  });
}); 