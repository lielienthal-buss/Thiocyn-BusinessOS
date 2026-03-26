create table if not exists public.access_requests (
  id uuid primary key default gen_random_uuid(),
  tool_or_service text not null,
  description text,
  status text not null default 'open' check (status in ('open', 'requested', 'granted', 'denied')),
  responsible_person text,
  requested_at timestamptz default now(),
  granted_at timestamptz,
  notes text,
  priority text not null default 'normal' check (priority in ('high', 'normal', 'low')),
  created_at timestamptz default now()
);

alter table public.access_requests enable row level security;
create policy "admin access" on public.access_requests for all using (true);

-- Seed with current open access requests
insert into public.access_requests (tool_or_service, description, status, responsible_person, priority, notes) values
  ('Google Workspace MCP', 'OAuth Client ID muss im Admin-Bereich als Trusted App hinterlegt werden — ermöglicht direkten Zugriff auf Google Sheets/Drive aus Business OS', 'requested', 'Valentin', 'high', 'Client ID: 744253839420-q8g72os7cv80jrhmqec2t33pfs6dgb9f.apps.googleusercontent.com'),
  ('Higgsfield API Key', 'API Key anlegen und in .env eintragen — für AI Video Generation im Dashboard', 'open', 'Luis', 'high', 'Nach Tool-Review Meeting — F-006'),
  ('Google Drive Workspace', 'Admin-Zugriff auf Shared Drives der Hartlimes GmbH für Drive MCP', 'open', 'Valentin', 'normal', 'Benötigt für Drive-Integration in Business OS');
