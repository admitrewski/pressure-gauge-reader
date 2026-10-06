-- Native (non-synced) Lakebase table the app writes reviewer decisions to.
-- Append-only: every confirm / override is a new row, so the full review history is kept.
-- REPLICA IDENTITY FULL + supported types (int8, text, float8, timestamptz) are required for Lakehouse Sync.
CREATE SCHEMA IF NOT EXISTS review;

CREATE TABLE IF NOT EXISTS review.reading_overrides (
  override_id     BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  image_id        TEXT        NOT NULL,
  action          TEXT        NOT NULL CHECK (action IN ('confirm', 'override', 'unreadable')),
  human_value     DOUBLE PRECISION,
  override_reason TEXT,
  reviewed_by     TEXT        NOT NULL,
  reviewed_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (action <> 'override' OR human_value IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS reading_overrides_image_idx ON review.reading_overrides (image_id, reviewed_at DESC);

ALTER TABLE review.reading_overrides REPLICA IDENTITY FULL;
