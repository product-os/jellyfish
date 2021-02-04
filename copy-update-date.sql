DO $$
DECLARE
	updated INTEGER := 0;
	total INTEGER := 0;
BEGIN
	LOOP
		UPDATE cards SET new_updated_at=TO_TIMESTAMP(updated_at, 'YYYY-MM-DDThh24:mi:ss.MSZ') WHERE id IN (SELECT id FROM cards WHERE updated_at IS NOT NULL AND new_updated_at IS NULL FOR UPDATE SKIP LOCKED LIMIT 1000);
		COMMIT;
		IF NOT EXISTS (SELECT FROM cards WHERE updated_at IS NOT NULL AND new_updated_at IS NULL) THEN
			EXIT;
		END IF;
		GET DIAGNOSTICS updated = ROW_COUNT;
		total = total + updated;
		RAISE INFO 'Updated % rows...', total;
		PERFORM pg_sleep(1);
	END LOOP;
END;
$$ LANGUAGE plpgsql;
