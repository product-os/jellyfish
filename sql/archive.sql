SET statement_timeout=0;

-- Move old contracts to archive tables
DO $$
DECLARE
    contract_ids UUID[];
    link_ids UUID[];
    primary_link_ids: UUID[];
    secondary_link_ids: UUID[];
BEGIN
    LOOP
        -- Select contracts we no longer need in the main table
        SELECT array_agg(id) INTO contract_ids FROM (
            SELECT id FROM cards WHERE (type='execute@1.0.0' OR (type='session@1.0.0' AND slug!='session-admin-kernel') OR type='external-event@1.0.0' OR active=false)
                AND created_at < to_char(CURRENT_DATE - INTERVAL '3 months', 'YYYY-MM-DD')::date LIMIT 1000
        ) as subset;
        IF (contract_ids IS NULL) THEN
            RAISE INFO 'No more matching contracts found, quitting...';
            EXIT;
        END IF;
        RAISE INFO 'Archiving % contracts...', array_length(contract_ids, 1);

        -- Select links for matching contracts
        SELECT array_agg(id) INTO primary_link_ids FROM links2 WHERE fromid = ANY(contract_ids) OR toid = ANY(contract_ids);
        SELECT array_agg(id) INTO secondary_link_ids FROM links2 WHERE fromid = ANY(primary_link_ids) OR toid = ANY(primary_link_ids);
        link_ids = array_cat(primary_link_ids, secondary_link_ids);
        RAISE INFO 'Archiving % links...', array_length(link_ids, 1);

        -- Archive link records from links2 table
        WITH moved_rows AS (
            DELETE FROM links2 WHERE id = ANY(link_ids) OR fromid = ANY(link_ids) OR toid = ANY(link_ids) RETURNING *
        ) INSERT INTO archive_links2 SELECT * FROM moved_rows;

        -- Archive link records from cards table
        WITH moved_rows AS (
            DELETE FROM cards WHERE type='link@1.0.0' AND id = ANY(link_ids) RETURNING *
        ) INSERT INTO archive_cards SELECT * FROM moved_rows;

        -- Archive contract records from cards table
        WITH moved_rows AS (
            DELETE FROM cards WHERE id = ANY(contract_ids) RETURNING *
        ) INSERT INTO archive_cards SELECT * FROM moved_rows;

        -- Sleep for 1 second so as to not overload the database
        PERFORM pg_sleep(1);
    END LOOP;
END;
$$ LANGUAGE plpgsql;
