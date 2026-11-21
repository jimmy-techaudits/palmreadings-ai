-- Payments and the free reading (Nov 2026).

-- "preview": the free part only, until paid. Earlier readings are complete, hence the default.
ALTER TABLE readings ADD COLUMN tier TEXT NOT NULL DEFAULT 'full';
-- Set when the full reading was paid for (up front, or to unlock a preview).
ALTER TABLE readings ADD COLUMN paid_at TEXT;
-- How much was paid, in cents (anonymous, for stats).
ALTER TABLE readings ADD COLUMN amount_cents INTEGER;
-- When writing the paid part started, so a refresh mid-way doesn't start a second, duplicate write.
ALTER TABLE readings ADD COLUMN writing_at TEXT;

-- One row per Stripe Checkout Session.
CREATE TABLE purchases (
  session_id TEXT PRIMARY KEY,   -- Stripe Checkout Session id (or mock_... in local testing)
  created_at TEXT NOT NULL,
  kind TEXT NOT NULL,            -- reading (paid up front) | unlock (a free preview)
  mode TEXT NOT NULL,            -- solo | couple
  focus TEXT NOT NULL,
  reading_id TEXT,               -- unlock: the preview; reading: set once the reading is created
  amount_cents INTEGER NOT NULL,
  success_url TEXT NOT NULL,     -- where checkout returns (used by the local mock checkout)
  email TEXT,                    -- from Stripe, to email the private link
  paid_at TEXT,
  used_at TEXT                   -- a paid-up-front purchase can make one reading
);
CREATE INDEX purchases_reading ON purchases (reading_id);

-- Free readings already given, to allow one per visitor. Keys are hashed with a secret salt:
-- v:<visitor cookie>, e:<email>, ip:<IP address> (the IP is a backstop for shared networks).
CREATE TABLE free_claims (
  key TEXT NOT NULL,
  reading_id TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX free_claims_key ON free_claims (key, created_at);

-- People who gave their email on a free reading. Giving it means agreeing to marketing emails;
-- the exact wording and time are kept as proof of consent.
CREATE TABLE subscribers (
  email TEXT PRIMARY KEY,
  created_at TEXT NOT NULL,
  consent_text TEXT NOT NULL,
  consent_at TEXT NOT NULL,
  source TEXT NOT NULL,                 -- e.g. free_reading
  first_reading_id TEXT,
  unsubscribe_token TEXT NOT NULL UNIQUE,
  unsubscribed_at TEXT
);
