-- Add AI analysis column and rename internal note column
alter table public.finance_mails
  add column if not exists ai_analysis jsonb;

-- Rename person-specific column to generic name (white-label)
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_name = 'finance_mails' and column_name = 'vanessa_note'
  ) then
    alter table public.finance_mails rename column vanessa_note to handoff_note;
  end if;
end $$;
