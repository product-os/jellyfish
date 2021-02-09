SET statement_timeout=0;
DO $$
DECLARE
	updated INTEGER := 0;
	total INTEGER := 0;
BEGIN
	LOOP
		UPDATE cards SET new_created_at=TO_TIMESTAMP(created_at, 'YYYY-MM-DDThh24:mi:ss.MSZ') WHERE id IN (SELECT id FROM cards WHERE new_created_at IS NULL FOR UPDATE SKIP LOCKED LIMIT 1000);
		COMMIT;
		GET DIAGNOSTICS updated = ROW_COUNT;
		total = total + updated;
		RAISE INFO 'Updated % rows...', total;
		IF NOT EXISTS (SELECT FROM cards WHERE new_created_at IS NULL) THEN
			EXIT;
		END IF;
		PERFORM pg_sleep(1);
	END LOOP;
END;
$$ LANGUAGE plpgsql;
