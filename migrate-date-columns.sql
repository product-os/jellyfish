-- Lock tables.
LOCK TABLE cards IN SHARE MODE;
LOCK TABLE links IN SHARE MODE;

-- Disable all triggers, namely for streams.
ALTER TABLE cards DISABLE TRIGGER ALL;

-- Rename columns.
ALTER TABLE cards RENAME COLUMN created_at TO old_created_at;
ALTER TABLE cards RENAME COLUMN updated_at TO old_updated_at;
ALTER TABLE cards RENAME COLUMN new_created_at TO created_at;
ALTER TABLE cards RENAME COLUMN new_updated_at TO updated_at;

-- Rename indexes.
ALTER INDEX IF EXISTS created_at_cards_idx RENAME to old_created_at_cards_idx;
ALTER INDEX IF EXISTS updated_at_cards_idx RENAME to old_updated_at_cards_idx;
ALTER INDEX IF EXISTS new_created_at_cards_idx RENAME to created_at_cards_idx;
ALTER INDEX IF EXISTS new_updated_at_cards_idx RENAME to updated_at_cards_idx;

-- Re-enable triggers.
ALTER TABLE cards ENABLE TRIGGER ALL;