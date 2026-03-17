-- Recommendations table
CREATE TABLE recommendations (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('song', 'album', 'artist', 'playlist', 'note')),
  spotify_id TEXT,
  name TEXT,
  artist_name TEXT,
  artwork_url TEXT,
  spotify_url TEXT,
  external_url TEXT,
  external_source TEXT,
  note_text TEXT,
  listening_guide TEXT,
  last_opened_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX idx_recommendations_user_id ON recommendations(user_id);
CREATE INDEX idx_recommendations_user_created ON recommendations(user_id, created_at DESC);

-- User settings table
CREATE TABLE user_settings (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  keeper_playlist_id TEXT,
  keeper_playlist_name TEXT,
  artist_keep_count INTEGER DEFAULT 10,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Spotify API tokens (Supabase only exposes provider_token at sign-in time)
CREATE TABLE user_spotify_tokens (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  expires_at BIGINT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Row Level Security
ALTER TABLE recommendations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can CRUD own recommendations"
  ON recommendations FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can CRUD own settings"
  ON user_settings FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

ALTER TABLE user_spotify_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can CRUD own tokens"
  ON user_spotify_tokens FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Enable Realtime for cross-device sync
ALTER PUBLICATION supabase_realtime ADD TABLE recommendations;
