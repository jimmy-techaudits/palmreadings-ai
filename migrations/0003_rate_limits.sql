-- Fixed-window counters for rate limiting. Keys are hashed (no raw IP addresses);
-- rows older than two days are purged by the daily cron.
CREATE TABLE rate_limits (
  key TEXT NOT NULL,       -- e.g. "reading:ip:<hash>" or "reading:all"
  window TEXT NOT NULL,    -- e.g. "h:2026-11-10T15" or "d:2026-11-10"
  count INTEGER NOT NULL,
  PRIMARY KEY (key, window)
);
