-- ============================================================
-- Forum 2026 Expense Ledger — Supabase schema
-- Run this once in Supabase → SQL Editor → New query → Run
-- ============================================================

-- 1. Tables ---------------------------------------------------
create table if not exists meetings (
  month     text primary key,
  venue     text default '',
  payments  jsonb default '{}'::jsonb
);

create table if not exists settlements (
  id         bigint generated always as identity primary key,
  from_m     text not null,
  to_m       text not null,
  amount     numeric not null,
  date       date not null,
  created_at timestamptz default now()
);

-- 2. Row Level Security --------------------------------------
-- Only signed-in users (i.e. you, via your magic link) can read/write.
alter table meetings    enable row level security;
alter table settlements enable row level security;

create policy "authed read meetings"   on meetings    for select to authenticated using (true);
create policy "authed write meetings"  on meetings    for all    to authenticated using (true) with check (true);
create policy "authed read settle"     on settlements for select to authenticated using (true);
create policy "authed write settle"    on settlements for all    to authenticated using (true) with check (true);

-- 3. Seed data (your current ledger) -------------------------
insert into meetings (month, venue, payments) values
  ('Jan', 'ARQ @ Leela', '{"Manav":167733,"PP":13700}'::jsonb),
  ('Feb', 'Xanadu',      '{"Faiz":79602}'::jsonb),
  ('Mar', 'Conrad',      '{"Faiz":13121}'::jsonb),
  ('Apr', 'Xanadu',      '{"Faiz":18980}'::jsonb),
  ('Jun', 'Xanadu',      '{"Faiz":96550}'::jsonb),
  ('Jul', '', '{}'::jsonb),
  ('Aug', '', '{}'::jsonb),
  ('Sep', '', '{}'::jsonb),
  ('Oct', '', '{}'::jsonb),
  ('Nov', '', '{}'::jsonb),
  ('Dec', '', '{}'::jsonb)
on conflict (month) do nothing;

insert into settlements (from_m, to_m, amount, date) values
  ('PP',     'Faiz', 30000, '2026-06-12'),
  ('Sahil',  'Faiz', 43298, '2026-06-14'),
  ('Ashish', 'Faiz', 43298, '2026-06-12'),
  ('Vidur',  'Faiz', 42900, '2026-06-14'),
  ('Vidur',  'PP',     398, '2026-06-14');
