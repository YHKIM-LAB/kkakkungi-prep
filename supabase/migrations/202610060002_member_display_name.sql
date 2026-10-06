-- Remove both signatures first so PostgREST exposes one unambiguous RPC.
drop function if exists public.accept_household_invitation(text);
drop function if exists public.accept_household_invitation(text, text);

create function public.accept_household_invitation(
  p_token text,
  p_display_name text
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  current_user_id uuid := auth.uid();
  current_email text;
  invitation public.household_invitations%rowtype;
  normalized_display_name text := trim(p_display_name);
begin
  if current_user_id is null then
    raise exception 'Authentication required';
  end if;

  if normalized_display_name is null or normalized_display_name = '' then
    raise exception 'Display name is required';
  end if;

  if char_length(normalized_display_name) > 30 then
    raise exception 'Display name is too long';
  end if;

  select *
    into invitation
  from public.household_invitations hi
  where hi.token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex')
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

  select lower(u.email)
    into current_email
  from auth.users u
  where u.id = current_user_id;

  if current_email is null or current_email <> lower(invitation.email) then
    raise exception 'Invitation email does not match the signed-in account';
  end if;

  if exists (select 1 from public.household_members hm where hm.user_id = current_user_id) then
    raise exception 'User already belongs to a household';
  end if;

  insert into public.household_members (household_id, user_id, display_name, role)
  values (invitation.household_id, current_user_id, normalized_display_name, 'member');

  update public.household_invitations
  set accepted_at = now(), accepted_by = current_user_id
  where id = invitation.id;

  return invitation.household_id;
end;
$$;

revoke all on function public.accept_household_invitation(text, text) from public;
grant execute on function public.accept_household_invitation(text, text) to authenticated;

-- The previous policy allowed an owner to update another member's row. Keep
-- this feature deliberately self-service and retain column-level protection so
-- role and household_id cannot be changed through the client.
drop policy if exists "members can update their profile" on public.household_members;
drop policy if exists "members can update their own profile" on public.household_members;
create policy "members can update their own profile" on public.household_members
for update to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

revoke update on public.household_members from authenticated;
grant update (display_name) on public.household_members to authenticated;
