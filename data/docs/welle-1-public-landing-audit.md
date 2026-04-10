# Public Landing Audit — Welle 1b Item 10

**Datum:** 2026-04-10
**Owner:** Luis (Read-only Audit)
**Welle-Item:** Welle 1b Item 10
**Done-Criteria:** Doc mit Conversion-Rate-Baseline + Issues-Liste

---

## 0. TL;DR

**Public Landing = `ApplicationForm.tsx`** (4-Step Multi-Step Form mit Big Five, Project Areas, Turnstile Captcha).

**Conversion Baseline (limited data):** Nur **9 sessions** in `form_events` getrackt seit 2026-03-24 (Tracking-Aktivierung). Statistisch zu klein für robuste Conversion-Rates, aber Funnel-Shape ist sichtbar.

**Größtes Issue:** Conversion-Tracking erfasst nur 9 Sessions in 17 Tagen — Visitor-Volumen ist niedrig oder Tracking liefer nicht. **Tracking-Health-Check** sollte Welle 1c oder Welle 2 Action sein.

---

## 1. Form-Architektur

**Datei:** `components/ApplicationForm.tsx`
**Steps:**
1. **Basics** — Full name, Email
2. **Experience** — LinkedIn URL, Project highlight (500 char max)
3. **Project Preferences** — Multi-select project areas
4. **Personality** — Big Five inventory (BFI)
+ Final: Turnstile Captcha + Submit

**Tracking:** `lib/analytics.ts` schreibt in `form_events` Tabelle (`form_step_reached`, `form_step_completed`, `form_submission`)

**Submit Path:** `submitApplicationAction` → Supabase RPC `submit_application` (sichere Function mit Captcha-Verify)

---

## 2. Conversion Baseline (limited data, 2026-03-24 only)

### 2.1 Funnel — Step Reached vs Completed

| Step | Name | Reached | Completed | Step Drop-off |
|---|---|---|---|---|
| 1 | Basics | 1 | 4 | n/a (more completed than reached — events fired before tracking landed?) |
| 2 | Experience | 4 | 3 | -25% |
| 3 | Project Preferences | 2 | 2 | 0% |
| 4 | Personality | 2 | — (not yet tracked as completed) | n/a |

**Note:** Reached/Completed mismatch in Step 1 ist verdächtig. Möglich:
- Tracking-Aktivierung nach erstem Page-Load (Sessions starten ohne `form_step_reached` event)
- Browser-Reloads erstellen neue Sessions ohne Step-1-Tracking
- analytics.ts Bug

### 2.2 Submission Tracking

**`form_submission` events: 0 in 17 Tagen.** Entweder:
- Niemand hat erfolgreich submitted seit 24.03. (sehr wahrscheinlich, weil applications-Tabelle nach Item 1 cleanup nur 1 row hat — Mainak hired 2026-02-14, lange vor Tracking-Aktivierung)
- Tracking-Submission-Event ist broken (event wird via `trackSubmission(success, error)` aufgerufen)

### 2.3 Visitor-Volumen-Schätzung

**Total distinct sessions:** vermutlich ≤9 (basierend auf 9 Step-1-Reached events). **17 Tage × ~0.5 Bewerber/Tag** ist **sehr niedrig** für ein "Take A Shot Hiring Tool" / "Thiocyn Business OS Hiring".

**Hypothesen:**
1. Form ist nicht prominent verlinkt (kein Footer-Link auf Brand-Sites?)
2. Form ist nicht in Job-Posting-Funnel eingebettet
3. Tracking ist broken (nur partial Events fließen)

---

## 3. Issues-Liste

### 3.1 P1 — Critical (Welle 1c oder Welle 2 fix)

**I-1: Tracking-Health unklar**
- **Symptom:** Reached/Completed Mismatch in Step 1 (1 reached, 4 completed)
- **Symptom:** 0 form_submission Events in 17 Tagen
- **Action:** Tracking-Audit (vermutlich `lib/analytics.ts` `trackEvent` silent-fail oder sessionStorage-Mismatch). Test mit Browser-DevTools.

**I-2: Visitor-Volumen ist katastrophal niedrig**
- **Symptom:** ~9 Form-Sessions in 17 Tagen
- **Action:** Brand-Site-Audit (sind die Form-Links überhaupt prominent? Footer? Career-Page?)
- **Note:** Out-of-scope für Welle 1, aber kritisch für Layer-2 Activation Trigger

### 3.2 P2 — Important (Welle 1c oder später)

**I-3: 4 Steps ist viel für Bewerbungs-Funnel**
- BFI Personality Test (Step 4) ist die heftigste Hürde
- Alternative: BFI optional / nach Hire / als Welcome-Mail
- **Trade-off:** BFI ist Doc 05 §2.5 Fallback-Quelle für AI-Verdict (Neuroticism > 80% = Auto-Reject)
- **Decision:** BFI bleibt, aber Onboarding-Optimierung in Welle 2

**I-4: project_highlight 500 char max**
- Möglicherweise zu kurz für aussagekräftige Antworten
- **Action:** Mainak fragen ob 500 ausreichen oder ob 1000 besser wäre

**I-5: linkedin_url hat keine Server-Side-Validation**
- Per Welle 1a Item 3 Fix: Frontend zeigt `https://` Auto-Prefix bei Display
- Submit nimmt aber `www.linkedin.com/...` ohne Prefix an
- **Action:** Optionale Migration: bei Submit auch `https://` prependen + speichern

### 3.3 P3 — Cosmetic (Backlog)

**I-6: Hardcoded `STEP_NAMES` Array** in ApplicationForm.tsx — kein i18n.
**I-7: Email-Regex einfach** (`^[^\s@]+@[^\s@]+\.[^\s@]+$`) — akzeptiert `a@b.c`, was technisch gültig aber wenig hilfreich ist.
**I-8: Turnstile Captcha nur am Ende** — Bot kann Steps 1-3 durchfüllen ohne Captcha-Trigger.

---

## 4. Was läuft gut

- ✅ Multi-Step UX reduziert Cognitive Load
- ✅ Big Five Inventory liefert hochwertiges Signal für Hiring
- ✅ Turnstile Captcha + Server-Side `submit_application` RPC = Spam-Resistenz
- ✅ Tracking via `form_events` ist GDPR-clean (sessionStorage, kein Cookie)
- ✅ i18n via `useLang` + `translations` (DE/EN)
- ✅ Progressive Validation (LinkedIn URL prüft `startsWith('http')` per Welle 1a Item 3 Fix)

---

## 5. Decision

**Public Landing ist funktional, aber Tracking + Visitor-Volumen sind blind spots.**

**Welle 1 Action:** Keine Code-Changes (Item 10 ist read-only Doc-Item).

**Welle 1c Recommendation:**
- **Tracking-Audit** (~30 min): Browser-DevTools-Test, prüfen ob Events wirklich fließen
- Falls Tracking broken → Quick-Fix in Welle 1c (1-line in `lib/analytics.ts` vermutlich)

**Welle 2+ Recommendations:**
- Visitor-Volumen-Audit (Brand-Sites: wo ist Form verlinkt?)
- BFI Personality Test als optionalen Step 4 (oder als Welcome-Mail)
- Multi-Brand Form (per `brands` Tabelle parametrisiert) für Layer 2

---

## 6. Outcome-Metriken (für os_metrics, manual capture)

```sql
-- Phase-1 Baselines (limited data)
INSERT INTO os_metrics (metric_layer, metric_name, module, role, value, unit, item_ref, notes) VALUES
  ('outcome', 'public_form_sessions_total', 'lead_capture', 'os', 9, 'count', 'welle_1_item_10', 'audit_2026-04-10:since_2026-03-24'),
  ('outcome', 'public_form_step1_to_step2_dropoff_pct', 'lead_capture', 'os', 25, 'percent', 'welle_1_item_10', 'audit_2026-04-10:limited_sample_n_4'),
  ('outcome', 'public_form_submissions_total', 'lead_capture', 'os', 0, 'count', 'welle_1_item_10', 'audit_2026-04-10:tracking_health_unclear');
```

**Wird in Welle-1-Wave-Review eingefügt** (nicht jetzt, weil Item 10 selbst keine Build-Aktion ist).

---

**Welle 1b Item 10 ✅ done.**
