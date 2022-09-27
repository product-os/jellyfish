SET statement_timeout=0;

-- Create archive_cards table
CREATE TABLE IF NOT EXISTS public.archive_cards (LIKE cards INCLUDING ALL);

-- Create archive_links2 table
CREATE TABLE IF NOT EXISTS public.archive_links2 (LIKE links2 INCLUDING ALL);