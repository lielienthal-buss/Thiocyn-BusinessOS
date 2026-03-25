-- =============================================
-- FA Academy: Intern Accounts + Token Tracking
-- Hart Limes GmbH — Run in Supabase SQL Editor
-- Projekt: dfzrkzvsdiiihoejfozn
-- =============================================

-- Intern Accounts (managed by admin)
create table if not exists public.intern_accounts (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null unique,
  department text not null check (department in ('marketing','ecommerce','support','analytics','finance','recruiting')),
  assigned_brand text check (assigned_brand in ('thiocyn','take-a-shot','paigh','dr-severin','wristr','timber-john')),
  budget_tokens_monthly bigint not null default 500000,
  model text not null default 'claude-haiku-4-5-20251001',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Token Usage per intern per month
create table if not exists public.intern_token_usage (
  id uuid primary key default gen_random_uuid(),
  intern_id uuid not null references public.intern_accounts(id) on delete cascade,
  month text not null,
  tokens_input bigint not null default 0,
  tokens_output bigint not null default 0,
  cost_usd numeric(10,4) not null default 0,
  updated_at timestamptz not null default now(),
  unique(intern_id, month)
);

alter table public.intern_accounts enable row level security;
alter table public.intern_token_usage enable row level security;

-- Admin (authenticated) full access
create policy "authenticated full access" on public.intern_accounts
  for all to authenticated using (true) with check (true);
create policy "authenticated full access" on public.intern_token_usage
  for all to authenticated using (true) with check (true);

-- Intern reads own account (via special anon key with intern session)
create policy "intern reads own account" on public.intern_accounts
  for select to anon using (auth_user_id = auth.uid());
create policy "intern reads own usage" on public.intern_token_usage
  for select to anon using (
    intern_id in (select id from public.intern_accounts where auth_user_id = auth.uid())
  );
