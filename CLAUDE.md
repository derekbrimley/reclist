# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build Commands

```bash
npm run dev      # Start Vite dev server (localhost:5173)
npm run build    # Type check (tsc -b) then Vite production build
npm run lint     # ESLint on all files
npm run preview  # Preview production build
npx tsc --noEmit # Type check without emitting
```

## Project Overview

Reclist is a mobile-first PWA for collecting music recommendations and triaging them into a Spotify playlist. Users add recommendations (via search, URL, or text notes), then process them with Play/Keep/Dismiss actions.

**Tech Stack:** Vite + React 19 + TypeScript, Tailwind CSS v4, Spotify Web API with OAuth 2.0 PKCE for music integration, localStorage for persistence, vite-plugin-pwa for installability.

## Architecture

### State Management
- `src/context/AppContext.tsx` - Single reducer-based context managing all app state (`AppState`)
- Actions: `SET_AUTHORIZED`, `SET_KEEPER_PLAYLIST`, `ADD_RECOMMENDATION`, `REMOVE_RECOMMENDATION`, `UPDATE_RECOMMENDATION`, `SET_ARTIST_KEEP_COUNT`, `CLEAR_ALL`
- State auto-persists to localStorage via `useEffect` in `AppProvider`

### Spotify Integration
- `src/hooks/useSpotify.ts` - Custom hook wrapping Spotify Web API with OAuth 2.0 PKCE flow
- Requires `VITE_SPOTIFY_CLIENT_ID` and `VITE_SPOTIFY_REDIRECT_URI` env vars
- OAuth flow: generates code verifier/challenge, redirects to Spotify, exchanges code for tokens
- Tokens stored in localStorage with refresh handling
- Exposes: `authorize`, `handleCallback`, `unauthorize`, `getPlaylists`, `search`, `addToPlaylist`
- Spotify API types are declared in the hook file

### Data Types
- `Recommendation` - Core entity with type (`song`/`album`/`artist`/`note`), Spotify metadata (`spotifyId`, `spotifyUrl`), or external URL/note text
- `AppState` - Authorization status, keeper playlist, recommendations list
- `SearchResult` - Spotify search results with `spotifyUrl`
- See `src/types/index.ts` for all type definitions

### Key Flows
1. **Login** → OAuth redirect to Spotify → Callback with code → Token exchange → Playlist selection → Main inbox
2. **Add** → URL parse / Spotify search / text note → Creates `Recommendation`
3. **Keep** → Adds track to selected Spotify playlist → Removes from inbox
4. **Dismiss** → Removes from inbox

### Utilities
- `src/utils/urlParser.ts` - Parses Spotify, Apple Music, YouTube, Bandcamp URLs
- `src/utils/storage.ts` - localStorage load/save, ID generation
- `src/utils/time.ts` - Relative time formatting

## Environment Setup

```bash
cp .env.example .env
# Add:
# VITE_SPOTIFY_CLIENT_ID=your_client_id_here
# VITE_SPOTIFY_REDIRECT_URI=http://127.0.0.1:5173
```

Requires free Spotify Developer account and Spotify account (free or premium) to test. Create app at https://developer.spotify.com/dashboard and configure redirect URI. **Important:** Spotify requires loopback addresses to use explicit IP (127.0.0.1), not localhost.
