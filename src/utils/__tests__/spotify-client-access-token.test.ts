describe('getSpotifyAccessToken', () => {
  const OLD_ENV = process.env;
  const mockRefreshToken = 'test-refresh-token-123';

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...OLD_ENV };
    process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID = 'test-client-id';
    process.env.SPOTIFY_CLIENT_SECRET = 'test-client-secret';
    
    // Mock global fetch
    global.fetch = jest.fn();
  });

  afterAll(() => {
    process.env = OLD_ENV;
  });

  it('successfully refreshes access token', async () => {
    const mockTokenResponse = {
      access_token: 'new-access-token-456',
      token_type: 'Bearer',
      expires_in: 3600,
      scope: 'user-read-private user-top-read'
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: jest.fn().mockResolvedValue(mockTokenResponse)
    });

    const { getSpotifyAccessToken } = await import('../spotify-client');
    const result = await getSpotifyAccessToken(mockRefreshToken);

    expect(fetch).toHaveBeenCalledWith('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: 'Basic dGVzdC1jbGllbnQtaWQ6dGVzdC1jbGllbnQtc2VjcmV0' // base64 encoded credentials
      },
      body: expect.any(URLSearchParams)
    });

    expect(result).toBe('new-access-token-456');
  });

  it('throws error when refresh token request fails', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 400,
      statusText: 'Bad Request'
    });

    const { getSpotifyAccessToken } = await import('../spotify-client');
    
    await expect(getSpotifyAccessToken(mockRefreshToken)).rejects.toThrow('Failed to refresh access token');
  });

  it('throws error when network request fails', async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

    const { getSpotifyAccessToken } = await import('../spotify-client');
    
    await expect(getSpotifyAccessToken(mockRefreshToken)).rejects.toThrow('Network error');
  });

  it('correctly encodes credentials in Authorization header', async () => {
    const mockTokenResponse = {
      access_token: 'test-token',
      token_type: 'Bearer',
      expires_in: 3600
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: jest.fn().mockResolvedValue(mockTokenResponse)
    });

    const { getSpotifyAccessToken } = await import('../spotify-client');
    await getSpotifyAccessToken(mockRefreshToken);

    const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
    const headers = fetchCall[1].headers;
    
    // Verify the Authorization header contains base64 encoded credentials
    expect(headers.Authorization).toBe('Basic dGVzdC1jbGllbnQtaWQ6dGVzdC1jbGllbnQtc2VjcmV0');
  });

  it('sends correct request body with refresh token', async () => {
    const mockTokenResponse = {
      access_token: 'test-token',
      token_type: 'Bearer',
      expires_in: 3600
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: jest.fn().mockResolvedValue(mockTokenResponse)
    });

    const { getSpotifyAccessToken } = await import('../spotify-client');
    await getSpotifyAccessToken(mockRefreshToken);

    const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
    const body = fetchCall[1].body as URLSearchParams;
    
    expect(body.get('grant_type')).toBe('refresh_token');
    expect(body.get('refresh_token')).toBe(mockRefreshToken);
  });
}); 