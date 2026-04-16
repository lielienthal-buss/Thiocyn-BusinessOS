export type MailCategory =
  | 'invoice'
  | 'reminder'
  | 'dispute'
  | 'info'
  | 'task'
  | 'question'
  | 'other';
export type MailPriority = 'high' | 'normal' | 'low';
export type MailAction = 'forward_accounting' | 'urgent_owner' | 'no_action';

export interface MailClassification {
  category: MailCategory;
  priority: MailPriority;
  action: MailAction;
}

const REMINDER_KEYWORDS = [
  'mahnung', 'zahlungserinnerung', 'überfällig', 'overdue', 'reminder',
  'letzte mahnung', 'final notice', 'mahnstufe', 'inkasso', 'past due',
  'payment overdue', 'zahlung ausstehend',
];

const DISPUTE_KEYWORDS = [
  'einspruch', 'streitfall', 'dispute', 'chargeback', 'rückbuchung',
  'reklamation', 'beschwerde', 'complaint', 'widerspruch', 'paypal case',
];

const INVOICE_KEYWORDS = [
  'rechnung', 'invoice', 'faktura', 'beleg', 'receipt', 'quittung',
  'bill ', 'rg-nr', 'rg.', 'rechnungs-nr', 'rechnung nr',
];

const INFO_KEYWORDS = [
  'newsletter', 'unsubscribe', 'no-reply', 'noreply', 'do-not-reply',
  'donotreply', 'bestätigung', 'confirmation', 'verification',
  'auto-generated', 'autoresponder',
];

const TASK_KEYWORDS = [
  'todo', 'aufgabe', 'bitte erledigen', 'please complete',
  'action required', 'action needed', 'bitte um',
];

const QUESTION_KEYWORDS = [
  'frage', 'question', 'können sie', 'can you', 'could you',
  'wie kann ich', 'how do i',
];

const HIGH_PRIORITY_HINTS = [
  'urgent', 'dringend', 'asap', 'eilt', 'sofort', 'frist heute',
  'last warning', 'letzte warnung',
];

const LOW_PRIORITY_HINTS = [
  'newsletter', 'no-reply', 'noreply', 'unsubscribe', 'donotreply',
];

function includesAny(text: string, keywords: string[]): boolean {
  return keywords.some((k) => text.includes(k));
}

export function classifyMail(
  sender: string,
  subject: string,
  preview: string | null = null,
): MailClassification {
  const haystack = `${sender} ${subject} ${preview ?? ''}`.toLowerCase();

  let category: MailCategory = 'other';
  if (includesAny(haystack, DISPUTE_KEYWORDS)) category = 'dispute';
  else if (includesAny(haystack, REMINDER_KEYWORDS)) category = 'reminder';
  else if (includesAny(haystack, INVOICE_KEYWORDS)) category = 'invoice';
  else if (includesAny(haystack, TASK_KEYWORDS)) category = 'task';
  else if (includesAny(haystack, QUESTION_KEYWORDS)) category = 'question';
  else if (includesAny(haystack, INFO_KEYWORDS)) category = 'info';

  let priority: MailPriority = 'normal';
  if (category === 'dispute' || category === 'reminder') priority = 'high';
  else if (category === 'info') priority = 'low';
  if (includesAny(haystack, HIGH_PRIORITY_HINTS)) priority = 'high';
  else if (includesAny(haystack, LOW_PRIORITY_HINTS) && priority !== 'high') priority = 'low';

  let action: MailAction = 'no_action';
  if (category === 'invoice') action = 'forward_accounting';
  else if (category === 'reminder' || category === 'dispute') action = 'urgent_owner';

  return { category, priority, action };
}
