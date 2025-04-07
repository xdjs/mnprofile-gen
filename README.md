# Music Nerd Profile Generator

This app generates a music nerd profile based on your Spotify top tracks. It analyzes your music taste and creates a personalized profile with both text analysis and an AI-generated image that represents your music preferences.

## Requirements

1. Spotify client id. You can create one here: [Spotify Developer Dashboard](https://developer.spotify.com)
2. OpenAI api key. You can create one here: [OpenAI Platform](https://platform.openai.com)

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/mnprofile-gen.git
   cd mnprofile-gen
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   - Create a `.env.local` file in the root directory
   - Add the following variables:
     ```env
     NEXT_PUBLIC_SPOTIFY_CLIENT_ID=your_spotify_client_id
     NEXT_PUBLIC_REDIRECT_URI=http://localhost:3000/api/auth/callback
     SPOTIFY_CLIENT_SECRET=your_spotify_client_secret
     OPENAI_API_KEY=your_openai_api_key
     ```

4. Spotify Setup:
   - Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
   - Create a new application
   - Add `http://localhost:3000/api/auth/callback` to the Redirect URIs in your Spotify app settings
   - Copy your Client ID and Client Secret to the `.env.local` file

5. OpenAI Setup:
   - Go to [OpenAI Platform](https://platform.openai.com/api-keys)
   - Create a new API key
   - Copy the API key to the `.env.local` file

## Running the App

1. Start the development server:
   ```bash
   npm run dev
   ```

2. Open [http://localhost:3000](http://localhost:3000) in your browser

## Troubleshooting

- **Spotify Authentication Error**: Make sure your Redirect URI in the Spotify Developer Dashboard exactly matches the one in your `.env.local` file
- **OpenAI Error**: Ensure you have sufficient credits and your API key has the necessary permissions
- **"Failed to analyze tracks"**: Check your OpenAI API key and ensure it has access to both the GPT and DALL-E APIs

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

