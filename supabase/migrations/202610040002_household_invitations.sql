create table if not exists public.household_invitations (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  email text not null check (char_length(trim(email)) between 3 and 320),
  token_hash text not null,
  invited_by uuid not null references auth.users(id) on delete cascade,
  expires_at timestamptz not null,
  accepted_at timestamptz,
  accepted_by uuid references auth.users(id) on delete set null,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  check (expires_at > created_at),
  check ((accepted_at is null and accepted_by is null) or (accepted_at is not null and accepted_by is not null))
);

-- These additions make the migration safe to apply to a project where an
-- earlier draft of the invitation table was created manually.
alter table public.household_invitations add column if not exists token_hash text;
alter table public.household_invitations add column if not exists invited_by uuid references auth.users(id) on delete cascade;
alter table public.household_invitations add column if not exists expires_at timestamptz;
alter table public.household_invitations add column if not exists accepted_at timestamptz;
alter table public.household_invitations add column if not exists accepted_by uuid references auth.users(id) on delete set null;
alter table public.household_invitations add column if not exists revoked_at timestamptz;
alter table public.household_invitations add column if not exists created_at timestamptz default now();

-- The deployed project may contain the earlier draft that stored a UUID token
-- in plaintext. Preserve those links by hashing their current value, then stop
-- writing the legacy column. New invitations only persist token_hash.
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'household_invitations'
      and column_name = 'token'
  ) then
    execute $sql$
      update public.household_invitations
      set token_hash = encode(digest(token::text, 'sha256'), 'hex')
      where token_hash is null and token is not null
    $sql$;
    execute 'alter table public.household_invitations alter column token drop default';
    execute 'alter table public.household_invitations alter column token drop not null';
    execute 'update public.household_invitations set token = null where token is not null';
  end if;
end;
$$;

alter table public.household_invitations alter column token_hash set not null;

create unique index if not exists household_invitations_token_hash_idx
  on public.household_invitations(token_hash);
create index if not exists household_invitations_household_email_idx
  on public.household_invitations(household_id, lower(email));

alter table public.household_invitations enable row level security;

drop policy if exists "owners can read household invitations" on public.household_invitations;
create policy "owners can read household invitations" on public.household_invitations
for select to authenticated
using (public.is_household_owner(household_id));

-- Invitation writes are intentionally available only through the functions
-- below. Each function validates auth.uid() again even when the UI is hidden.
revoke all on public.household_invitations from public, anon, authenticated;
grant select on public.household_invitations to authenticated;

create or replace function public.create_household_invitation(p_email text)
returns table(token text, email text, expires_at timestamptz)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  current_user_id uuid := auth.uid();
  owner_household_id uuid;
  normalized_email text := lower(trim(p_email));
  raw_token text;
  invitation_expires_at timestamptz := now() + interval '7 days';
begin
  if current_user_id is null then
    raise exception 'Authentication required';
  end if;

  if normalized_email = '' or normalized_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise exception 'Invalid invitation email';
  end if;

  select hm.household_id
    into owner_household_id
  from public.household_members hm
  where hm.user_id = current_user_id
    and hm.role = 'owner'
  limit 1;

  if owner_household_id is null then
    raise exception 'Only a household owner can create invitations';
  end if;

  -- Serialize invitations for the same household/email to prevent races.
  perform pg_advisory_xact_lock(hashtextextended(owner_household_id::text || ':' || normalized_email, 0));

  if exists (
    select 1
    from public.household_members hm
    join auth.users u on u.id = hm.user_id
    where hm.household_id = owner_household_id
      and lower(u.email) = normalized_email
  ) then
    raise exception 'This email is already a household member';
  end if;

  if exists (
    select 1
    from public.household_invitations hi
    where hi.household_id = owner_household_id
      and lower(hi.email) = normalized_email
      and hi.accepted_at is null
      and hi.revoked_at is null
      and hi.expires_at > now()
  ) then
    raise exception 'An active invitation already exists for this email';
  end if;

  update public.household_invitations hi
  set revoked_at = now()
  where hi.household_id = owner_household_id
    and lower(hi.email) = normalized_email
    and hi.accepted_at is null
    and hi.revoked_at is null
    and hi.expires_at <= now();

  raw_token := encode(gen_random_bytes(32), 'hex');

  insert into public.household_invitations (
    household_id,
    email,
    token_hash,
    invited_by,
    expires_at
  ) values (
    owner_household_id,
    normalized_email,
    encode(digest(raw_token, 'sha256'), 'hex'),
    current_user_id,
    invitation_expires_at
  );

  return query select raw_token, normalized_email, invitation_expires_at;
end;
$$;

create or replace function public.get_household_invitation(p_token text)
returns table(email text, household_name text, expires_at timestamptz, status text)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    hi.email,
    h.name,
    hi.expires_at,
    case
      when hi.accepted_at is not null then 'accepted'
      when hi.revoked_at is not null then 'revoked'
      when hi.expires_at <= now() then 'expired'
      else 'pending'
    end
  from public.household_invitations hi
  join public.households h on h.id = hi.household_id
  where hi.token_hash = encode(digest(p_token, 'sha256'), 'hex')
  limit 1;
$$;

-- Replace the UUID-based draft RPC so PostgREST exposes one unambiguous
-- p_token overload and existing UUID links continue to work as text.
drop function if exists public.accept_household_invitation(uuid);

create or replace function public.accept_household_invitation(p_token text)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  current_user_id uuid := auth.uid();
  current_email text;
  invitation public.household_invitations%rowtype;
  member_name text;
begin
  if current_user_id is null then
    raise exception 'Authentication required';
  end if;

  select *
    into invitation
  from public.household_invitations hi
  where hi.token_hash = encode(digest(p_token, 'sha256'), 'hex')
  for update;

  if invitation.id is null then
    raise exception 'Invitation not found';
  end if;

  if invitation.accepted_at is not null then
    raise exception 'Invitation has already been accepted';
  end if;

  if invitation.revoked_at is not null then
    raise exception 'Invitation has been revoked';
  end if;

  if invitation.expires_at <= now() then
    raise exception 'Invitation has expired';
  end if;

  select lower(u.email),
         left(coalesce(nullif(trim(u.raw_user_meta_data ->> 'full_name'), ''), split_part(u.email, '@', 1)), 30)
    into current_email, member_name
  from auth.users u
  where u.id = current_user_id;

  if current_email is null or current_email <> lower(invitation.email) then
    raise exception 'Invitation email does not match the signed-in account';
  end if;

  if exists (select 1 from public.household_members hm where hm.user_id = current_user_id) then
    raise exception 'User already belongs to a household';
  end if;

  insert into public.household_members (household_id, user_id, display_name, role)
  values (invitation.household_id, current_user_id, member_name, 'member');

  update public.household_invitations
  set accepted_at = now(), accepted_by = current_user_id
  where id = invitation.id;

  return invitation.household_id;
end;
$$;

revoke all on function public.create_household_invitation(text) from public;
revoke all on function public.get_household_invitation(text) from public;
revoke all on function public.accept_household_invitation(text) from public;

grant execute on function public.create_household_invitation(text) to authenticated;
grant execute on function public.get_household_invitation(text) to anon, authenticated;
grant execute on function public.accept_household_invitation(text) to authenticated;
