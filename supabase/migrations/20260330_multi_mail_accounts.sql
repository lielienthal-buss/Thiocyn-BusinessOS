-- Multiple IMAP mail accounts per user
create table if not exists public.user_mail_accounts (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  label text not null default 'Postfach',
  imap_host text not null,
  imap_port integer not null default 993,
  imap_user text not null,
  created_at timestamptz default now()
);
alter table public.user_mail_accounts enable row level security;
create policy "own mail accounts" on public.user_mail_accounts
  for all using (auth.uid() = user_id);

-- Link mails to their source account
alter table public.user_mails
  add column if not exists account_id uuid references public.user_mail_accounts(id) on delete set null;
