-- Migrate columns.
create or replace function public.migrate_date_columns() returns void as $$
    begin
        -- Only run migration if expected columns exist.
        if not exists (select 1 from information_schema.columns where table_name='cards' and column_name='new_created_at') then
            raise info 'Expected "new_created_at" column does not exist, aborting migration';
            return;
        end if;
        if not exists (select 1 from information_schema.columns where table_name='cards' and column_name='new_updated_at') then
            raise info 'Expected "new_updated_at" column does not exist, aborting migration';
            return;
        end if;

        -- Temporarily prevent new writes, unlocked automatically at end of transaction.
        raise info 'Locking tables...';
        lock table cards in share mode;
        lock table links in share mode;

        -- Temporarily disable stream triggers.
        raise info 'Disabling triggers...';
        alter table cards disable trigger all;

        -- Rename columns.
        raise info 'Renaming columns...';
        alter table cards rename column created_at to old_created_at;
        alter table cards rename column updated_at to old_updated_at;
        alter table cards rename column new_created_at to created_at;
        alter table cards rename column new_updated_at to updated_at;

        -- No longer enforce not null constraint on old_created_at column.
        raise info 'Disabling not null constraint for old_created_at...';
        alter table cards alter column old_created_at drop not null;

        -- Rename indexes.
        raise info 'Renaming indexes...';
        alter index if exists created_at_cards_idx rename to old_created_at_cards_idx;
        alter index if exists updated_at_cards_idx rename to old_updated_at_cards_idx;
        alter index if exists new_created_at_cards_idx rename to created_at_cards_idx;
        alter index if exists new_updated_at_cards_idx rename to updated_at_cards_idx;

        -- Re-enable stream triggers.
        raise info 'Re-enabling triggers...';
        alter table cards enable trigger all;
    end;
$$ language plpgsql;

select public.migrate_date_columns();
drop function public.migrate_date_columns();
