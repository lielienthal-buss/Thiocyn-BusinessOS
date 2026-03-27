-- Daily briefing cache (generated once per day per user)
create table if not exists public.daily_briefings (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null default current_date,
  finance jsonb not null default '[]',
  mails jsonb not null default '[]',
  interns jsonb not null default '[]',
  summary text,
  generated_at timestamptz default now(),
  unique(user_id, date)
);
alter table public.daily_briefings enable row level security;
create policy "own briefings" on public.daily_briefings
  for all using (auth.uid() = user_id);
