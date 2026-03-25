# Business OS — Concept Document
**Hart Limes GmbH | Version 1.0 | 2026-03-23**

---

## Was ist das Business OS?

Das Business OS ist die zentrale Schaltzentrale für Hart Limes GmbH. Es ist der einzige Ort, an dem alle Tools, Daten, Prozesse und Agenten zusammenlaufen — die Schnittstelle zwischen Mensch und Computer.

Kein Tab-Switching zwischen Tools. Kein Copy-Paste zwischen Systemen. Kein manuelles Tracking.

Du öffnest das Dashboard. Das ist alles.

---

## Für wen?

| Nutzer | Rolle | Zugriff |
|---|---|---|
| Luis (Founders Associate) | Owner | Alles — Entscheidungen, Delegation, Übersicht |
| Peter Hart (MD) | Admin | Strategischer Überblick, Finance, Brand-Status |
| Valentin (Dev) | Admin | Tech-Setup, Deployment, Konfiguration |
| Interns (11 aktiv) | Intern | Tasks, Standup, Academy |
| Vanessa (Finance) | Member | Disputes, Rechnungen, Mahnungen |

---

## Die 6 Brands

| Brand | Kategorie | Status |
|---|---|---|
| Thiocyn | Hair Care (DE + US) | Aktiv — Priorität |
| Take A Shot | Eyewear / Outdoor | Aktiv — Trust-Rebuilding |
| Dr. Severin | Premium Skincare | Aktiv |
| Paigh | Fair Fashion | Aktiv |
| Wristr | Smartwatch Bands | Aktiv — Reactivation |
| Timber & John | Naturmode | Pausiert |

---

## Was das OS heute kann

**Hiring** — ATS von Bewerbung bis Hire. AI-Scoring automatisch. Kanban, Work Sample, Onboarding.

**Team & Tasks** — Private Tasks (Luis) und Team Tasks (Interns). Performance Scoring: Efficiency × Quality × Volume × Impact.

**Finance** — Disputes, Rechnungen, Mahnungen. Neue Disputes kommen automatisch per Webhook.

**Marketing** — Brand Status, Content Playbook, SOP-Tracker, Posts Tracker. Pro Brand filterbar.

**Customer Support** — Übersicht, Eskalations-Prozess, Paigh-Integration geplant.

**E-Commerce** — Struktur bereit. Live-Daten nach Shopify-Sync.

**Analytics** — Struktur bereit. Live-Daten nach Meta Ads Sync.

**Intern Academy** — Lernbereich mit AI-Chat (budget-controlled per Intern).

**Compliance** — ISO 9001/27001/31000/14001/45001/50001 Layer in Datenbank.

---

## Automatisierung (n8n — 8 Workflows)

| Was | Trigger | Ergebnis |
|---|---|---|
| Shopify Sync | Täglich 02:00 | Live-Revenue aller 6 Brands im Dashboard |
| Bewerbung AI-Score | Bei Eingang | Automatisches Rating 0–100 ohne manuellen Aufwand |
| Task-Delegation Mail | Bei Zuweisung | Intern wird sofort per Mail informiert |
| Overdue Reminder | Mo–Fr 17:00 | Überfällige Tasks → automatische Erinnerung |
| Dispute Triage | Bei Eingang | Sofort in DB + Vanessa+Luis informiert |
| Meta Ads Snapshot | Täglich 06:00 | ROAS, Spend, CPM im Dashboard |
| Standup-Generator | Montag 10:50 | Vorlage fertig vor dem Meeting |
| Rechnungs-Intake | Bei Eingang | Nichts geht verloren, alles kategorisiert |

---

## Compliance Framework

Das OS ist ISO-aligned gebaut — nicht als Bürokratie, sondern als strukturelles Framework:

| Standard | Kern | Abgedeckt durch |
|---|---|---|
| ISO 9001 | Qualitätsmanagement | Prozess-Ausführungen, Non-Conformances, Korrekturmaßnahmen |
| ISO 27001 | Informationssicherheit | Risk Register, Security Incidents, Rollen + Zugriffsrechte |
| ISO 31000 | Risikomanagement | Business Risks (operativ, finanziell, reputativ) |
| ISO 14001 | Umweltmanagement | CO2-Tracking per Brand, Nachhaltigkeitsinitiativen |
| ISO 45001 | Arbeitssicherheit | Wellbeing Check-ins, Workplace Incidents |
| ISO 50001 | Ressourcenmanagement | API-Kosten, Digital Resource Tracking |

---

## White-Label Potential

Das OS ist als Template gebaut:
- Company Name dynamisch aus Datenbank
- Brand-Konfiguration per Admin
- Beliebige Brands, beliebige Anzahl
- ISO-Compliance ready out of the box

**Positionierung:** ISO-aligned Agentic Operating System for DTC brands.

---

## Roadmap

### Phase 1 — Fundament ✅
Dashboard, alle Views, Task-System, Hiring, Intern-Management, Performance Scoring, ISO Compliance Layer, 8 Automation-Workflows, Brand Architecture, Knowledge Base, SOPs kodiert.

### Phase 2 — Live Data (next)
Shopify + Meta Sync aktivieren. E-Commerce + Analytics Views mit Echtdaten befüllen. Knowledge Base + ISO Views im Dashboard bauen.

### Phase 3 — Agent Integration
Jarvis direkt im Dashboard. Kontextbewusster Chat pro Section. Background Agents. Notification Feed.

### Phase 4 — Persistent Jarvis
Railway Server. WebSocket. Memory zwischen Sessions. Command Bar (⌘K).

---

*Wird nach jeder Bausession aktualisiert.*
