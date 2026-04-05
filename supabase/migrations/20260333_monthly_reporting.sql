-- ─── monthly_inventory ────────────────────────────────────────────────────────
-- Warenwert (Inventarwert) pro Brand pro Monat
-- Sources: jtl (auto-mail), fullmex (manual), shopify (manual)

create table if not exists public.monthly_inventory (
  id              uuid default gen_random_uuid() primary key,
  month           date not null,
  brand           text not null references public.brands(slug) on delete cascade,
  inventory_value numeric(12,2),
  source          text not null check (source in ('jtl', 'fullmex', 'shopify')),
  notes           text,
  created_at      timestamptz default now(),
  unique (month, brand)
);

alter table public.monthly_inventory enable row level security;
create policy "authenticated read monthly_inventory" on public.monthly_inventory
  for select using (auth.role() = 'authenticated');
create policy "authenticated write monthly_inventory" on public.monthly_inventory
  for all using (auth.role() = 'authenticated');

-- ─── monthly_b2b_invoices ─────────────────────────────────────────────────────
-- B2B-Rechnungen pro Brand/Platform pro Monat
-- Platforms: billbee, ankorstore, lightspeed

create table if not exists public.monthly_b2b_invoices (
  id            uuid default gen_random_uuid() primary key,
  month         date not null,
  brand         text not null references public.brands(slug) on delete cascade,
  platform      text not null check (platform in ('billbee', 'ankorstore', 'lightspeed')),
  total_revenue numeric(12,2),
  invoice_count integer not null default 0,
  notes         text,
  created_at    timestamptz default now(),
  unique (month, brand, platform)
);

alter table public.monthly_b2b_invoices enable row level security;
create policy "authenticated read monthly_b2b_invoices" on public.monthly_b2b_invoices
  for select using (auth.role() = 'authenticated');
create policy "authenticated write monthly_b2b_invoices" on public.monthly_b2b_invoices
  for all using (auth.role() = 'authenticated');

-- ─── monthly_reports ──────────────────────────────────────────────────────────
-- Status-Tracking des monatlichen Reportings an Amanda

create table if not exists public.monthly_reports (
  id                         uuid default gen_random_uuid() primary key,
  month                      date not null unique,
  status                     text not null default 'collecting'
                               check (status in ('collecting', 'review', 'sent')),
  sent_to                    text,
  sent_at                    timestamptz,
  paypal_statement_received  boolean not null default false,
  notes                      text,
  created_at                 timestamptz default now()
);

alter table public.monthly_reports enable row level security;
create policy "authenticated read monthly_reports" on public.monthly_reports
  for select using (auth.role() = 'authenticated');
create policy "authenticated write monthly_reports" on public.monthly_reports
  for all using (auth.role() = 'authenticated');
