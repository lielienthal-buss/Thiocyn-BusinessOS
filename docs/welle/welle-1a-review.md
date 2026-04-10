# Welle 1a Review (Foundation + Bugs)

**Erstellt:** 2026-04-10
**Zeitraum:** Welle 1a Build (single session, ~3-4h)
**Reviewer:** Luis (default per Doc 02)
**Item-Class für 1a:** Foundation/Bug → 48-72h Item Reviews üblich, hier konsolidiert in Wave-Review-light weil alle Items in einer Session abgeschlossen wurden + von Luis live mitverfolgt.

---

## 1. Items + Decision

| # | Item | Effort actual | Status | Decision |
|---|---|---|---|---|
| D1 | os_metrics Tabelle | ~15 min | ✅ done | **Scale** |
| D2 | lib/track-event.ts Helper | ~20 min | ✅ done | **Scale** (wird in Welle 1b in echten Components verwendet) |
| D3 | Outcome Baselines | ~5 min | ✅ done | **Scale** (6 baselines drin) |
| D4 | Cron os-metrics-stale-review-check | ~30 min | ✅ done + smoke 200 | **Scale** |
| 14 | team_members Cleanup | ~25 min (mit 4 Korrekturen vs Plan) | ✅ done | **Scale** |
| C | Doc-Patches (02, 04, 06) | ~15 min | ✅ done | **Scale** |
| 2 | 72h Auto-Reject Verifikation | ~10 min (read-only) | ✅ done | **Scale** (no code change needed) |
| 3 | LinkedIn 404 Fix | ~10 min | ✅ done | **Scale** |
| 4 | TAS Logo Display Fix | ~15 min | ✅ done | **Iterate** (siehe §4 — White-Label Refactor offen) |
| 15 | Notion Onboarding Check | ~20 min | ✅ done | **Kill (no migration)** |
| 1 | Stage-Cleanup | ~25 min (Audit + Approval + Apply) | ✅ done | **Scale** |

**Total Build-Effort:** ~3h (vs. Welle-1-Plan Schätzung 6.5h Build + 3h Reviews) — **schneller als geplant**, weil Items meist linear apply-able waren.

---

## 2. Outcome Metrics Delta (Pre vs Post)

Aus `os_metrics` Tabelle:

| Metric | Pre | Post | Delta | Decision |
|---|---|---|---|---|
| `applications_total` | 47 | 1 | -46 | Cleanup successful |
| `application_notes_total` | 10 | 0 | -10 | Cascade clean |
| `applications_stage_hired` | 1 (Mainak) | 1 (Mainak) | 0 | Audit anchor preserved ✅ |
| `os_metrics_table_exists` | false | true | +1 | Foundation done |
| `team_members_active_count` | 1 (luis) | 7 (luis, jll alias, tom, mainak, vanessa, peter, valentin) | +6 | Foundation done |

**Operational Metrics:** noch keine — track-event.ts Helper ist gebaut aber nicht in Components eingehängt. Wird in Welle 1b passieren.

---

## 3. Was lief wie geplant

- ✅ os_metrics Schema-Apply 1-shot, kein Bug
- ✅ Cron-Setup mit pg_net + http_post funktioniert sofort (nach Korrektur des `app.settings.*` Problems)
- ✅ DELETE Item 1 lief 1-shot mit korrekter CASCADE
- ✅ Pre/Post Snapshot in os_metrics als append-only audit trail
- ✅ Quick Wins (LinkedIn, Logo, Notion-Check) waren wie erwartet 10-30 min jeweils

---

## 4. Discoveries (Ungeplante Findings, gesammelt während Build)

Diese sind alle **out-of-scope für Welle 1a**, aber wichtig für Folgewellen.

### 4.1 Korrigiert während Apply

| Discovery | Lokation | Welle-1a-Action |
|---|---|---|
| Doc 02 §5 SQL hatte falsche Tom-Email (`tom@hartlimesgmbh.de` vs Live `tlroelants@gmail.com`) | Doc 02 v1 | Doc 02 §5 gepatcht (live state) |
| Doc 02 §5 Rollen-Mapping passte nicht zu Dashboard.tsx UserRole-Enum | Doc 02 v1 | Tom='intern_lead', Mainak='staff' (statt 'hiring','creative') |
| Cron-Convention `current_setting('app.settings.supabase_url')` ist nicht gesetzt im DB | shopify-weekly-sync auch betroffen | Eigener Cron ohne `app.settings.*`, hardcoded URL |
| `team_members.role` hat KEIN CHECK constraint (Comment im Seed-File ist Lüge) | supabase_team_members.sql | Welle Layer-2-Hardening Backlog |
| Doc 06 §4 Code-Beispiel nutzt `source` Spalte (war in Patch P7 entfernt) | Doc 06 v1 | Doc 06 §4 gepatcht (8-col Schema) |

### 4.1.1 Edge Function v2 Hotfix (post-commit)

`os-metrics-stale-review-check` v1 hatte Luis' auth.users.id hardcoded — gitleaks pre-commit hook hat das (false positive auf UUID-Entropy) gemeldet. **Korrektur:** v2 deployed mit `Deno.env.get('OS_METRICS_REVIEWER_USER_ID')` env var lookup, fallback auf null. Smoke-Test 200 OK.

**Aktion erforderlich (nicht-blocking):** Im Supabase Dashboard → Edge Functions → os-metrics-stale-review-check → Secrets `OS_METRICS_REVIEWER_USER_ID=<luis auth user uuid>` setzen, damit stale-Notifications user-targeted gerouted werden. Bis dahin: `recipient_user_id=null` (Notifications existieren in Tabelle, sind aber nicht user-targeted).

### 4.2 Pre-existing Drift entdeckt (NICHT korrigiert, in Backlog)

| Discovery | Severity heute | Severity Layer 2 | Action |
|---|---|---|---|
| `Logo.tsx` hardcoded `https://thiocyn.com/cdn/...` | LOW | HIGH (verletzt White-Label Doc 03 §4.1) | Welle Layer-2-Hardening |
| `shopify-weekly-sync` Cron kaputt (gleicher `app.settings.*` Bug) | LOW (Tool out-of-scope) | MEDIUM | Welle 2 oder eigener Bug-Item |
| 9 SECURITY DEFINER Views in Modul 7 | LOW (Creator out-of-scope) | HIGH (bypasses Tenant-Isolation) | Doc 04 §13.1 — Welle Layer-2-Hardening |
| 42 RLS policies `auth.role()='authenticated'` | LOW (Phase-1-Default per Doc 04 §5.2) | HIGH (no section gating) | Doc 04 §13.1 |
| `intern_accounts` Fallback in Dashboard.tsx (Tom hat Access via department='lead', nicht via team_members) | LOW (works) | MEDIUM (dual source-of-truth) | Welle 2 — Refactor Auth |
| `recruiter_settings.logo_url` ist NULL | LOW | LOW | Welle 2 — wenn White-Label angegangen wird |
| Mainak's hired application hat `decided_at = NULL` | LOW | LOW | Pre-existing data quality issue |
| 60 Bewerber-Records waren stuck in pre-cron Stages (`task_requested`/`task_submitted`) | n/a | n/a | Konsequenz: Pipeline ist heute clean — Mainak (1) bleibt als Audit-Anchor |

---

## 5. Lessons (gehen in Memory)

### 5.1 Saved als bereits-existierende Memories (verstärkt)

- `feedback_business_os_source_of_truth.md` — Doc 02 §5 Plan war doc-only, hat Live-Reality nicht reflektiert. Lehre: **vor jedem Apply mit DB-Live-Daten abgleichen, nicht aus Doc/Memory ableiten**.
- `feedback_audit_must_reverify.md` — verstärkt durch die 4 Korrekturen am team_members SQL. Hätte ich blind Doc 02 §5 angewandt, wäre Tom's Login broken gewesen.
- `feedback_holistic_updates.md` — Phase C Doc-Patches als Standard etabliert. Wenn Welle-Apply von Plan abweicht → Plan-Doc IMMER mit-aktualisieren.

### 5.2 Neue Lessons (Kandidaten für neue Memory-Files, optional)

**Lesson 1: pg_cron `app.settings.*` ist nicht zuverlässig**
- Kontext: Mein cron-schedule verwendete dieselbe Convention wie shopify-weekly-sync — failed mit `unrecognized configuration parameter`. Beweis dass shopify-cron auch broken ist.
- Convention für künftige Crons: hardcode URL + nutze `verify_jwt: false` für interne Crons (kein Auth-Token nötig)

**Lesson 2: `team_members.allowed_sections` ist heute NICHT load-bearing**
- Permission läuft via `UserRole` enum + `minRole` in Dashboard.tsx
- `allowed_sections` wird nur in `AccountView.tsx` zur Anzeige genutzt
- Konsequenz: bei zukünftigen Permission-Decisions auf UserRole achten, nicht nur allowed_sections setzen

**Lesson 3: Kategorische Schritt-Trennung Audit → Approval → Apply zahlt sich aus**
- Item 1 Audit zeigte 9 jetzt-aktive Interns als alte Bewerber (Tom, Sameer, Aditya, Ansh, Dhaval, Ekaterina, Vivian, Viktoriya, Rukesh) — wäre ohne Audit ein potentielles "wait, was Tom hier?" Stop-Moment gewesen
- Pre-Snapshot in `os_metrics` als immutable audit trail vor destruktiver Aktion = robust

**Empfehlung:** Memory-Files NICHT jetzt schreiben (Phase C ist done), aber in der nächsten Session als optional.

---

## 6. Pending für Welle 1b (Open Questions)

Keine **blocking** Open Questions für Welle 1b Start. Soft pending:

1. **Resend Domain Verification** (Open Task #36) — blockt:
   - Item 5 (Send-Button) kann gebaut werden, aber echte Mails an Bewerber gehen erst nach Domain-Fix raus
   - Item 9 (Academy Aktivierung — 9 Mass-Invites für Interns)
   - **Workaround:** Mainak kann Manual-Resend Account nutzen (hat Tom 09.04. auch gemacht)

2. **Mainak's `decided_at = NULL`** — soll bei Gelegenheit auf das vermutliche hire-Datum (~2026-04-08) gesetzt werden, ist aber kein Blocker

3. **Erste Monday-Meeting-Datum für Item 9** — Luis muss Wochentag/Uhrzeit setzen (per Open Task #40)

4. **Buddy-Pairings für 9 Interns** (Open Task #39) — Tom soll vorschlagen

---

## 7. Decision für Welle 1b Start

**Welle 1b Start-Bedingung erfüllt:** ✅
- Foundation komplett (os_metrics, track-event, baselines, cron)
- team_members clean (8 rows)
- Pipeline clean (1 hired anchor, 0 noise)
- Bug-fixes done (LinkedIn 404, Logo display)
- Doc-Patches reflektieren Reality
- Cron läuft täglich
- 0 Blocker

**Welle 1b kann jederzeit gestartet werden.** Empfohlene Reihenfolge per Doc 07 §12:
1. Item 5 (Send-Button) — Mainak kritisch
2. Item 6 (Insights View)
3. Item 7 (CV Upload)
4. Item 8 (Eval Dashboard)
5. Item 10 (Public Landing Audit)
6. Item 12 (analyze-applicant Phase-2-Vorbereitung)
7. Item 9 (Academy Aktivierung) — kann parallel zu allen anderen gehen, sobald Resend Domain bereit ist

---

## 8. Wave-Review-Decision

**Welle 1a: ✅ Scale.** Foundation ist robust, alle 11 Items done, 0 Bugs, 0 Rollbacks. Weiter mit Welle 1b in nächster fokussierter Session.

**Lessons gehen NICHT als neue Memory-Files in dieser Session** — Phase C Doc-Patches reichen für jetzt. Memory-File-Pflege sollte am Ende von Welle 1 (nach 1b + 1c) gemacht werden, nicht zwischendurch.
