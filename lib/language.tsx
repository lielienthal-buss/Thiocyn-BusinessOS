import React, { createContext, useContext, useState, ReactNode } from 'react';

type Lang = 'de' | 'en';

const LanguageContext = createContext<{ lang: Lang; setLang: (l: Lang) => void }>({
  lang: 'de',
  setLang: () => {},
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>(() =>
    (localStorage.getItem('app_lang') as Lang) ?? 'de'
  );
  const set = (l: Lang) => { localStorage.setItem('app_lang', l); setLang(l); };
  return <LanguageContext.Provider value={{ lang, setLang: set }}>{children}</LanguageContext.Provider>;
}

export function useLang() { return useContext(LanguageContext); }

// Translation hook — returns t(key) function
const translations: Record<string, Record<Lang, string>> = {
  // WorkspaceView — Tabs
  'tab.mails': { de: 'Mails', en: 'Mails' },
  'tab.tools': { de: 'Tools', en: 'Tools' },
  'tab.projekte': { de: 'Projekte', en: 'Projects' },
  'tab.zugaenge': { de: 'Zugänge', en: 'Access' },
  // WorkspaceView — Header buttons
  'ws.configure': { de: 'Konfigurieren', en: 'Configure' },
  'ws.mailboxes': { de: 'Postfächer', en: 'Inboxes' },
  // AccountsPanel
  'ap.title': { de: 'Mail-Accounts', en: 'Mail Accounts' },
  'ap.addAccount': { de: 'Konto hinzufügen', en: 'Add Account' },
  'ap.label': { de: 'Bezeichnung', en: 'Label' },
  'ap.host': { de: 'IMAP Host', en: 'IMAP Host' },
  'ap.port': { de: 'Port', en: 'Port' },
  'ap.user': { de: 'Benutzername / E-Mail', en: 'Username / E-Mail' },
  'ap.password': { de: 'Passwort', en: 'Password' },
  'ap.passwordHint': { de: 'nur für diese Sitzung', en: 'session only' },
  'ap.save': { de: 'Speichern', en: 'Save' },
  'ap.cancel': { de: 'Abbrechen', en: 'Cancel' },
  'ap.delete': { de: 'Löschen', en: 'Delete' },
  'ap.noAccounts': { de: 'Noch keine Mail-Accounts konfiguriert.', en: 'No mail accounts configured yet.' },
  // ConfigPanel
  'cp.title': { de: 'Workspace konfigurieren', en: 'Configure Workspace' },
  'cp.modules': { de: 'Aktive Module', en: 'Active Modules' },
  // MailsTab — SOP onboarding
  'mt.setupTitle': { de: 'Mail-Account einrichten', en: 'Set up Mail Account' },
  'mt.setupSubtitle': { de: 'Folge diesen 3 Schritten um dein Postfach anzubinden', en: 'Follow these 3 steps to connect your inbox' },
  'mt.step1Title': { de: 'IMAP-Zugangsdaten besorgen', en: 'Get IMAP credentials' },
  'mt.step1Body': { de: 'Du brauchst: IMAP-Host, Port (993), E-Mail-Adresse und ein App-Passwort. App-Passwörter findest du in den Sicherheitseinstellungen deines E-Mail-Providers — nicht dein normales Login-Passwort verwenden.', en: 'You need: IMAP host, port (993), email address and an app password. Find app passwords in your email provider\'s security settings — do not use your regular login password.' },
  'mt.step1Tip': { de: 'KAS/All-Inkl: Kundenmenü → E-Mail → Postfach → App-Passwort erstellen', en: 'KAS/All-Inkl: Customer menu → E-Mail → Mailbox → Create app password' },
  'mt.step2Title': { de: 'Mail-Account konfigurieren', en: 'Configure Mail Account' },
  'mt.step2Body': { de: 'Klicke auf "Mail einrichten" und trage Host, Port, Benutzername und App-Passwort ein. Das Passwort wird nur für diese Sitzung gespeichert — nie dauerhaft.', en: 'Click "Set up Mail" and enter host, port, username and app password. The password is only stored for this session — never permanently.' },
  'mt.step2Tip': { de: 'Host-Beispiele: mail.domain.de · imap.gmail.com · outlook.office365.com', en: 'Host examples: mail.domain.de · imap.gmail.com · outlook.office365.com' },
  'mt.step3Title': { de: 'Postfach synchronisieren', en: 'Sync Inbox' },
  'mt.step3Body': { de: 'Nach der Einrichtung auf "Sync" klicken. Die letzten 30 Mails werden geladen und automatisch von der KI kategorisiert (Rechnung, Mahnung, Info …).', en: 'After setup, click "Sync". The last 30 emails are loaded and automatically categorised by AI (invoice, reminder, info …).' },
  'mt.step3Tip': { de: 'Bei jeder neuen Sitzung: Passwort erneut eingeben, dann Sync.', en: 'Each new session: re-enter password, then sync.' },
  'mt.setupBtn': { de: 'Mail einrichten', en: 'Set up Mail' },
  // MailsTab — password screen
  'mt.passTitle': { de: 'Warum muss ich das Passwort jedes Mal eingeben?', en: 'Why do I need to enter the password every time?' },
  'mt.passBody': { de: 'Dein Mail-Passwort wird aus Sicherheitsgründen nicht dauerhaft gespeichert. Es bleibt nur für diese Browser-Sitzung aktiv. Beim nächsten Login gibst du es einmalig neu ein — so haben wir keine Passwörter in der Datenbank.', en: 'Your mail password is not stored permanently for security reasons. It only remains active for this browser session. On your next login you enter it once — no passwords in the database.' },
  'mt.passTip': { de: 'Tipp: App-Passwort aus deinem Passwort-Manager kopieren (z.B. 1Password)', en: 'Tip: Copy app password from your password manager (e.g. 1Password)' },
  'mt.passBtn': { de: 'Passwort eingeben und Postfach öffnen', en: 'Enter Password and Open Inbox' },
  // MailsTab — mail list
  'mt.all': { de: 'Alle', en: 'All' },
  'mt.new': { de: 'Neu', en: 'New' },
  'mt.actioned': { de: 'Erledigt', en: 'Done' },
  'mt.archived': { de: 'Archiv', en: 'Archive' },
  'mt.sync': { de: 'Sync', en: 'Sync' },
  'mt.syncResult': { de: 'neue Mails', en: 'new emails' },
  'mt.syncChecked': { de: 'geprüft', en: 'checked' },
  'mt.noMails': { de: 'Keine Mails.', en: 'No emails.' },
  'mt.urgent': { de: 'Dringend', en: 'Urgent' },
  'mt.markDone': { de: '✓ Erledigt', en: '✓ Done' },
  'mt.archive': { de: 'Archivieren', en: 'Archive' },
  'mt.markNew': { de: 'Als neu markieren', en: 'Mark as new' },
  'mt.notePlaceholder': { de: 'Notiz…', en: 'Note…' },
  'mt.noteSave': { de: 'Speichern', en: 'Save' },
  'mt.analysisTitle': { de: 'KI-Analyse', en: 'AI Analysis' },
  'mt.showAnalysis': { de: '📊 Analyse anzeigen', en: '📊 Show Analysis' },
  // PasswordPrompt
  'pp.title': { de: 'Passwort eingeben', en: 'Enter Password' },
  'pp.label': { de: 'Passwort', en: 'Password' },
  'pp.hint': { de: 'nur für diese Sitzung', en: 'session only' },
  'pp.connect': { de: 'Verbinden', en: 'Connect' },
  'pp.cancel': { de: 'Abbrechen', en: 'Cancel' },
  // ToolsTab
  'tt.monthly': { de: 'Monatlich', en: 'Monthly' },
  'tt.active': { de: 'Aktiv', en: 'Active' },
  'tt.review': { de: 'Review', en: 'Review' },
  'tt.open': { de: 'Öffnen →', en: 'Open →' },
  // ProjekteTab
  'pt.noTasks': { de: 'Keine offenen Tasks.', en: 'No open tasks.' },
  // ZugaengeTab
  'zt.open': { de: 'offen', en: 'open' },
  'zt.addBtn': { de: '+ Zugang beantragen', en: '+ Request Access' },
  'zt.tool': { de: 'Tool / Service', en: 'Tool / Service' },
  'zt.responsible': { de: 'Verantwortlich', en: 'Responsible' },
  'zt.description': { de: 'Beschreibung', en: 'Description' },
  'zt.highPrio': { de: 'Hohe Priorität', en: 'High Priority' },
  'zt.normal': { de: 'Normal', en: 'Normal' },
  'zt.low': { de: 'Niedrig', en: 'Low' },
  'zt.statusOpen': { de: 'Offen', en: 'Open' },
  'zt.statusRequested': { de: 'Beantragt', en: 'Requested' },
  'zt.statusGranted': { de: 'Erteilt', en: 'Granted' },
  'zt.statusDenied': { de: 'Abgelehnt', en: 'Denied' },
  'zt.markRequested': { de: '→ Beantragt', en: '→ Mark Requested' },
  'zt.markGranted': { de: '✓ Erteilt', en: '✓ Grant' },
  'zt.markDenied': { de: '✕ Abgelehnt', en: '✕ Deny' },
  'zt.urgent': { de: 'Dringend', en: 'Urgent' },
  'zt.save': { de: 'Speichern', en: 'Save' },
  'zt.cancel': { de: 'Abbrechen', en: 'Cancel' },
  'zt.delete': { de: 'Löschen', en: 'Delete' },
};

export function useT() {
  const { lang } = useLang();
  return (key: string, fallback?: string): string =>
    translations[key]?.[lang] ?? translations[key]?.['de'] ?? fallback ?? key;
}
