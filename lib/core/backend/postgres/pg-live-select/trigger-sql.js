/*
 * Adapted from https://github.com/numtel/pg-live-select
 *
 * The MIT License (MIT)
 *
 * Copyright (c) 2015
 *
 * Ben Green <ben@latenightsketches.com>
 * Robert Myers <rbmyr8@gmail.com>
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

/*
 * Template for trigger function to send row changes over notification
 */
module.exports = (lockKey, triggerProcedure, triggerName, table, channel, columns, messageMaxLen) => {
	// We can put up to `messageMaxLen` bytes in each notify payload, but since
	// it's encoded in base64, the actual amount of data we can push is
	// slightly lower
	let pageByteLen = 3 * Math.floor(messageMaxLen / 4)

	// Base64 has a 4-byte padding, so round down to a multiple of 4
	const rem = pageByteLen % 4
	if (rem > 0) {
		pageByteLen += 4 - rem
	}

	return `
	BEGIN;

	SELECT pg_advisory_xact_lock(${lockKey});

	CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

	CREATE OR REPLACE FUNCTION "${triggerProcedure}"() RETURNS TRIGGER AS $$
	DECLARE
	    row_data    RECORD;
	    id          TEXT;
	    full_msg    BYTEA;
	    full_len    INT;
	    page_count  INT;
	    msg_prefix  TEXT;
	    cur_page    INT;
	    msg_offset  INT;
	BEGIN
	    IF (TG_OP = 'INSERT') THEN
	        SELECT
	            TG_TABLE_NAME    AS table,
	            TG_OP            AS type,
	            row_to_json(NEW) AS after
	        INTO row_data;
	    ELSIF (TG_OP = 'DELETE') THEN
	        SELECT
	            TG_TABLE_NAME    AS table,
	            TG_OP            AS type,
	            row_to_json(OLD) AS before
	        INTO row_data;
	    ELSIF (TG_OP = 'UPDATE') THEN
	        SELECT
	            TG_TABLE_NAME    AS table,
	            TG_OP            AS type,
	            row_to_json(NEW) AS after,
	            row_to_json(OLD) AS before
	        INTO row_data;
	    END IF;

	    id := encode(substring(uuid_send(uuid_generate_v4()) FROM 2), 'base64');
	    full_msg := convert_to(row_to_json(row_data)::text, 'UTF8');
	    full_len := length(full_msg);
	    page_count := ceil(full_len / ${pageByteLen}.0);
	    msg_offset := 1;
	    msg_prefix := id || page_count || ':';

	    FOR cur_page IN 1..page_count LOOP
			PERFORM pg_notify(
				'${channel}',
				msg_prefix || cur_page || ':' ||
				replace(encode(substring(full_msg FROM msg_offset FOR ${pageByteLen}), 'base64'), E'\\n', '')
			);

			msg_offset := msg_offset + ${pageByteLen};
	    END LOOP;
	    RETURN NULL;
	END;
	$$ LANGUAGE PLPGSQL;

	DROP TRIGGER IF EXISTS "${triggerName}" ON "${table}";

	CREATE TRIGGER "${triggerName}" AFTER
	INSERT
	OR
	UPDATE OF ${columns.join(', ')}
	OR
	DELETE ON "${table}"
	FOR EACH ROW EXECUTE PROCEDURE "${triggerProcedure}"();

	DROP FUNCTION IF EXISTS is_valid_utf8_bytea;

	COMMIT;`
}
