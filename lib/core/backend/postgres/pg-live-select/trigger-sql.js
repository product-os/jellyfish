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
 * The "pg_notify" function has a limit of 8000 bytes that is not
 * easily configurable, so we can paginate over the payload as
 * a way to workaround the limit.
 */
const FULL_MESSAGE_PAGINATED_SIZE = 7800

/*
 * Template for trigger function to send row changes over notification
 * Accepts 2 arguments:
 * funName: name of function to create/replace
 * channel: NOTIFY channel on which to broadcast changes
 */
module.exports = (triggerFunction, channel) => {
	return `
  CREATE OR REPLACE FUNCTION is_valid_utf8_bytea(buffer BYTEA) RETURNS boolean AS $$
  BEGIN
    PERFORM length(buffer, 'UTF8');
    RETURN true;
  EXCEPTION WHEN OTHERS THEN
    RETURN false;
  END;
  $$ LANGUAGE plpgsql;

  CREATE OR REPLACE FUNCTION "${triggerFunction}"() RETURNS trigger AS $$
  DECLARE
    row_data           RECORD;
    full_msg_binary    BYTEA;
    full_msg_text      TEXT;
    msg_portion_binary BYTEA;
    msg_portion_text   TEXT;
    full_len           INT;
    cur_page           INT;
    msg_offset_binary  INT;
    msg_offset_text    INT;
    page_count         INT;
    msg_hash           TEXT;
    cut_size           INT;
  BEGIN
    IF (TG_OP = 'INSERT') THEN
      SELECT
        TG_TABLE_NAME AS table,
        TG_OP         AS type,
        row_to_json(NEW) AS after
      INTO row_data;
    ELSIF (TG_OP  = 'DELETE') THEN
      SELECT
        TG_TABLE_NAME AS table,
        TG_OP         AS type,
        row_to_json(OLD) AS before
      INTO row_data;
    ELSIF (TG_OP = 'UPDATE') THEN
      SELECT
        TG_TABLE_NAME AS table,
        TG_OP         AS type,
        row_to_json(NEW) AS after,
        row_to_json(OLD) AS before
      INTO row_data;
    END IF;

    SELECT convert_to(row_to_json(row_data)::TEXT, 'UTF8')::bytea  INTO full_msg_binary;
    SELECT length(full_msg_binary)                                 INTO full_len;
    SELECT convert_from(full_msg_binary, 'UTF8')                   INTO full_msg_text;
    SELECT ceil(full_len / ${FULL_MESSAGE_PAGINATED_SIZE}.0)       INTO page_count;
    SELECT md5(full_msg_binary)                                    INTO msg_hash;

    msg_offset_binary := 1;
    msg_offset_text := 1;
    cut_size := ${FULL_MESSAGE_PAGINATED_SIZE};

    FOR cur_page IN 1..page_count LOOP
      LOOP
        IF cut_size = 0 THEN
          RAISE EXCEPTION 'Invalid UTF 8 string';
        END IF;
        SELECT substring(full_msg_binary from msg_offset_binary for cut_size) INTO msg_portion_binary;
        IF is_valid_utf8_bytea(msg_portion_binary) THEN
          cut_size := ${FULL_MESSAGE_PAGINATED_SIZE};
          EXIT;
        END IF;
        cut_size := cut_size - 1;
      END LOOP;

      SELECT substr(full_msg_text, msg_offset_text, length(msg_portion_binary, 'UTF8')) INTO msg_portion_text;

      PERFORM pg_notify('${channel}',
        msg_hash || ':' || page_count || ':' || cur_page || ':' ||
        substr(full_msg_text, msg_offset_text, length(msg_portion_binary, 'UTF8'))
      );

      msg_offset_text := msg_offset_text + length(msg_portion_text);
      msg_offset_binary := msg_offset_binary + length(convert_to(msg_portion_text, 'UTF8')::bytea);
    END LOOP;
    RETURN NULL;
  END;
$$ LANGUAGE plpgsql;`
}
