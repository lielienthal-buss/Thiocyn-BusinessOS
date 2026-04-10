# 05 — AI Strategy

**Last updated:** 2026-04-10
**Stand:** Welle 0 (Foundation Setup)
**Verwendung:** Single-Reference für AI-Aktivierung. Pro AI-Function: Activation Trigger + Kill Criteria + Fallback. Vor jeder AI-Code-Änderung lesen.

---

## 0. Grund-Prinzip

**AI ist Multiplikator, nicht Kern.** Per `feedback_internal_os_not_saas.md`. Ein Modul ohne AI das funktioniert > Modul mit AI das niemand nutzt.

**Phase-1-Default:** AI-Functions sind **deployed**. Welle 1 erlaubt **manuelle on-demand Nutzung** für 2 Functions explizit:
- ✅ `analyze-applicant` — Mainak/Luis können Button im Frontend klicken
- ✅ `jarvis-chat` — Drawer kann manuell geöffnet werden
- ❌ Alle anderen Functions: deployed but not invoked
- ❌ KEINE Cron-Jobs / Auto-Trigger

**Cost-Realität (Welle 1):** ~$0.30 worst case bei 100 Calls × analyze-applicant + 200 jarvis-chat Sessions. Cost ist Noise, nicht Constraint.

**Phase-2-Trigger (global):** Auto-Trigger + Cron-Aktivierung erst wenn:
1. Firmen-API für Anthropic vorhanden (statt Luis Personal-Tokens)
2. Cost-Tracking via `ai_invocations` Tabelle live (siehe §8.2)
3. Activation Trigger der jeweiligen Function erfüllt

Per `feedback_business_os_phasing.md`.

---

## 1. AI-Function Inventar

10 AI-bezogene Edge Functions identifiziert (alle nutzen Anthropic Claude Haiku 4.5):

| # | Function | Zweck | Phase 1 Status | Activation Trigger | Kill Criteria |
|---|---|---|---|---|---|
| 1 | `analyze-applicant` | Bewerber-Score + Verdict | INACTIVE | Welle 1 manuell on-demand möglich | siehe §2 |
| 2 | `jarvis-chat` | AI-Chat Assistant im Dashboard | INACTIVE | siehe §3 | siehe §3 |
| 3 | `daily-briefing` | Tägliches Briefing mit AI-Summary | INACTIVE (Tool nicht genutzt) | siehe §4 | siehe §4 |
| 4 | `generate-briefing` | Ähnlich daily-briefing, separater Code-Pfad | INACTIVE | siehe §4 | siehe §4 |
| 5 | `analyze-finance-mail` | Klassifiziert Finance-Mails | INACTIVE | siehe §5 | siehe §5 |
| 6 | `emma-work-plan` | Tagesplan Generator | INACTIVE | siehe §6 | siehe §6 |
| 7 | `academy-chat` | AI-Chat für Interns mit Token-Budget | INACTIVE | siehe §7 | siehe §7 |
| 8 | `hire-candidate` (indirekt) | Trigger Email-Versand bei Hire — KEIN AI direkt | n/a | n/a (nicht AI-driven) | n/a |
| 9 | `analyze-applicant` Auto-Trigger | n8n Workflow „on-form-submit" → analyze-applicant | INACTIVE | siehe §2.2 | siehe §2.2 |
| 10 | `claude-code` (extern, Luis-Personal) | Luis nutzt Claude Code für OS-Entwicklung | aktiv | n/a (Luis-Personal) | n/a |

---

## 2. analyze-applicant

**Code-Pfad:** `supabase/functions/analyze-applicant/index.ts`
**Modell:** `claude-haiku-4-5-20251001`
**Cost-Schätzung:** ~$0.001-0.003 pro Aufruf (Haiku, 300 max_tokens, ~500 input tokens)
**Input:** application_id → liest applications + recruiter_settings
**Output:** Score 25/50/75/100, Verdict (STRONG YES / YES / MAYBE / NO), 2-3 Sentence Reason, 1 Watch Out
**Writes:** `applications.aiScore` + `applications.ai_analysis`

### 2.1 Aktueller Status

- Function deployed ✅
- ANTHROPIC_API_KEY pflicht in Edge Function Env
- 47 Bewerber in DB, alle haben `aiScore` Spalte aber unbekannt wie viele befüllt sind (nicht verifiziert in dieser Session)
- Trigger: vermutlich manuell oder über alten n8n Workflow

### 2.2 Phase 1 Welle 1 Verhalten (final, per Luis-Decision 10.04.)

**Status:** ✅ **manueller Aufruf in Welle 1 ERLAUBT.** Cost ist Noise (~$0.05 für 50 Bewerber).

**Erlaubt:**
- Recruiter klickt im ApplicantDetailView „AI Analyse" Button → ein Aufruf, Cost ~$0.0005
- Ergebnis wird gespeichert in applications.aiScore + ai_analysis
- Mainak nutzt das aktiv für Screening-Beschleunigung
- Luis testet auf 20+ Bewerbern für Phase-2-Vergleichs-Daten

**Verboten:**
- Auto-Trigger bei Bewerber-Eingang (war n8n Workflow geplant)
- Bulk-Reanalyse aller 47 Bewerber auf einmal (Risk: Cost-Spike)
- Cron-Job der nicht-analysierte Bewerber täglich abarbeitet

### 2.3 Phase 2 Activation Trigger (behavioral, messbar)

**Wann wird analyze-applicant produktiv (auto-trigger bei jedem Eingang)?**

| Bedingung | Schwellwert | Wie gemessen |
|---|---|---|
| Firmen-API für Anthropic vorhanden | Hart Limes hat eigenen Anthropic-Account | binär |
| Manuelle Nutzung in Welle 1 | ≥20 analyze-applicant Calls in `os_metrics` getrackt | SQL-Count auf operational metric `analyze_applicant_invocations` |
| **Verdict-Match-Rate** | AI-Verdict matched Mainak/Luis Final-Decision in **≥70% von 20 Cases** | Tracking-Tabelle `analyze_applicant_verdict_match` (intern_id, ai_verdict, human_verdict, matched bool) — wird in Welle 1 Item 12 angelegt |
| Cost-Tracking läuft | `ai_invocations` Tabelle aktiv | binär |

**Alle 4 müssen erfüllt sein für Phase-2-Aktivierung.**

### 2.4 Kill Criteria (behavioral, messbar)

**Wann wird analyze-applicant zurückgebaut (auch nach Aktivierung)?**

| Trigger | Schwellwert | Wie gemessen |
|---|---|---|
| Verdict-Match-Rate fällt | <50% über 20 aufeinanderfolgende Bewerber | `analyze_applicant_verdict_match` rolling window |
| Cost-Spike | >$50/Monat für Hart Limes Volumen | `ai_invocations.estimated_cost_usd` SUM |
| Function wird ignoriert | <2 manuelle Klicks/Woche über 4 Wochen | `os_metrics` operational counter |
| Mainak meldet zurück | „macht keinen Unterschied" + Action-Verbalisierung in 1:1 | Notiz in 1:1 Doc, separate Datei |

**Bei Kill:** Frontend-Button auf hidden, Edge Function deployed lassen (keine Lösch-Migration), `aiScore` Spalte bleibt für historische Daten. `analyze_applicant_verdict_match` Tabelle bleibt für Re-Evaluation.

### 2.5 Fallback

**Was läuft wenn analyze-applicant inactive ist:**
- Recruiter screent manuell anhand von:
  - `applications.motivation_text`
  - `applications.psychometrics` (Big Five Score)
  - `applications.linkedin_url`
  - `applications.work_sample_text`
- Per Hiring SOP: Big Five Neuroticism > 80% = Auto-Reject (regelbasiert, kein AI)
- Per Hiring SOP: Effort-Check (visuelle Qualität, ChatGPT-Detection) = manuell

**Welle-1-Item:** Stelle sicher, dass das Frontend diese 4 Felder gut darstellt — dann ist Manual-Screening robust.

---

## 3. jarvis-chat

**Code-Pfad:** `supabase/functions/jarvis-chat/index.ts`
**Modell:** vermutlich Claude Haiku 4.5 (nicht direkt verifiziert in dieser Session)
**Zweck:** AI-Chat-Assistent kontextbewusst pro Section (Command, Creative, Revenue, Hiring, Finance, Support, Admin)
**Cost-Schätzung:** ~$0.005-0.015 pro Conversation (Haiku, 200-1000 tokens output)
**Input:** message + section + history
**Output:** Streaming-Text-Response

### 3.1 Aktueller Status

- Function deployed ✅
- Frontend-Komponente `AgentChatDrawer.tsx` existiert
- Per Memory `project_business_os_state.md`: „live mit Live-DB-Kontext"

### 3.2 Phase 1 Welle 1 Verhalten

**Status:** **deployed but not auto-invoked**. Drawer kann geöffnet werden, aber:
- Kein Auto-Open bei Section-Wechsel
- Kein Push-Notification von Jarvis
- Luis kann es ad-hoc testen, aber Interns sollen es noch nicht aktiv nutzen

### 3.3 Welle 1 Welle 1 Verhalten (NEU per Luis-Decision 10.04.)

**Status:** ✅ **Drawer kann in Welle 1 manuell genutzt werden.** Cost ist Noise (~$0.20 für 100 Sessions).

**Erlaubt:**
- Luis öffnet AgentChatDrawer ad-hoc
- Section-Context wird mitgegeben (Command/Hiring/Finance/etc.)
- Keine Conversation-History-Speicherung in Welle 1 (Conversation lebt in der Session)

**Verboten:**
- Auto-Open bei Section-Wechsel
- Push-Notifications „Jarvis schlägt vor..."
- Interns dürfen es noch nicht aktiv nutzen (warten bis nach Welle 1)

### 3.4 Phase 2 Activation Trigger (behavioral, messbar)

| Bedingung | Schwellwert | Wie gemessen |
|---|---|---|
| Firmen-API für Anthropic | vorhanden | binär |
| Luis nutzt es regelmäßig | ≥10 Sessions/Woche über 2 Wochen | `os_metrics` operational counter `jarvis_chat_sessions` |
| **Action-Follow-Through-Rate** | Luis führt eine im Chat empfohlene Aktion innerhalb 15 min aus in **≥50% der Sessions** | Manual rating: nach jeder Session ein „did this lead to action?" Y/N im Chat-UI (kommt mit Welle-2-UI-Update) |
| Cost im Rahmen | <$5/Monat für Luis-only Nutzung | `ai_invocations` SUM |

### 3.5 Kill Criteria (behavioral, messbar)

| Trigger | Schwellwert | Wie gemessen |
|---|---|---|
| Cost übersteigt Rahmen | >$30/Monat ohne neue User | `ai_invocations` weekly check |
| Luis nutzt es nicht | <2 Sessions/Woche über 4 Wochen | `os_metrics` |
| Action-Follow-Through fällt | <30% der Sessions führen zu Action | Y/N Rating |

**Bei Kill:** Drawer-Button auf hidden, Edge Function bleibt deployed.

### 3.5 Fallback

**Was läuft wenn jarvis-chat inactive ist:**
- Luis nutzt Claude Code (extern) für OS-Entwicklung
- Luis nutzt Telegram-Bot oder direkte API-Calls für strategische Fragen
- Im Business OS: keine AI-Hilfe, alle Workflows manuell

---

## 4. daily-briefing + generate-briefing

**Code-Pfad:** `supabase/functions/daily-briefing/index.ts` + `supabase/functions/generate-briefing/index.ts`
**Modell:** Claude Haiku 4.5
**Zweck:** Tägliches Briefing aus Finance Mails + User Mails + Disputes + Tasks → priorisierte Liste
**Cost-Schätzung:** ~$0.005-0.020 pro Briefing (Haiku, 3 parallele Calls mit je 800 max_tokens)
**Input:** user_id
**Output:** finance / mails / interns Arrays + Summary
**Writes:** `daily_briefings` (Cache pro user_id+date)

### 4.1 Aktueller Status

- Function deployed ✅
- 5 daily_briefings in DB, alle mit Summary „0 dringende Items"
- Bug-1: lädt finance_pipeline NICHT (siehe Doc B §3 Modul 5)
- Bug-2: Cache greift bei user_id+date, kein Refresh
- Bug-3: Summary-Logik defekt (zählt nur AI-priority='high', alle finance_mails sind null)
- Per Luis 10.04.: **„Tool wird aktuell nicht aktiv genutzt"** → Bugs sind P3, kein P0

### 4.2 Phase 1 Welle 1 Verhalten

**Status:** **deferred bis Tool-Aktivierung**. Welle 1 fasst daily-briefing/generate-briefing NICHT an.

### 4.3 Phase 2 Activation Trigger

| Bedingung | Schwellwert |
|---|---|
| Tool wird produktiv ausgerollt | Luis nutzt OS täglich |
| Bugs gefixt | finance_pipeline geladen, Cache-Bypass, Summary-Logik repariert |
| Firmen-API | vorhanden |
| Luis liest Briefing aktiv | ≥4 Briefings/Woche, „nützlich" Bewertung |

### 4.4 Kill Criteria

- Briefing-Lesen <2x/Woche nach 4 Wochen
- Cost >$50/Monat für 1 User (Luis)
- Briefing-Inhalt überschneidet sich mit Action Center → redundant

### 4.5 Fallback

**Was läuft wenn daily-briefing inactive ist:**
- Action Center (regelbasiert, kein AI) zeigt offene Items
- Luis nutzt Caya/Mail-Clients direkt für Mails
- Tasks-View zeigt was offen ist

---

## 5. analyze-finance-mail

**Code-Pfad:** `supabase/functions/analyze-finance-mail/index.ts`
**Modell:** Claude Haiku 4.5
**Zweck:** Klassifiziert Finance-Mails: invoice / reminder / dispute / info / other + Priority + Action
**Cost-Schätzung:** ~$0.001 pro Mail (Haiku, 150 max_tokens)
**Input:** sender + subject + preview
**Output:** category + priority + action
**Writes:** `finance_mails.category, ai_priority, ai_action, ai_analysis`

### 5.1 Aktueller Status

- Function deployed ✅
- 30 finance_mails in DB, **alle mit category=null** → Function läuft nirgends gegen
- fetch-finance-mails ist seit 26.03. still → keine neuen Mails kommen
- Per Luis 10.04.: Tool nicht aktiv, kein Fix-Druck

### 5.2 Phase 1 Welle 1 Verhalten

**Status:** **deferred bis Finance-Modul-Aktivierung**. Welle 1 fasst analyze-finance-mail NICHT an.

### 5.3 Phase 2 Activation Trigger

| Bedingung | Schwellwert |
|---|---|
| fetch-finance-mails wieder live | täglich neue Mails kommen rein |
| Tom oder Luis testet manuell auf 30 Mails | Klassifikation ≥80% korrekt |
| Firmen-API | vorhanden |
| Cost im Rahmen | <$10/Monat (~3000 Mails/Monat × $0.001) |

### 5.4 Kill Criteria

- Klassifikation <60% korrekt → Manual ist schneller
- Cost > €30/Monat ohne klaren Time-Saving für Tom/Luis

### 5.5 Fallback

**Was läuft wenn analyze-finance-mail inactive ist:**
- Tom triagiert Mails manuell in Caya
- Per `tom-finance-onboarding.md`: regelbasierte Sortierung (an thiocyn → automatic, andere → manuell)

---

## 6. emma-work-plan

**Code-Pfad:** `supabase/functions/emma-work-plan/index.ts`
**Modell:** Claude Haiku 4.5
**Zweck:** Generiert Tagesplan aus Tasks + Calendar (vermutlich Apple Calendar)
**Cost-Schätzung:** ~$0.005 pro Aufruf
**Input:** keine (liest live tasks + mails)
**Output:** Plan-Struktur

### 6.1 Aktueller Status

- Function deployed ✅
- `EmmaPlannerTab` in FinanceView vorhanden
- Nutzung unbekannt — vermutlich nicht aktiv

### 6.2 Phase 1 Welle 1 Verhalten

**Status:** **out-of-scope für Welle 1** (Hiring & Onboarding Fokus). Wird in späterer Welle (z. B. Personal Productivity) reaktiviert.

### 6.3 Phase 2 Activation Trigger

| Bedingung | Schwellwert |
|---|---|
| Luis testet manuell | ≥10 Plans erstellt |
| Plan-Qualität | ≥70% der Plans als „brauchbar" empfunden |
| Vergleich mit Manual-Planning | Plan ist messbar schneller / besser |

### 6.4 Kill Criteria

- Plans werden ignoriert / nicht befolgt
- Cost vs Mehrwert nicht gerechtfertigt

### 6.5 Fallback

- Luis plant manuell, Tasks-View ist sortier-/filterbar
- Jarvis-Chat (wenn aktiv) kann ähnliches leisten ad-hoc

---

## 7. academy-chat

**Code-Pfad:** `supabase/functions/academy-chat/index.ts`
**Modell:** vermutlich Claude Haiku 4.5
**Zweck:** AI-Chat für Interns mit Token-Budget pro Intern
**Cost-Schätzung:** Variabel, durch `intern_token_usage` getrackt (sollte)
**Writes:** `intern_token_usage`

### 7.1 Aktueller Status

- Function deployed ✅
- `intern_token_usage` Tabelle existiert mit 0 Rows → niemand nutzt es ODER Tracking funktioniert nicht
- Frontend `InternChat.tsx` in `components/academy/` existiert

### 7.2 Phase 1 Welle 1 Verhalten

**Status:** **deployment-ready, aktivierungs-pausiert**. Interns kennen die Function nicht, sie ist im UI versteckt oder nicht prominent.

### 7.3 Phase 2 Activation Trigger

| Bedingung | Schwellwert |
|---|---|
| Firmen-API | vorhanden |
| Token-Budget pro Intern definiert | z. B. 1M Tokens/Monat = ~$1-2/Intern |
| Token-Tracking funktioniert | `intern_token_usage` wird befüllt bei jedem Aufruf |
| 1 Pilot-Intern testet 1 Woche | „nützlich" Bewertung |
| Cost-Kontrolle hard cap | Budget-Überschreitung blockt weitere Aufrufe |

### 7.4 Kill Criteria

- Interns nutzen es nicht (1 Woche Test, <5 Conversations/Intern)
- Token-Tracking funktioniert nicht zuverlässig → Cost-Risiko
- Output ist generisch / nicht intern-relevant

### 7.5 Fallback

- Interns nutzen ChatGPT/Claude.ai privat (out-of-band)
- Luis als Sparring-Partner
- Knowledge Base (wenn jemals gebaut)

---

## 8. Cost-Tracking-Strategie (Phase 1 + 2)

### 8.1 Phase 1: Manuelle Cost-Schätzung

Solange Anthropic über Luis Personal-Tokens läuft:
- **Keine Auto-Trigger** für AI-Functions (verhindert Cost-Explosion)
- **Manuelle Tests** sind explizit erlaubt, Luis trackt Cost mental
- **Kein systematisches Cost-Tracking** in DB

### 8.2 Phase 2: Cost-Tracking-Pflicht

Sobald Firmen-API live ist:
- **Jede AI-Function loggt Cost** in eine neue Tabelle (z. B. `ai_invocations`):
  ```sql
  CREATE TABLE ai_invocations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    function_slug TEXT NOT NULL,
    triggered_by_user UUID,         -- nullable für Cron
    input_tokens INTEGER,
    output_tokens INTEGER,
    estimated_cost_usd NUMERIC(10, 6),
    success BOOLEAN,
    invoked_at TIMESTAMPTZ DEFAULT NOW()
  );
  ```
- **Wöchentlicher Review:** `SUM(estimated_cost_usd) FROM ai_invocations WHERE invoked_at > now() - interval '7 days'`
- **Hard Cap pro Function:** Wenn weekly cost >Threshold → Function temporarily disabled

### 8.3 Cost-Schätz-Tabelle (für Planung)

Annahme: Claude Haiku 4.5 = ~$0.25/M input, ~$1.25/M output

| Function | Avg Input | Avg Output | Cost pro Call |
|---|---|---|---|
| analyze-applicant | ~500 tok | ~300 tok | ~$0.001 |
| jarvis-chat | ~1500 tok | ~500 tok | ~$0.002 |
| daily-briefing | ~2000 tok | ~800 tok | ~$0.002 |
| analyze-finance-mail | ~300 tok | ~150 tok | ~$0.001 |
| emma-work-plan | ~1000 tok | ~500 tok | ~$0.002 |
| academy-chat | ~1000 tok | ~500 tok | ~$0.002 |

**Hart-Limes-Volumen Schätzung (alle aktiv):**
- analyze-applicant: ~50/Monat (Bewerber) × $0.001 = $0.05
- jarvis-chat: ~100/Woche × Luis = $0.20/Woche = $0.80/Monat
- daily-briefing: 30/Monat (1/Tag) = $0.06
- analyze-finance-mail: ~3000 Mails/Monat × $0.001 = $3.00
- academy-chat: 11 Interns × ~50 Calls/Monat × $0.002 = $1.10
- emma-work-plan: ~30/Monat = $0.06

**Total Hart Limes Phase 2: ~$5/Monat** — sehr gut. Cost-Risiko liegt aber bei einer einzelnen vergessen Loop / Bug, der z. B. analyze-finance-mail in 1000-fach feuert.

---

## 9. Phase-2-Activation-Workflow

**Wenn Firmen-API live ist** und ein einzelnes Modul aktiviert werden soll:

```
1. Activation Check
   - Firmen-API Token in integration_secrets?
   - Function-Activation-Trigger erfüllt?
   - Cost-Tracking aktiv?

2. Soft Launch
   - Feature Flag in recruiter_settings.feature_flags oder Env Var
   - Function für 1 User (Luis) aktivieren
   - 48-72h beobachten

3. Item Review (per Doc 7 — Feedback Loop)
   - Output-Qualität prüfen
   - Cost prüfen
   - User-Feedback einholen

4. Decision
   - Scale: aktivieren für mehr User
   - Iterate: anpassen, retest
   - Kill: Function deployed lassen, aber wieder pausieren
```

---

## 10. Decision (per Luis-Regel: Doc endet in Entscheidung)

**Was diese Doc festlegt:**

1. **Phase-1-Default für ALLE 10 AI-Functions:** deployed but not auto-invoked. Auch jarvis-chat (vorher als „live" memorisiert, jetzt korrigiert).

2. **Welle 1 Welle:** Nur **analyze-applicant** ist on-demand aktivierbar (manueller Klick im Frontend), alles andere bleibt inactive. Kein Auto-Trigger.

3. **Phase-2-Activation-Triggers** sind pro Function definiert (siehe §2-7). Jeder Trigger hat 3-4 konkrete Bedingungen, alle müssen erfüllt sein.

4. **Kill Criteria** sind pro Function definiert. Default-Kill-Mechanik: Function deployed lassen, Frontend-Trigger entfernen, kein DB-Schema-Cleanup.

5. **Cost-Tracking ist Phase-2-Pflicht.** Tabelle `ai_invocations` wird in der „Phase 2 Foundation Welle" (NICHT Welle 1) angelegt.

6. **Hart-Limes-Cost-Estimate Phase 2: ~$5/Monat** wenn alles aktiv. Sehr günstig — Risiko liegt bei Bug-Loops, deshalb Hard Caps Pflicht.

7. **Welle 1 enthält KEINE AI-Aktivierung außer optional analyze-applicant manuell.** Item C analyze-applicant Phase-2-Vorbereitung im Welle-1-Plan bedeutet: Doku + Frontend-Vorbereitung, KEIN Auto-Trigger.

---

## 11. Offene Fragen (NICHT blocking, für spätere Verfeinerung)

1. **analyze-applicant Trigger heute:** Wird die Function aktuell von n8n auto-getriggered, oder ist sie schon „pausiert"? Verifizieren via Edge Function Logs (`mcp__supabase__get_logs`).

2. **jarvis-chat Live-Status:** Memory sagt „live", Doc B sagt „deployed". Was ist es konkret? → Test-Aufruf in nächster Session.

3. **academy-chat Token-Tracking:** Warum ist `intern_token_usage` leer? Function läuft nicht ODER Schreiben funktioniert nicht? → Code-Audit in späterer Welle.

4. **Welche Anthropic-Modelle sind in der Edge Function Code hardcoded?** Aktuelle Stichprobe zeigt `claude-haiku-4-5-20251001`. Sind alle Functions auf Haiku, oder gibt es Sonnet/Opus-Calls?

---

**Nächster Schritt:** Doc D (Measurement Layer) — Schema + Outcome-KPIs pro Rolle.
