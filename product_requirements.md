# Reclist - Product Requirements

## Overview

Reclist is a mobile-first web app (PWA) for collecting music recommendations from various sources and triaging them into an Apple Music playlist.

## Problem Statement

Music recommendations come from many places—Spotify Discover playlists, newsletters, YouTube, friends—but there's no good way to capture them for later listening. Playlists get messy over time, and it's annoying to manage a queue that mixes "to listen" with "listened and liked."

## Solution

A simple "recommendation inbox" where items come in, you listen and decide, and liked items graduate to a permanent playlist while dismissed items disappear.

---

## User Stories

1. **As a user**, I can connect my Apple Music account so the app can access my playlists
2. **As a user**, I can select which playlist "kept" items go to
3. **As a user**, I can add a recommendation by pasting a URL (Apple Music, Spotify, YouTube, Bandcamp)
4. **As a user**, I can add a recommendation by searching Apple Music
5. **As a user**, I can add a manual text note for recommendations I'll resolve later
6. **As a user**, I can tap Play to open the item in Apple Music (or original source)
7. **As a user**, I can tap Keep to add the item to my playlist and remove from inbox
8. **As a user**, I can tap Dismiss to remove an item without keeping it

---

## Features

### Authentication
- Apple Music authentication via MusicKit JS
- Persistent login (tokens stored locally)

### Adding Recommendations

**Three input methods:**

| Method | Flow |
|--------|------|
| **URL Paste** | Paste link → app extracts metadata → added to inbox |
| **Search** | Type query → search Apple Music → select result → added to inbox |
| **Manual Note** | Type freeform text → added as unresolved note |

**Supported URL sources:**
- Apple Music (direct integration)
- Spotify (search Apple Music for equivalent)
- YouTube (search Apple Music for equivalent)
- Bandcamp (search Apple Music for equivalent)

### Inbox

- List of recommendation cards showing: name, artist, artwork, type (song/album/artist), age
- Manual notes show text and a "Resolve" button to search and convert

### Actions

| Action | Behavior |
|--------|----------|
| **Play** | Opens item in Apple Music app/web |
| **Keep** | Adds to selected playlist, removes from inbox |
| **Dismiss** | Removes from inbox |

### Item Types

The app supports three types of music items:

| Type | Keep Behavior |
|------|---------------|
| **Song** | Add song to playlist |
| **Album** | Add all songs from album to playlist |
| **Artist** | Add artist's top songs to playlist (configurable count) |

### Settings
- Change keeper playlist
- Configure artist "keep" behavior (top 5/10/all songs)
- Disconnect Apple Music
- Clear all items

---

## Screens

### 1. Login
- "Connect with Apple Music" button
- MusicKit authorization flow

### 2. Playlist Selection (first-time + settings)
- List of user's playlists from Apple Music API
- Tap to select as keeper playlist

### 3. Inbox (main screen)
```
┌──────────────────────────────────────────┐
│  Reclist                    [+]    [⚙]   │
├──────────────────────────────────────────┤
│  ┌────────────────────────────────────┐  │
│  │ [img] Khruangbin                   │  │
│  │       Con Todo El Mundo            │  │
│  │       Album • 3 days ago           │  │
│  │       [▶ Play] [♥ Keep] [✕]        │  │
│  └────────────────────────────────────┘  │
│                                          │
│  ┌────────────────────────────────────┐  │
│  │ [?]  "that band from the coffee    │  │
│  │       shop"                        │  │
│  │       Note • 1 week ago            │  │
│  │       [🔍 Resolve] [✕]             │  │
│  └────────────────────────────────────┘  │
└──────────────────────────────────────────┘
```

### 4. Add Modal
- Three tabs: URL | Search | Note
- **URL tab**: Text input for pasting links
- **Search tab**: Text input with results list
- **Note tab**: Text input for freeform text

### 5. Settings
- Keeper playlist selection
- Artist keep behavior
- Account management

---

## Technical Architecture

### Stack
- **Framework:** Vite + React + TypeScript
- **Styling:** Tailwind CSS
- **Music API:** MusicKit JS (Apple Music)
- **Storage:** localStorage (no backend)
- **PWA:** Vite PWA plugin

### Data Model

```typescript
interface Recommendation {
  id: string;
  type: 'song' | 'album' | 'artist' | 'note';

  // For resolved items (from Apple Music)
  appleMusicId?: string;
  name?: string;
  artistName?: string;
  artworkUrl?: string;
  appleMusicUrl?: string;

  // For URL-sourced items not yet resolved
  externalUrl?: string;

  // For manual notes
  noteText?: string;

  createdAt: string; // ISO date
}

interface AppState {
  appleMusicToken?: string;
  keeperPlaylistId?: string;
  artistKeepCount: number; // default 10
  recommendations: Recommendation[];
}
```

### Apple Music Integration

**Prerequisites:**
- Apple Developer account ($99/year)
- MusicKit identifier and private key
- Developer token (JWT signed with private key)

**MusicKit JS Setup:**
```javascript
MusicKit.configure({
  developerToken: 'YOUR_DEVELOPER_TOKEN',
  app: {
    name: 'Reclist',
    build: '1.0.0'
  }
});
```

**Key API Operations:**
| Action | MusicKit Method |
|--------|-----------------|
| Authorize user | `music.authorize()` |
| Get playlists | `music.api.library.playlists()` |
| Search catalog | `music.api.search(term, { types: ['songs', 'albums', 'artists'] })` |
| Add to playlist | `music.api.library.add({ songs: [id] })` |

---

## Implementation Phases

### Phase 1: Core Loop (MVP)
- [ ] Project setup (Vite + React + TypeScript + Tailwind)
- [ ] MusicKit JS integration and auth flow
- [ ] Playlist selection screen
- [ ] Add by Apple Music search
- [ ] Inbox list with Play/Keep/Dismiss
- [ ] Keep → adds to Apple Music playlist

### Phase 2: Full Input Options
- [ ] Add by URL (Apple Music, Spotify, YouTube, Bandcamp)
- [ ] URL parsing and Apple Music search for equivalents
- [ ] Add manual notes
- [ ] "Resolve" flow for notes

### Phase 3: Polish
- [ ] PWA manifest + service worker
- [ ] Share target API (receive shares from other apps)
- [ ] Pull-to-refresh
- [ ] Swipe gestures for keep/dismiss
- [ ] Offline support

---

## Dependencies

- Apple Developer Program membership ($99/year)
- MusicKit JS SDK
- User must have Apple Music subscription

---

## Success Metrics

- Recommendations captured per week
- % of recommendations processed (kept or dismissed)
- Time from add to decision

---

## Open Questions

1. **Playlist creation:** Should the app be able to create a new playlist, or only use existing ones?
2. **History:** Should there be a way to see previously kept/dismissed items?
3. **Sorting:** Should inbox be sortable (by date, type, etc.)?

---

## Appendix: URL Parsing

```typescript
function parseUrl(url: string): UrlParseResult {
  // Apple Music
  if (url.includes('music.apple.com')) {
    const match = url.match(/\/(album|song|artist)\/[^/]+\/(\d+)/);
    if (match) return { source: 'apple', type: match[1], id: match[2] };
  }

  // Spotify
  if (url.includes('spotify.com') || url.includes('spotify.link')) {
    const match = url.match(/\/(track|album|artist)\/(\w+)/);
    if (match) return { source: 'spotify', type: match[1], id: match[2] };
  }

  // YouTube
  if (url.includes('youtube.com') || url.includes('youtu.be')) {
    return { source: 'youtube', url };
  }

  // Bandcamp
  if (url.includes('bandcamp.com')) {
    return { source: 'bandcamp', url };
  }

  return { source: 'unknown', url };
}
```
