DO $$
	BEGIN
		-- Lock tables.
		LOCK TABLE cards IN SHARE MODE;
		LOCK TABLE links IN SHARE MODE;

		-- Rename columns back to original state.
		ALTER TABLE cards RENAME COLUMN created_at TO new_created_at;
		ALTER TABLE cards RENAME COLUMN updated_at TO new_updated_at;
		ALTER TABLE cards RENAME COLUMN old_created_at TO created_at;
		ALTER TABLE cards RENAME COLUMN old_updated_at TO updated_at;

		-- Rename indexes back to original state.
		ALTER INDEX IF EXISTS created_at_cards_idx RENAME TO new_created_at_cards_idx;
		ALTER INDEX IF EXISTS updated_at_cards_idx RENAME TO new_updated_at_cards_idx;
		ALTER INDEX IF EXISTS old_created_at_cards_idx RENAME TO created_at_cards_idx;
		ALTER INDEX IF EXISTS old_updated_at_cards_idx RENAME TO updated_at_cards_idx;
	END;
$$ LANGUAGE plpgsql;
