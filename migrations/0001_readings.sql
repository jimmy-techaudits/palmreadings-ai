-- Saved readings. Photos live in R2 under readings/<id>/<slot>.jpg.
CREATE TABLE readings (
  id TEXT PRIMARY KEY,               -- 128-bit random, base64url; the private link is /r/<id>/
  created_at TEXT NOT NULL,
  last_viewed_at TEXT,

  -- Anonymous fields for aggregate stats and marketing (no names).
  mode TEXT NOT NULL,                -- solo | couple
  focus TEXT NOT NULL,               -- overall | love | career
  include_family INTEGER NOT NULL,   -- 0 | 1
  provider TEXT,
  age_band TEXT,                     -- e.g. 25-34, of the first person
  dominant_hand TEXT,                -- of the first person
  element TEXT,                      -- dominant-hand element of the first person
  marriages TEXT,                    -- e.g. "1–2" (family readings only)
  children TEXT,
  rating INTEGER,                    -- 1 | -1 from feedback
  feedback TEXT,

  -- Everything needed to show the reading again (includes optional names).
  data TEXT NOT NULL                 -- JSON: SavedReadingData
);
CREATE INDEX readings_created_at ON readings (created_at);
