import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { PGlite } from "@electric-sql/pglite";

const owner = "10000000-0000-4000-8000-000000000001";
const partner = "10000000-0000-4000-8000-000000000002";
const outsider = "10000000-0000-4000-8000-000000000003";
const home = "20000000-0000-4000-8000-000000000001";
const otherHome = "20000000-0000-4000-8000-000000000002";
const existing = "30000000-0000-4000-8000-000000000001";
const fresh = "30000000-0000-4000-8000-000000000002";

test("shopping expense migration and household access", async (t) => {
  const db = new PGlite();
  t.after(() => db.close());
  // Isolated PostgreSQL fixture matching the relevant deployed columns and policies.
  await db.exec(`
    create role anon;
    create role authenticated;
    create schema auth;
    create function auth.uid() returns uuid language sql stable as $$
      select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
    $$;
    grant usage on schema auth to authenticated, anon;
    create table public.households (id uuid primary key);
    create table public.household_members (household_id uuid, user_id uuid);
    insert into households values ('${home}'), ('${otherHome}');
    insert into household_members values ('${home}', '${owner}'), ('${home}', '${partner}');
    create function public.is_household_member(target_household_id uuid) returns boolean
      language sql stable security definer set search_path = '' as $$
        select exists(select 1 from public.household_members
          where household_id = target_household_id and user_id = auth.uid());
      $$;
    create table public.shopping_items (
      id uuid primary key default gen_random_uuid(), household_id uuid not null references households,
      item_name text not null, category text not null default '기타',
      purchase_status text not null default 'planned', price numeric check (price >= 0),
      memo text, created_by uuid not null default auth.uid(),
      created_at timestamptz not null default now(), updated_at timestamptz not null default now()
    );
    create table public.expenses (
      id uuid primary key default gen_random_uuid(), household_id uuid not null references households,
      title text not null, category text not null default '기타', amount numeric not null check (amount >= 0),
      paid boolean not null default false, payment_date date, memo text,
      created_by uuid not null default auth.uid(),
      created_at timestamptz not null default now(), updated_at timestamptz not null default now()
    );
    alter table shopping_items enable row level security;
    alter table expenses enable row level security;
    create policy members on shopping_items for all to authenticated
      using (is_household_member(household_id)) with check (is_household_member(household_id));
    create policy members on expenses for all to authenticated
      using (is_household_member(household_id)) with check (is_household_member(household_id));
    grant usage on schema public to authenticated, anon;
    grant select, insert, update, delete on shopping_items, expenses to authenticated, anon;
    insert into shopping_items (id, household_id, item_name, price, purchase_status, created_by)
      values ('${existing}', '${home}', '기존 침대', 500001, 'purchased', '${owner}');
    insert into expenses (household_id, title, amount, created_by)
      values ('${home}', '직접 기록', 100, '${owner}');
  `);
  const migration = await readFile(new URL("../../supabase/migrations/20261015074536_link_shopping_expenses.sql", import.meta.url), "utf8");
  await db.exec(`begin; ${migration} commit;`);
  const rows = async (sql) => (await db.query(sql)).rows;
  const asUser = async (id, sql) => {
    await db.exec(`begin; set local role authenticated; set local request.jwt.claim.sub = '${id}';`);
    try { return await rows(sql); } finally { await db.exec("rollback;"); }
  };
  const mutate = async (id, sql) => {
    await db.exec(`begin; set local role authenticated; set local request.jwt.claim.sub = '${id}';`);
    try { const result = await rows(sql); await db.exec("commit;"); return result; }
    catch (error) { await db.exec("rollback;"); throw error; }
  };

  await t.test("backfill links one purchased item without inventing payment dates or changing manual expenses", async () => {
    const all = await rows("select * from expenses order by amount");
    assert.equal(all.length, 2);
    assert.equal(Number(all[0].amount), 100);
    assert.equal(all[0].shopping_item_id, null);
    assert.equal(all[1].shopping_item_id, existing);
    assert.equal(all[1].paid, true);
    assert.equal(all[1].payment_date, null);
  });
  await t.test("priced planned item creates one unpaid expense atomically", async () => {
    await mutate(owner, `insert into shopping_items (id, household_id, item_name, price)
      values ('${fresh}', '${home}', '새 준비물', 12000)`);
    const [e] = await rows(`select * from expenses where shopping_item_id='${fresh}'`);
    assert.equal(Number(e.amount), 12000);
    assert.equal(e.paid, false);
  });
  await t.test("purchase, repeated edits, and price changes update the same expense", async () => {
    const [before] = await rows(`select id from expenses where shopping_item_id='${fresh}'`);
    await mutate(partner, `update shopping_items set purchase_status='purchased', price=15000, item_name='새 이름' where id='${fresh}'`);
    const [paid] = await rows(`select * from expenses where shopping_item_id='${fresh}'`);
    assert.equal(paid.id, before.id);
    assert.equal(paid.paid, true);
    assert.ok(paid.payment_date);
    await mutate(owner, `update shopping_items set price=16000, memo='메모 수정' where id='${fresh}'`);
    const [updated] = await rows(`select * from expenses where shopping_item_id='${fresh}'`);
    assert.equal(updated.id, before.id);
    assert.equal(updated.title, "새 이름");
    assert.equal(Number(updated.amount), 16000);
    assert.deepEqual(updated.payment_date, paid.payment_date);
  });
  await t.test("direct linked expense updates, unlinking, deletes, and spoofed links are denied", async () => {
    for (const sql of [
      `update expenses set amount=1 where shopping_item_id='${fresh}'`,
      `update expenses set shopping_item_id=null where shopping_item_id='${fresh}'`,
      `delete from expenses where shopping_item_id='${fresh}'`,
      `insert into expenses (household_id,title,amount,shopping_item_id) values ('${home}','偽',1,'${existing}')`,
    ]) await assert.rejects(mutate(owner, sql), (e) => e.code === "42501");
  });
  await t.test("both family members see identical rows; nonmember and anon cannot read them", async () => {
    assert.deepEqual(await asUser(owner, "select id from expenses order by id"), await asUser(partner, "select id from expenses order by id"));
    assert.deepEqual(await asUser(outsider, "select id from expenses"), []);
    assert.deepEqual(await mutate(outsider, `update shopping_items set price=1 where id='${fresh}' returning id`), []);
    await assert.rejects(mutate(outsider, `insert into shopping_items (household_id,item_name,price) values ('${home}','차단',1)`), (e) => e.code === "42501");
    await db.exec("begin; set local role anon;");
    assert.deepEqual(await rows("select id from expenses"), []);
    await db.exec("rollback;");
  });
  await t.test("cancelling purchase clears paid and payment date", async () => {
    await mutate(owner, `update shopping_items set purchase_status='researching' where id='${fresh}'`);
    const [e] = await rows(`select * from expenses where shopping_item_id='${fresh}'`);
    assert.equal(e.paid, false);
    assert.equal(e.payment_date, null);
  });
  await t.test("a failed expense update rolls the shopping change back too", async () => {
    await db.exec("alter table expenses add constraint reject_test_title check (title <> 'rejected')");
    await assert.rejects(mutate(owner, `update shopping_items set item_name='rejected', price=999 where id='${fresh}'`), (e) => e.code === "23514");
    const [item] = await rows(`select item_name,price from shopping_items where id='${fresh}'`);
    const [expense] = await rows(`select title,amount from expenses where shopping_item_id='${fresh}'`);
    assert.equal(item.item_name, "새 이름");
    assert.equal(expense.title, "새 이름");
    assert.equal(Number(item.price), 16000);
    assert.equal(Number(expense.amount), 16000);
    await db.exec("alter table expenses drop constraint reject_test_title");
  });
  await t.test("unknown prices are excluded, zero is valid, adding price does not duplicate", async () => {
    await mutate(owner, `update shopping_items set price=null where id='${fresh}'`);
    assert.equal((await rows(`select id from expenses where shopping_item_id='${fresh}'`)).length, 0);
    await mutate(owner, `update shopping_items set price=0 where id='${fresh}'`);
    await mutate(owner, `update shopping_items set price=0 where id='${fresh}'`);
    const linked = await rows(`select amount from expenses where shopping_item_id='${fresh}'`);
    assert.equal(linked.length, 1);
    assert.equal(Number(linked[0].amount), 0);
  });
  await t.test("deleting an item preserves its expense and makes it manually editable", async () => {
    const [before] = await rows(`select id from expenses where shopping_item_id='${fresh}'`);
    await mutate(owner, `delete from shopping_items where id='${fresh}'`);
    const [after] = await rows(`select * from expenses where id='${before.id}'`);
    assert.equal(after.shopping_item_id, null);
    await mutate(partner, `update expenses set amount=200 where id='${before.id}'`);
    await mutate(partner, `delete from expenses where id='${before.id}'`);
    assert.equal((await rows(`select id from expenses where id='${before.id}'`)).length, 0);
  });
  await t.test("manual expense CRUD is unaffected", async () => {
    const [e] = await mutate(owner, `insert into expenses (household_id,title,amount) values ('${home}','병원비',300) returning id`);
    await mutate(partner, `update expenses set paid=true where id='${e.id}'`);
    await mutate(owner, `delete from expenses where id='${e.id}'`);
  });
});
