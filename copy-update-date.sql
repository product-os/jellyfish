DO $$
DECLARE
	updated INTEGER := 0;
	total INTEGER := 0;
BEGIN
	LOOP
		UPDATE cards SET new_updated_at=TO_TIMESTAMP(updated_at, 'YYYY-MM-DDThh24:mi:ss.MSZ') WHERE id IN (SELECT id FROM cards WHERE updated_at IS NOT NULL AND new_updated_at IS NULL LIMIT 100);
		COMMIT;
		GET DIAGNOSTICS updated = ROW_COUNT;
		IF updated = 0 THEN
			EXIT;
		END IF;
		total = total + updated;	
		RAISE INFO 'Updated % rows...', total;
	END LOOP;
END;
$$ LANGUAGE plpgsql;