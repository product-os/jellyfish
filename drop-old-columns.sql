-- Drop old columns along with their indexes;
create or replace function public.drop_old_date_columns() returns void as $$
begin
    -- Drop old indexes.
    raise info 'Dropping old date column indexes...';
    drop index if exists old_created_at_cards_idx;
    drop index if exists old_updated_at_cards_idx;

    -- Drop old columns.
    raise info 'Dropping old date columns...';
    alter table cards drop column if exists old_created_at;
    alter table cards drop column if exists old_updated_at;
end;
$$ language plpgsql;

-- Execute and then drop function.
select public.drop_old_date_columns();
drop function public.drop_old_date_columns();
