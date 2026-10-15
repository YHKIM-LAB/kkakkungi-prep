-- Apply before deploying the matching application code. Existing manual expenses are untouched.
alter table public.expenses add column shopping_item_id uuid;
alter table public.expenses add constraint expenses_shopping_item_id_key unique (shopping_item_id);
alter table public.expenses add constraint expenses_shopping_item_id_fkey
  foreign key (shopping_item_id) references public.shopping_items(id) on delete set null;

-- One item owns one expense. Invoker security keeps the caller's existing household RLS.
create function public.sync_shopping_expense()
returns trigger language plpgsql security invoker set search_path = '' as $$
declare
  purchase_changed boolean := false;
  purchase_date date := (now() at time zone 'Asia/Seoul')::date;
begin
  if new.price is null then
    delete from public.expenses where shopping_item_id = new.id;
    return new;
  end if;

  if tg_op = 'INSERT' then
    purchase_changed := true;
  else
    purchase_changed := old.purchase_status is distinct from new.purchase_status;
  end if;

  insert into public.expenses as expense
    (household_id, shopping_item_id, title, category, amount, paid, payment_date, memo, created_by)
  values
    (new.household_id, new.id, new.item_name,
     case when new.category = '산모용품' then '출산' else '육아' end,
     new.price, new.purchase_status = 'purchased',
     case when new.purchase_status = 'purchased' and purchase_changed then purchase_date else null end,
     new.memo, new.created_by)
  on conflict (shopping_item_id) do update set
    household_id = excluded.household_id,
    title = excluded.title,
    category = excluded.category,
    amount = excluded.amount,
    paid = excluded.paid,
    payment_date = case when not excluded.paid then null
      when purchase_changed then purchase_date else expense.payment_date end,
    memo = excluded.memo;
  return new;
end;
$$;

revoke all on function public.sync_shopping_expense() from public, anon, authenticated;
create trigger shopping_expense_sync
after insert or update of household_id, item_name, category, price, purchase_status, memo on public.shopping_items
for each row execute function public.sync_shopping_expense();

-- Backfill without guessing historic payment dates. No existing expense rows are changed.
insert into public.expenses
  (household_id, shopping_item_id, title, category, amount, paid, payment_date, memo, created_by)
select household_id, id, item_name,
  case when category = '산모용품' then '출산' else '육아' end,
  price, purchase_status = 'purchased', null, memo, created_by
from public.shopping_items where price is not null
on conflict (shopping_item_id) do nothing;

-- Only nested shopping/FK triggers may change linked rows. Prevent direct REST writes too.
-- No SECURITY DEFINER, JWT authorization changes, or new callable RPCs are introduced.
create function public.protect_linked_shopping_expense()
returns trigger language plpgsql security invoker set search_path = '' as $$
declare
  linked boolean := false;
begin
  if tg_op <> 'INSERT' then linked := old.shopping_item_id is not null; end if;
  if tg_op <> 'DELETE' then linked := linked or new.shopping_item_id is not null; end if;
  if linked and pg_trigger_depth() < 2 then
    raise exception '연결된 비용은 준비물에서 수정해 주세요.' using errcode = '42501';
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;
revoke all on function public.protect_linked_shopping_expense() from public, anon, authenticated;
create trigger expenses_protect_shopping_link
before insert or update or delete on public.expenses
for each row execute function public.protect_linked_shopping_expense();

comment on column public.expenses.shopping_item_id is
  'One expense per priced shopping item; source controls amount and paid. Deleting source preserves expense as manual.';
