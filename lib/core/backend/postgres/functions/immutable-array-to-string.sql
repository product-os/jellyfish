/* Create an immutable wrapper for array_to_string() for text array tsvector index creation */
CREATE OR REPLACE FUNCTION immutable_array_to_string(arr ANYARRAY, sep TEXT) RETURNS text AS $$
	SELECT array_to_string(arr, sep);
$$ LANGUAGE SQL IMMUTABLE