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
 * Accepts 2 arguments:
 * funName: name of function to create/replace
 * channel: NOTIFY channel on which to broadcast changes
 */
module.exports = (triggerFunction, channel) => {
	return `CREATE OR REPLACE FUNCTION "${triggerFunction}"() RETURNS trigger AS $$
  DECLARE
    row_data   RECORD;
    full_msg   TEXT;
    full_len   INT;
    cur_page   INT;
    page_count INT;
    msg_hash   TEXT;
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

    SELECT row_to_json(row_data)::TEXT INTO full_msg;
    SELECT char_length(full_msg)       INTO full_len;
    SELECT (full_len / 7950) + 1       INTO page_count;
    SELECT md5(full_msg)               INTO msg_hash;

    FOR cur_page IN 1..page_count LOOP
      PERFORM pg_notify('${channel}',
        msg_hash || ':' || page_count || ':' || cur_page || ':' ||
        substr(full_msg, ((cur_page - 1) * 7950) + 1, 7950)
      );
    END LOOP;
    RETURN NULL;
  END;
$$ LANGUAGE plpgsql;`
}
