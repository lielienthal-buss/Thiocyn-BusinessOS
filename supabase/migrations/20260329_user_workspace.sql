-- Per-user workspace configuration (no password stored)
create table if not exists public.user_workspace_config (
  user_id uuid primary key references auth.users(id) on delete cascade,
  enabled_modules text[] not null default array['mails','tools','projekte','zugaenge'],
  mail_label text default 'Mein Postfach',
  imap_host text,
  imap_port integer default 993,
  imap_user text,
  updated_at timestamptz default now()
);

alter table public.user_workspace_config enable row level security;
create policy "own config only" on public.user_workspace_config
  for all using (auth.uid() = user_id);

-- Per-user mails (fetched from their personal IMAP, RLS enforced)
create table if not exists public.user_mails (
  id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  primary key (id, user_id),
  sender text not null,
  subject text not null,
  preview text,
  received_at timestamptz not null,
  status text not null default 'new' check (status in ('new', 'actioned', 'archived')),
  category text check (category in ('invoice', 'reminder', 'dispute', 'info', 'other', 'task', 'question')),
  ai_priority text check (ai_priority in ('high', 'normal', 'low')),
  ai_analysis jsonb,
  note text,
  created_at timestamptz default now()
);

alter table public.user_mails enable row level security;
create policy "own mails only" on public.user_mails
  for all using (auth.uid() = user_id);
