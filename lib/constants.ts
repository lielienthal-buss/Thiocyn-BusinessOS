// Central constants — single source of truth for external URLs, IDs, config values

export const CS_LINKS = {
  supportGpt: 'https://chatgpt.com/g/g-69b81f81bd948191878ebbfc21374a5e-support-ticket-copilot',
  supportSops: 'https://docs.google.com/document/d/1U8PS1IiD7IBhCVOXnWBqIsJXqnAptODc/edit',
  solvedTickets: 'https://docs.google.com/spreadsheets/d/10c0mJ30CYAPilgb1sJ8mPk9YahGr8jpy6eVXy2F-gKg/edit',
  returnsViking: 'https://docs.google.com/spreadsheets/d/1bopEmzQ-Wga5kYckw187F7Cm1IuNq5KgR7gZCFMSbyw/edit',
} as const;

export const AI_MODELS = {
  default: 'claude-sonnet-4-6',
  fast: 'claude-haiku-4-5-20251001',
  powerful: 'claude-opus-4-6',
} as const;

export const ADMIN_EMAIL = 'luis@mail.hartlimesgmbh.de';

export const BRANDS = [
  { id: 'thiocyn', label: 'Thiocyn', accent: '#A78BFA' },
  { id: 'take-a-shot', label: 'Take A Shot', accent: '#F59E0B' },
  { id: 'paigh', label: 'Paigh', accent: '#F43F5E' },
  { id: 'dr-severin', label: 'Dr. Severin', accent: '#38BDF8' },
  { id: 'wristr', label: 'Wristr', accent: '#94A3B8' },
  { id: 'timber-john', label: 'Timber & John', accent: '#4ADE80' },
] as const;
