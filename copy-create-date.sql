DO $$
DECLARE
	updated INTEGER := 0;
	total INTEGER := 0;
BEGIN
	LOOP
		UPDATE cards SET new_created_at=TO_TIMESTAMP(created_at, 'YYYY-MM-DDThh24:mi:ss.MSZ') WHERE id IN (SELECT id FROM cards WHERE new_created_at IS NULL FOR UPDATE SKIP LOCKED LIMIT 1000);
		COMMIT;
		GET DIAGNOSTICS updated = ROW_COUNT;
		IF updated = 0 THEN
			EXIT;
		END IF;
		total = total + updated;	
		RAISE INFO 'Updated % rows...', total;
		PERFORM pg_sleep(1);
	END LOOP;
END;
$$ LANGUAGE plpgsql;