-- Tool Stack Tracker
-- Tracks all tools/subscriptions, costs, and status for Hartlimes GmbH

create table if not exists tool_stack (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null,         -- 'Marketing' | 'Finance' | 'Operations' | 'Development' | 'Customer Support' | 'Analytics' | 'E-Commerce'
  billing_cycle text default 'monthly', -- 'monthly' | 'annual' | 'one-time' | 'free'
  monthly_cost numeric,           -- normalized to monthly (annual / 12 if annual)
  currency text default 'EUR',
  status text default 'active',   -- 'active' | 'review' | 'cancelling' | 'cancelled'
  renewal_date date,
  owner text,                     -- e.g. 'Vanessa', 'Luis', 'Valentin'
  url text,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Seed with known tools (costs to be filled in after Tool Review meeting)
insert into tool_stack (name, category, billing_cycle, monthly_cost, status, owner, url, notes) values
  ('Notion', 'Operations', 'monthly', null, 'active', 'Luis', 'https://notion.so', 'Interim Master-Tool bis eigenes OS fertig'),
  ('Shopify — Take A Shot', 'E-Commerce', 'monthly', null, 'active', 'Vanessa', 'https://takeashot.myshopify.com/admin', null),
  ('Shopify — Thiocyn', 'E-Commerce', 'monthly', null, 'active', 'Vanessa', 'https://thiocyn.myshopify.com/admin', null),
  ('Shopify — Paigh', 'E-Commerce', 'monthly', null, 'active', 'Vanessa', 'https://paigh.myshopify.com/admin', null),
  ('Make (Integromat)', 'Operations', 'monthly', null, 'active', 'Luis', 'https://make.com', 'Automationen — kein Intern-Zugriff'),
  ('Supabase', 'Development', 'monthly', null, 'active', 'Luis', 'https://supabase.com', 'Business OS DB — kein Intern-Zugriff'),
  ('Vercel', 'Development', 'monthly', null, 'active', 'Luis', 'https://vercel.com', 'Hosting'),
  ('Google Workspace', 'Operations', 'monthly', null, 'active', 'Vanessa', null, 'jll@hartlimesgmbh.de + Team-Mails'),
  ('Meta Business Suite', 'Marketing', 'free', 0, 'active', 'Luis', 'https://business.facebook.com', 'Posting + Ads Management'),
  ('CapCut', 'Marketing', 'monthly', null, 'active', 'Luis', 'https://capcut.com', 'Video-Editing Interns'),
  ('Asana', 'Operations', 'monthly', null, 'review', 'Luis', 'https://asana.com', 'Wird wahrscheinlich gekündigt — Tool-Review'),
  ('Trello', 'Operations', 'free', 0, 'active', 'Luis', 'https://trello.com', 'Intern Task-Tracking'),
  ('Higgsfield AI', 'Marketing', 'monthly', null, 'active', 'Luis', 'https://higgsfield.ai', '7.500 Credits — 5 Seats Team Plan'),
  ('GetMyInvoices', 'Finance', 'monthly', null, 'active', 'Vanessa', 'https://getmyinvoices.com', 'Rechnungsmanagement'),
  ('Billbee', 'E-Commerce', 'monthly', null, 'active', 'Vanessa', 'https://billbee.io', 'Order + Lager-Management'),
  ('8returns', 'E-Commerce', 'monthly', null, 'review', 'Vanessa', 'https://8returns.com', 'Retourenmanagement — Tool-Review'),
  ('Slack', 'Operations', 'monthly', null, 'review', 'Vanessa', 'https://slack.com', 'Tool-Review: evtl. ersetzen'),
  ('ElevenLabs', 'Marketing', 'monthly', null, 'active', 'Luis', 'https://elevenlabs.io', 'AI Voice für Videos'),
  ('Agicap', 'Finance', 'monthly', null, 'review', 'Vanessa', 'https://agicap.com', 'Mahnung 7.130,48€ offen — Tool-Review'),
  ('Hellotax', 'Finance', 'monthly', null, 'active', 'Vanessa', 'https://hellotax.com', 'Steuer / VAT Compliance')
on conflict do nothing;

-- RLS: allow all for authenticated users (admins only access dashboard)
alter table tool_stack enable row level security;
create policy "Authenticated read/write" on tool_stack
  for all using (auth.role() = 'authenticated');

-- Auto-update updated_at
create or replace function update_tool_stack_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;
create trigger tool_stack_updated_at
  before update on tool_stack
  for each row execute function update_tool_stack_updated_at();
