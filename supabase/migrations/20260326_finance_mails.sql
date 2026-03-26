create table if not exists public.finance_mails (
  id text primary key,
  sender text not null,
  subject text not null,
  preview text,
  received_at timestamptz not null,
  status text not null default 'new' check (status in ('new', 'forwarded_vanessa', 'needs_clarification', 'no_action')),
  category text check (category in ('invoice', 'reminder', 'dispute', 'info', 'other')),
  ai_action text,
  ai_priority text check (ai_priority in ('high', 'normal', 'low')),
  vanessa_note text,
  created_at timestamptz default now()
);

alter table public.finance_mails enable row level security;
create policy "admin access" on public.finance_mails for all using (true);
