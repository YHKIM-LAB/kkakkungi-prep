-- Legacy deployments used a table-wide UNIQUE(household_id, email), which also
-- blocks a new invitation after the previous row has been revoked. Remove only
-- that legacy uniqueness rule while preserving every invitation history row.
do $$
declare
  legacy_object record;
begin
  for legacy_object in
    select constraint_definition.conname as object_name
    from pg_constraint constraint_definition
    where constraint_definition.conrelid = 'public.household_invitations'::regclass
      and constraint_definition.contype = 'u'
      and (
        select array_agg(attribute_definition.attname::text order by attribute_definition.attname::text)
        from unnest(constraint_definition.conkey) with ordinality as key_column(attnum, ordinality)
        join pg_attribute attribute_definition
          on attribute_definition.attrelid = constraint_definition.conrelid
         and attribute_definition.attnum = key_column.attnum
      ) = array['email', 'household_id']::text[]
  loop
    execute format(
      'alter table public.household_invitations drop constraint %I',
      legacy_object.object_name
    );
  end loop;

  -- Also cover a manually-created standalone unique index with the same two
  -- plain columns. Constraint-owned indexes were removed by the loop above.
  for legacy_object in
    select index_definition.relname as object_name
    from pg_index index_metadata
    join pg_class index_definition on index_definition.oid = index_metadata.indexrelid
    where index_metadata.indrelid = 'public.household_invitations'::regclass
      and index_metadata.indisunique
      and not index_metadata.indisprimary
      and index_metadata.indpred is null
      and index_metadata.indexprs is null
      and not exists (
        select 1
        from pg_constraint constraint_definition
        where constraint_definition.conindid = index_metadata.indexrelid
      )
      and (
        select array_agg(attribute_definition.attname::text order by attribute_definition.attname::text)
        from unnest(index_metadata.indkey::smallint[]) with ordinality as key_column(attnum, ordinality)
        join pg_attribute attribute_definition
          on attribute_definition.attrelid = index_metadata.indrelid
         and attribute_definition.attnum = key_column.attnum
      ) = array['email', 'household_id']::text[]
  loop
    execute format('drop index public.%I', legacy_object.object_name);
  end loop;
end;
$$;

-- Keep the newest open invitation if a manually modified database already has
-- duplicates. Older rows remain as history and are marked revoked, not deleted.
with ranked_open_invitations as (
  select
    id,
    row_number() over (
      partition by household_id, lower(email)
      order by created_at desc, id desc
    ) as invitation_rank
  from public.household_invitations
  where accepted_at is null
    and revoked_at is null
)
update public.household_invitations invitation
set revoked_at = now()
from ranked_open_invitations ranked
where invitation.id = ranked.id
  and ranked.invitation_rank > 1;

-- Revoked and accepted rows no longer block re-invitation. The RPC revokes an
-- expired open row before inserting its replacement, so only one open invite
-- per household/email can exist at a time.
create unique index if not exists household_invitations_one_open_email_idx
  on public.household_invitations(household_id, lower(email))
  where accepted_at is null and revoked_at is null;
