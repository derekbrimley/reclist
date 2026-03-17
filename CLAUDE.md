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

Reclist is a mobile-first PWA for collecting music recommendations and triaging them into a Spotify playlist. Users add recommendations (via search, URL, or text notes), then process them with Play/Keep/Dismiss actions. Supports multi-user accounts with cross-device sync.

**Tech Stack:** Vite + React 19 + TypeScript, Tailwind CSS v4, Supabase (Auth + Postgres + Realtime + Edge Functions), Spotify Web API, localStorage as offline cache, vite-plugin-pwa for installability.

## Architecture

### Authentication
- `src/hooks/useSupabaseAuth.ts` - Supabase Auth with Spotify as the OAuth provider
- Supabase handles the OAuth redirect flow; Spotify client secret is stored server-side in Supabase Dashboard
- Spotify API tokens (access + refresh) are captured at sign-in and stored in `user_spotify_tokens` table
- Token refresh is handled client-side using the stored refresh token

### State Management
- `src/context/AppContext.tsx` - Single reducer-based context managing all app state (`AppState`)
- Actions: `SET_AUTHORIZED`, `SET_USER_ID`, `SET_KEEPER_PLAYLIST`, `ADD_RECOMMENDATION`, `REMOVE_RECOMMENDATION`, `UPDATE_RECOMMENDATION`, `SET_ARTIST_KEEP_COUNT`, `CLEAR_ALL`, `HYDRATE_FROM_SERVER`, `SYNC_ADD`, `SYNC_REMOVE`, `SYNC_UPDATE`
- State auto-persists to localStorage as an offline cache via `useEffect` in `AppProvider`
- On mount, data is hydrated from Supabase (server is source of truth)

### Database (Supabase Postgres)
- `recommendations` table - one row per recommendation, owned by `user_id` (RLS enforced)
- `user_settings` table - per-user keeper playlist and preferences
- `user_spotify_tokens` table - Spotify access/refresh tokens per user
- Schema in `supabase/migrations/001_initial_schema.sql`

### Sync & Offline Support
- `src/hooks/useSync.ts` - Bidirectional sync: fetches from Supabase on mount, subscribes to Realtime for cross-device updates
- Writes go to both local state (optimistic) and Supabase; failures are queued in `src/utils/pendingOps.ts`
- Pending operations are flushed when the device comes back online
- Realtime echo suppression prevents duplicate dispatches from own writes

### Spotify Integration
- `src/hooks/useSpotify.ts` - Pure API client that receives an access token (no longer manages OAuth)
- Exposes: `getPlaylists`, `search`, `addToPlaylist`, `getAlbumTracks`, `getPlaylistMetadata`, `getPlaylistTracks`
- Spotify API types are declared in the hook file

### Listening Guide (Edge Function)
- `supabase/functions/generate-listening-guide/index.ts` - Server-side Claude API proxy
- `src/utils/claude.ts` - Client calls the Edge Function with Supabase JWT auth
- Anthropic API key is stored as a Supabase secret (never exposed to client)

### Data Types
- `Recommendation` - Core entity with type (`song`/`album`/`artist`/`playlist`/`note`), Spotify metadata, or external URL/note text
- `AppState` - Auth status, user ID, hydration flag, keeper playlist, recommendations list
- `SearchResult` - Spotify search results with `spotifyUrl`
- See `src/types/index.ts` for all type definitions

### Key Flows
1. **Login** → Supabase OAuth redirect to Spotify → Callback → Token capture → Playlist selection → Main inbox
2. **Add** → URL parse / Spotify search / text note → Creates `Recommendation` → Syncs to Supabase
3. **Keep** → Adds track to selected Spotify playlist → Removes from inbox → Syncs removal
4. **Dismiss** → Removes from inbox → Syncs removal

### Utilities
- `src/utils/urlParser.ts` - Parses Spotify, Apple Music, YouTube, Bandcamp URLs
- `src/utils/storage.ts` - localStorage load/save (offline cache), ID generation
- `src/utils/pendingOps.ts` - Offline operation queue
- `src/utils/migration.ts` - One-time migration from localStorage to Supabase
- `src/utils/time.ts` - Relative time formatting

## Environment Setup

```bash
cp .env.example .env
# Required:
# VITE_SPOTIFY_CLIENT_ID=your_client_id_here
# VITE_SUPABASE_URL=https://your-project-ref.supabase.co
# VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

### Supabase Setup
1. Create a Supabase project at https://supabase.com/dashboard
2. Run the migration: `supabase db push` (or apply `supabase/migrations/001_initial_schema.sql` manually)
3. Enable Spotify as an auth provider under Authentication > Providers (requires Spotify client ID + secret)
4. Set the Spotify scopes: `user-read-private playlist-read-private playlist-modify-public playlist-modify-private user-library-modify`
5. Deploy the Edge Function: `supabase functions deploy generate-listening-guide`
6. Set the Anthropic secret: `supabase secrets set ANTHROPIC_API_KEY=sk-...`

### Spotify Setup
Requires free Spotify Developer account and Spotify account (free or premium) to test. Create app at https://developer.spotify.com/dashboard. Add the Supabase callback URL as an allowed redirect URI: `https://<project-ref>.supabase.co/auth/v1/callback`.

**Important:** To allow more than 25 users, submit a quota extension request in the Spotify Developer Dashboard.
