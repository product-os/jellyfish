-- Drop old indexes.
DROP INDEX IF EXISTS old_created_at_cards_idx;
DROP INDEX IF EXISTS old_updated_at_cards_idx;

-- Drop old columns.
ALTER TABLE cards DROP COLUMN IF EXISTS old_created_at;
ALTER TABLE cards DROP COLUMN IF EXISTS old_updated_at;

-- Reclaim storage and update statistics for planner.
VACUUM ANALYZE cards;
