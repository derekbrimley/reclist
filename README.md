# Reclist

A mobile-first web app (PWA) for collecting music recommendations and triaging them into a Spotify playlist.

## Prerequisites

1. **Spotify Developer Account** (free) - Required to create an app and get client ID
2. **Spotify account** (free or premium) - Required to access playlists

## Setup

### 1. Create a Spotify App

1. Go to the [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Log in with your Spotify account
3. Click "Create app"
4. Fill in the app details:
   - App name: Reclist (or your choice)
   - App description: Personal music recommendation inbox
   - Redirect URI: `http://127.0.0.1:5173` (Spotify requires loopback IP, not localhost)
5. Save your app and copy the **Client ID**

### 2. Configure the app

```bash
# Copy the example env file
cp .env.example .env

# Edit .env and add your Spotify credentials
VITE_SPOTIFY_CLIENT_ID=your_client_id_here
VITE_SPOTIFY_REDIRECT_URI=http://127.0.0.1:5173
```

### 3. Install dependencies and run

```bash
npm install
npm run dev
```

The app will be available at `http://127.0.0.1:5173` (use this URL, not localhost, to match your Spotify redirect URI)

## Development

```bash
# Run dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Type check
npx tsc --noEmit
```

## Project Structure

```
src/
├── components/       # React components
├── context/          # React context (app state)
├── hooks/            # Custom hooks (MusicKit integration)
├── types/            # TypeScript types
└── utils/            # Utility functions
```

## Features

### Phase 1 (Current - MVP)
- [x] Project setup
- [x] Spotify Web API integration with OAuth PKCE
- [x] Add by Spotify search
- [x] Add by Spotify URL
- [x] Inbox with Play/Keep/Dismiss
- [x] Keep → adds to Spotify playlist

### Phase 2 (Planned)
- [ ] Add by URL (Apple Music, YouTube, Bandcamp) - treated as external sources
- [ ] Add manual notes
- [ ] "Resolve" flow for notes
- [ ] Support for albums/artists (currently only tracks)

### Phase 3 (Planned)
- [ ] PWA manifest + service worker (installable)
- [ ] Share target API
- [ ] Swipe gestures
- [ ] Offline support

## Tech Stack

- **Framework:** Vite + React + TypeScript
- **Styling:** Tailwind CSS
- **Music API:** Spotify Web API with OAuth 2.0 PKCE
- **Storage:** localStorage
- **PWA:** Vite PWA plugin
