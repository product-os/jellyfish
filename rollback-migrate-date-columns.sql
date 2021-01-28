-- Rollback column migrations.
create or replace function public.rollback_migrate_date_columns(updates_per_iteration integer, iteration_delay integer) returns integer as $updated$
    declare
        updated integer := 0;
    begin
        -- Only run migration if expected column(s) exist.
        if exists (select 1 from information_schema.columns where table_name='cards' and column_name='new_updated_at') then
            raise info 'Unexpected "new_updated_at" column exists, aborting rollback';
            return updated;
        end if;

        -- Temporarily disable stream triggers.
        raise info 'Disabling triggers...';
        alter table cards disable trigger all;

        -- Rename columns back to original state.
        raise info 'Renaming columns back to original state...';
        alter table cards rename column created_at to new_created_at;
        alter table cards rename column updated_at to new_updated_at;
        alter table cards rename column old_created_at to created_at;
        alter table cards rename column old_updated_at to updated_at;

        -- Set created_at to char of timestamp stored in new_created_at.
        updated := (select public.copy_dates('new_created_at', updates_per_iteration, iteration_delay));

        -- Set updated_at to char of timestamp stored in new_updated_at.
        updated := updated + (select public.copy_dates('new_updated_at', updates_per_iteration, iteration_delay));

        -- Re-enforce not null constraint on created_at column.
        raise info 'Re-enforcing created_at column not null constraint...';
        alter table cards alter column created_at set not null;

        -- Rename indexes.
        raise info 'Renaming indexes back to original state...';
        alter index if exists created_at_cards_idx rename to new_created_at_cards_idx;
        alter index if exists updated_at_cards_idx rename to new_updated_at_cards_idx;
        alter index if exists old_created_at_cards_idx rename to created_at_cards_idx;
        alter index if exists old_updated_at_cards_idx rename to updated_at_cards_idx;

        -- Re-enable stream triggers.
        raise info 'Re-enabling triggers...';
        alter table cards enable trigger all;

        return updated;
    end;
$updated$ language plpgsql;

select public.rollback_migrate_date_columns(50, 2);
drop function public.rollback_migrate_date_columns(integer, integer);
drop function public.copy_dates(text, integer, integer);
