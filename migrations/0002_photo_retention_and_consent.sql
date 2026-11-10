-- Photos are deleted 3 years after the reading was last opened; the reading text is kept.
ALTER TABLE readings ADD COLUMN photos_deleted_at TEXT;
-- Optional, separate permission to use this reading's palm photos in marketing.
ALTER TABLE readings ADD COLUMN marketing_consent INTEGER NOT NULL DEFAULT 0;
ALTER TABLE readings ADD COLUMN marketing_consent_at TEXT;
CREATE INDEX readings_photo_retention ON readings (photos_deleted_at, last_viewed_at, created_at);
