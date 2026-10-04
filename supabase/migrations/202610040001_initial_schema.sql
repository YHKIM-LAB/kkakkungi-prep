create extension if not exists pgcrypto;

create type public.household_role as enum ('owner', 'member');
create type public.task_status as enum ('todo', 'in_progress', 'done');
create type public.shopping_priority as enum ('low', 'medium', 'high');
create type public.purchase_status as enum ('planned', 'researching', 'purchased');

create table public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 1 and 40),
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.household_members (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  display_name text not null check (char_length(trim(display_name)) between 1 and 30),
  role public.household_role not null default 'member',
  created_at timestamptz not null default now(),
  unique (household_id, user_id),
  unique (user_id)
);

create table public.pregnancy_profile (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null unique references public.households(id) on delete cascade,
  baby_nickname text not null check (char_length(trim(baby_nickname)) between 1 and 30),
  due_date date not null,
  pregnancy_start_date date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (pregnancy_start_date < due_date)
);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  title text not null check (char_length(trim(title)) between 1 and 120),
  category text not null default '기타',
  due_date date,
  pregnancy_week integer check (pregnancy_week between 0 and 45),
  status public.task_status not null default 'todo',
  memo text,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.shopping_items (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  item_name text not null check (char_length(trim(item_name)) between 1 and 120),
  category text not null default '기타',
  priority public.shopping_priority not null default 'medium',
  purchase_status public.purchase_status not null default 'planned',
  price numeric(12, 0) check (price is null or price >= 0),
  purchase_url text,
  memo text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.schedules (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  title text not null check (char_length(trim(title)) between 1 and 120),
  date date not null,
  pregnancy_week integer check (pregnancy_week between 0 and 45),
  category text not null default '기타',
  memo text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  title text not null check (char_length(trim(title)) between 1 and 120),
  category text not null default '기타',
  amount numeric(12, 0) not null check (amount >= 0),
  paid boolean not null default false,
  payment_date date,
  memo text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index household_members_household_id_idx on public.household_members(household_id);
create index tasks_household_id_due_date_idx on public.tasks(household_id, due_date);
create index shopping_items_household_id_idx on public.shopping_items(household_id);
create index schedules_household_id_date_idx on public.schedules(household_id, date);
create index expenses_household_id_payment_date_idx on public.expenses(household_id, payment_date);

create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger households_set_updated_at before update on public.households
for each row execute function public.set_updated_at();
create trigger pregnancy_profile_set_updated_at before update on public.pregnancy_profile
for each row execute function public.set_updated_at();
create trigger tasks_set_updated_at before update on public.tasks
for each row execute function public.set_updated_at();
create trigger shopping_items_set_updated_at before update on public.shopping_items
for each row execute function public.set_updated_at();
create trigger schedules_set_updated_at before update on public.schedules
for each row execute function public.set_updated_at();
create trigger expenses_set_updated_at before update on public.expenses
for each row execute function public.set_updated_at();

create function public.is_household_member(target_household_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.household_members
    where household_id = target_household_id
      and user_id = auth.uid()
  );
$$;

create function public.is_household_owner(target_household_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.household_members
    where household_id = target_household_id
      and user_id = auth.uid()
      and role = 'owner'
  );
$$;

revoke all on function public.is_household_member(uuid) from public;
revoke all on function public.is_household_owner(uuid) from public;
grant execute on function public.is_household_member(uuid) to authenticated;
grant execute on function public.is_household_owner(uuid) to authenticated;

alter table public.households enable row level security;
alter table public.household_members enable row level security;
alter table public.pregnancy_profile enable row level security;
alter table public.tasks enable row level security;
alter table public.shopping_items enable row level security;
alter table public.schedules enable row level security;
alter table public.expenses enable row level security;

create policy "members can read households" on public.households
for select to authenticated using (public.is_household_member(id));
create policy "owners can update households" on public.households
for update to authenticated using (public.is_household_owner(id)) with check (public.is_household_owner(id));
create policy "owners can delete households" on public.households
for delete to authenticated using (public.is_household_owner(id));

create policy "members can read household members" on public.household_members
for select to authenticated using (public.is_household_member(household_id));
create policy "owners can add household members" on public.household_members
for insert to authenticated with check (public.is_household_owner(household_id));
create policy "members can update their profile" on public.household_members
for update to authenticated
using (user_id = auth.uid() or public.is_household_owner(household_id))
with check (user_id = auth.uid() or public.is_household_owner(household_id));
create policy "owners can remove household members" on public.household_members
for delete to authenticated using (public.is_household_owner(household_id));

create policy "members can read pregnancy profile" on public.pregnancy_profile
for select to authenticated using (public.is_household_member(household_id));
create policy "members can create pregnancy profile" on public.pregnancy_profile
for insert to authenticated with check (public.is_household_member(household_id));
create policy "members can update pregnancy profile" on public.pregnancy_profile
for update to authenticated using (public.is_household_member(household_id)) with check (public.is_household_member(household_id));
create policy "owners can delete pregnancy profile" on public.pregnancy_profile
for delete to authenticated using (public.is_household_owner(household_id));

create policy "members can read tasks" on public.tasks
for select to authenticated using (public.is_household_member(household_id));
create policy "members can create tasks" on public.tasks
for insert to authenticated with check (public.is_household_member(household_id) and created_by = auth.uid());
create policy "members can update tasks" on public.tasks
for update to authenticated using (public.is_household_member(household_id)) with check (public.is_household_member(household_id));
create policy "members can delete tasks" on public.tasks
for delete to authenticated using (public.is_household_member(household_id));

create policy "members can read shopping items" on public.shopping_items
for select to authenticated using (public.is_household_member(household_id));
create policy "members can create shopping items" on public.shopping_items
for insert to authenticated with check (public.is_household_member(household_id));
create policy "members can update shopping items" on public.shopping_items
for update to authenticated using (public.is_household_member(household_id)) with check (public.is_household_member(household_id));
create policy "members can delete shopping items" on public.shopping_items
for delete to authenticated using (public.is_household_member(household_id));

create policy "members can read schedules" on public.schedules
for select to authenticated using (public.is_household_member(household_id));
create policy "members can create schedules" on public.schedules
for insert to authenticated with check (public.is_household_member(household_id));
create policy "members can update schedules" on public.schedules
for update to authenticated using (public.is_household_member(household_id)) with check (public.is_household_member(household_id));
create policy "members can delete schedules" on public.schedules
for delete to authenticated using (public.is_household_member(household_id));

create policy "members can read expenses" on public.expenses
for select to authenticated using (public.is_household_member(household_id));
create policy "members can create expenses" on public.expenses
for insert to authenticated with check (public.is_household_member(household_id));
create policy "members can update expenses" on public.expenses
for update to authenticated using (public.is_household_member(household_id)) with check (public.is_household_member(household_id));
create policy "members can delete expenses" on public.expenses
for delete to authenticated using (public.is_household_member(household_id));

create function public.create_household_with_profile(
  p_household_name text,
  p_display_name text,
  p_baby_nickname text,
  p_due_date date,
  p_pregnancy_start_date date
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  current_user_id uuid := auth.uid();
  new_household_id uuid;
begin
  if current_user_id is null then
    raise exception 'Authentication required';
  end if;

  if exists (select 1 from public.household_members where user_id = current_user_id) then
    raise exception 'User already belongs to a household';
  end if;

  if trim(p_household_name) = '' or trim(p_display_name) = '' or trim(p_baby_nickname) = '' then
    raise exception 'Required values cannot be empty';
  end if;

  if p_pregnancy_start_date >= p_due_date then
    raise exception 'Pregnancy dates are invalid';
  end if;

  insert into public.households (name, created_by)
  values (trim(p_household_name), current_user_id)
  returning id into new_household_id;

  insert into public.household_members (household_id, user_id, display_name, role)
  values (new_household_id, current_user_id, trim(p_display_name), 'owner');

  insert into public.pregnancy_profile (
    household_id,
    baby_nickname,
    due_date,
    pregnancy_start_date
  ) values (
    new_household_id,
    trim(p_baby_nickname),
    p_due_date,
    p_pregnancy_start_date
  );

  return new_household_id;
end;
$$;

revoke all on function public.create_household_with_profile(text, text, text, date, date) from public;
grant execute on function public.create_household_with_profile(text, text, text, date, date) to authenticated;

grant select, insert, update, delete on all tables in schema public to authenticated;
revoke update on public.household_members from authenticated;
grant update (display_name) on public.household_members to authenticated;
