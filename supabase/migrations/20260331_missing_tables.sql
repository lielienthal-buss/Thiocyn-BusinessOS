-- ─── brands ───────────────────────────────────────────────────────────────────
create table if not exists public.brands (
  id uuid default gen_random_uuid() primary key,
  slug text not null unique,
  name text not null,
  emoji text,
  color text,
  status text not null default 'active' check (status in ('active', 'paused', 'archived')),
  created_at timestamptz default now()
);
alter table public.brands enable row level security;
create policy "authenticated read brands" on public.brands
  for select using (auth.role() = 'authenticated');
create policy "authenticated write brands" on public.brands
  for all using (auth.role() = 'authenticated');

insert into public.brands (slug, name, emoji, color, status) values
  ('thiocyn',       'Thiocyn',       '🧴', '#4f46e5', 'active'),
  ('take-a-shot',   'Take A Shot',   '📸', '#0ea5e9', 'active'),
  ('dr-severin',    'Dr. Severin',   '🩺', '#10b981', 'active'),
  ('paigh',         'Paigh',         '⌚', '#f59e0b', 'active'),
  ('wristr',        'Wristr',        '⌚', '#8b5cf6', 'active'),
  ('timber-john',   'Timber & John', '🪵', '#d97706', 'active'),
  ('cross-brand',   'Cross-Brand',   '🔗', '#6b7280', 'active')
on conflict (slug) do nothing;

-- ─── brand_configs ────────────────────────────────────────────────────────────
create table if not exists public.brand_configs (
  id uuid default gen_random_uuid() primary key,
  brand_slug text not null unique references public.brands(slug) on delete cascade,
  config jsonb not null default '{}',
  updated_at timestamptz default now()
);
alter table public.brand_configs enable row level security;
create policy "authenticated read brand_configs" on public.brand_configs
  for select using (auth.role() = 'authenticated');
create policy "authenticated write brand_configs" on public.brand_configs
  for all using (auth.role() = 'authenticated');

-- ─── team_tasks ───────────────────────────────────────────────────────────────
create table if not exists public.team_tasks (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  description text,
  brand text,
  assigned_to_email text,
  priority integer not null default 2,
  due_date date,
  status text not null default 'todo' check (status in ('todo', 'in_progress', 'review', 'blocked', 'done')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table public.team_tasks enable row level security;
create policy "authenticated read team_tasks" on public.team_tasks
  for select using (auth.role() = 'authenticated');
create policy "authenticated write team_tasks" on public.team_tasks
  for all using (auth.role() = 'authenticated');

-- ─── disputes ─────────────────────────────────────────────────────────────────
create table if not exists public.disputes (
  id uuid default gen_random_uuid() primary key,
  brand text not null,
  case_id text not null,
  platform text not null,
  amount numeric(10,2) not null,
  currency text not null default 'EUR',
  deadline date,
  status text not null default 'open' check (status in ('open', 'escalated', 'resolved')),
  notes text,
  created_at timestamptz default now()
);
alter table public.disputes enable row level security;
create policy "authenticated read disputes" on public.disputes
  for select using (auth.role() = 'authenticated');
create policy "authenticated write disputes" on public.disputes
  for all using (auth.role() = 'authenticated');

-- ─── notifications ────────────────────────────────────────────────────────────
create table if not exists public.notifications (
  id uuid default gen_random_uuid() primary key,
  type text not null,
  title text not null,
  body text,
  read boolean not null default false,
  recipient_user_id uuid references auth.users(id) on delete cascade,
  metadata jsonb,
  created_at timestamptz default now()
);
alter table public.notifications enable row level security;
create policy "own or broadcast notifications" on public.notifications
  for select using (
    recipient_user_id is null or recipient_user_id = auth.uid()
  );
create policy "authenticated write notifications" on public.notifications
  for insert with check (auth.role() = 'authenticated');
create policy "own update notifications" on public.notifications
  for update using (
    recipient_user_id is null or recipient_user_id = auth.uid()
  );
