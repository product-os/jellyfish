-- General function used to populate either text or timestamp columns with date data.
create or replace function public.copy_dates (from_column text, updates_per_iteration integer, iteration_delay integer) returns integer as $updated$
    declare
        to_column text := '';
        count integer := 0;
        updated integer := 0;
        card_ids uuid[];
        length integer := 0;
        get_count text := 'select count(id) from cards where %I is not null and %I is null';
        get_card_ids text := 'select array(select id from cards where %I is not null and %I is null limit %s)';
        set_timestamp text := 'update cards set %I=to_timestamp(%I, ''YYYY-MM-DDThh24:mi:ss.MSZ'') where id in (select unnest($1))';
        set_text text := 'update cards set %I=to_char(%I, ''YYYY-MM-DDThh24:mi:ss.MSZ'') where id in (select unnest($1))';
        set_statement text := '';
    begin
        -- Check that provided column_name is valid, setting up certain variables if so.
        if from_column similar to 'created_at|updated_at' then
            -- Copying text column data to timestamp columns.
            raise info 'Converting text-based dates to timestamps.';
            set_statement := set_timestamp;
            to_column := concat('new_', from_column);
        elsif from_column similar to 'new_created_at|new_updated_at' then
            -- Copying timestamp column data to text columns.
            raise info 'Converting timestamps to text-based dates.';
            set_statement := set_text;
            to_column := replace(from_column, 'new_', '');
        else
            raise warning 'Parameter "from_column" must be "created_at", "updated_at", "new_created_at", or "new_updated_at".';
            return updated;
        end if;
        get_count := format(get_count, from_column, to_column);
        get_card_ids := format(get_card_ids, from_column, to_column, updates_per_iteration);

        raise info 'Checking the number of cards that need to be updated...';
        execute get_count into count;
        if count = 0 or count is null then
            raise info 'Found no cards that need to be updated, aborting operation...';
            return updated;
        end if;

        raise info 'Setting "%" for % cards, % updates every % seconds...', to_column, count, updates_per_iteration, iteration_delay;
        loop
            -- Perform a delay as to not overwhelm the database server.
            perform pg_sleep(iteration_delay);

            -- Populate card_ids array with ids of those that need to be updated.
            execute get_card_ids into card_ids;

            -- Exit loop if no more cards need to be updated.
            length := cardinality(card_ids);
            if length = 0 or length is null then
                raise info 'No more cards to process, exiting operation...';
                exit;
            end if;

            -- Process found cards.
            execute format(set_statement, to_column, from_column) using card_ids;
            updated = updated + length;
            raise info 'Iteration complete, % cards updated so far...', updated;
        end loop;

        return updated;
    end;
$updated$ language plpgsql;

select public.copy_dates('created_at', 50, 2);
select public.copy_dates('updated_at', 50, 2);
drop function public.copy_dates(text, integer, integer);
