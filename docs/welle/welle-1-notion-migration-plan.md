# Welle 1 Item 11 — Notion → Business OS Migration Plan

**Erstellt:** 2026-04-11
**Owner:** Luis
**Welle-Item:** Welle 1c Item 11
**Status:** Decision-Doc, kein Build
**Vorgänger:** `data/docs/notion-onboarding-findings.md` (Welle 1a Item 15)

---

## 0. TL;DR Decision

**Notion wird nicht migriert. Notion wird eingefroren.** Bestehende Pages bleiben als Read-Only-Archiv, neue org-relevante Inhalte gehen ab 2026-04-15 ausschließlich in `docs/` (Repo) oder direkt in Business-OS-DB-Tabellen. Lift-and-Shift ist explizit verboten — Migration nur, wenn ein Inhalt einen aktiven Workflow bedient. Per Welle 1a Item 15 ist bewiesen, dass die größten Notion-Cluster (Onboarding) TAS-Legacy sind und keinen Migrationswert haben. Die Annahme „der Rest ist vermutlich genauso" gilt bis das Gegenteil bewiesen ist.

---

## 1. Current Notion Footprint (best-effort Inventory)

⚠️ **Disclaimer:** Diese Inventur ist **partiell**. Eine vollständige Notion-Workspace-Audit (alle Pages lesen, klassifizieren) ist nicht in Welle 1 Scope und wäre selbst ein eigenes Welle-Item (Effort: vermutlich 2-4h Read + 1h Klassifizierung). Wird hier als „Welle X Backlog Candidate" geflaggt.

| Cluster | Bekannte Pages | Status (best-guess) | Tag |
|---|---|---|---|
| **Onboarding-Pages** (TAS-Legacy) | "Onboarding Prozess", "Hiring/Onboarding TAS Notes", "Step-by-Step Bewerber-Pool Strategie", "Onboarding" Container | Audited per Item 15. TAS-spezifisch, in-office, falsche People + Tools | **archive (no action)** |
| **Hiring/Bewerber-Strategy** | „Step-by-Step Strategie Aufbau Bewerber-Pool" (Dez 2025) | Pre-dates Tom als Programme Lead und Academy-Build. Konzeptionell überholt | **archive (no action)** |
| **Ad-hoc Strategy-Notes** | unbekannt — vermutlich verstreute Pages aus 2024-2025 | nicht inventarisiert | **archive (no action), bei Bedarf einzeln re-evaluieren** |
| **Personal Scratchpads** (Luis) | unbekannt — eigene Notion-Workspace-Areas | privat, kein Org-Inhalt | **stays — Personal-Use, nicht Teil dieses Plans** |
| **Finance/Vanessa-Pages** | unbekannt — Vanessa nutzt vermutlich kein Notion, aber unverifiziert | siehe Open Questions | **TBD** |
| **Knowledge-Fragmente** (TAS Tools, Lieferanten, Prozesse) | unbekannt | wahrscheinlich Read-only-Wert für TAS-Historie | **archive (no action)** |

**Lehre aus Item 15:** Die einzige Page, die voll gelesen wurde („Onboarding Prozess"), war zu 0% migrationswürdig. Annahme: das gilt für die meisten anderen Pages auch. Beweislast liegt jetzt bei „warum sollte Page X migriert werden", nicht bei „warum nicht".

---

## 2. Migration-Philosophie

Drei harte Regeln, gelten ab Welle 1c:

### Regel 1 — Don't lift-and-shift legacy

**Neue canonical Quelle = Business OS DB-Tabellen + `docs/intern-academy/` Markdown-Assets + `docs/welle/` Strategie-Docs.** Notion-Inhalte werden NUR migriert, wenn sie einen **aktuellen Workflow bedienen**. Historische Snapshots, alte Strategie-Drafts, TAS-Legacy bleiben dort wo sie sind. Migration auf Verdacht („könnte mal jemand brauchen") ist verboten — sie erzeugt Doppelpflege ohne Nutzerwert.

### Regel 2 — Read-only Archive ist akzeptabel

Alte Notion-Pages müssen **nicht gelöscht** werden. Sie kosten nichts. Sie sind harmlos. „Aufräumen aus Ordentlichkeit" ist kein gültiges Argument für Notion-Cleanup-Effort. Wenn jemand 2027 in eine alte TAS-Page stolpert: gut, soll er. Sie ist als Legacy lesbar.

### Regel 3 — Neue strategische Docs gehen NICHT mehr in Notion

Ab 2026-04-15 ist Notion als Content-Store für org-relevante Inhalte **eingefroren**. Neue Strategie-Docs, Welle-Pläne, Audits, Reviews, Konzepte → `docs/` im Repo (versioniert via git, durch Claude/Sub-Agents les- und schreibbar, durch Verifier-Agent prüfbar). Notion bleibt erlaubt für: persönliche Scratchpads, Einkaufslisten, private Reading-Lists. Sobald es org-relevant wird → Repo.

---

## 3. Per-Content-Type Decision-Matrix

| Content-Type | Wo lebt es heute | Wo soll es leben | Action | Owner | Welle |
|---|---|---|---|---|---|
| Onboarding-Pages (TAS in-office Prozess) | Notion | Notion (read-only Archiv) | keine Migration, keine Löschung | Luis | 1a (done, Item 15) |
| Intern Academy aktuell | DB (`intern_*`) + `docs/intern-academy/` | dort wo es ist | keine Action | Tom + Luis | n/a |
| Hiring-Strategy / Bewerber-Pool-Konzept (Dez 2025) | Notion | Notion (Archiv) | keine Migration | Luis | 1c (this doc) |
| Welle-Pläne + Reviews | `docs/welle/` (Repo) | dort wo sie sind | keine Action | Luis | n/a |
| Foundation Docs (01-07) | `docs/` (Repo) | dort wo sie sind | keine Action | Luis | n/a |
| Brand-Memory + Marketing-Frameworks | `system/memory/work/` (Claude-Code Workspace) | dort wo es ist | keine Action | Luis | n/a |
| Ad-hoc Team-Notes (z.B. alte Mainak-Briefings, Sameer-CS-Notizen) | Notion (vermutlich) | wenn Workflow-relevant: Repo. Sonst Archiv | per Bedarf einzeln entscheiden | Luis | on-demand |
| Personal Scratchpads (Luis) | Notion | bleibt Notion | keine Action | Luis | n/a |
| Finance-Notes (Vanessa-Sphere) | unbekannt — vermutlich keine Notion-Nutzung | TBD | siehe Open Questions | Luis | TBD |
| Lieferanten-/Tool-Knowledge (TAS-Era) | Notion | Notion (Archiv) | keine Migration | n/a | n/a |

**Default:** wenn ein Content-Type hier nicht aufgeführt ist und Notion-bezogen ist → **Default = stays in Notion as archive, no action**. Migration ist die Ausnahme, nicht die Regel.

---

## 4. Cutoff-Date

**Vorgeschlagener Soft-Cutoff: 2026-04-15** (4 Tage nach Erstellung dieses Docs).

Nach diesem Datum gilt:
- **Neue org-relevante Inhalte** (Strategie, Konzepte, Reviews, Doku, Prozesse, Team-Briefings, Recruiting-Notes, etc.) gehen in `docs/` oder direkt in DB
- **Notion-Pages werden nicht mehr aktualisiert** für org-Use-Cases
- **Personal Scratchpads** (Luis privat) bleiben in Notion erlaubt — keine Domain-Crosse

**Soft enforcement, nicht hard.** Heißt konkret:
- Kein Tool blockiert Notion
- Kein Cron prüft auf Page-Updates
- Wenn Luis in einer hektischen Session eine Notion-Page anlegt → kein Drama, beim nächsten Sweep wird sie ins Repo überführt
- Re-Evaluation nach 30 Tagen (2026-05-15): wurde der Cutoff gehalten? Falls nein → ehrlich aufschreiben warum, Regel anpassen

---

## 5. Open Questions (Luis-Decision nötig)

1. **Finance/Vanessa-Pages:** Gibt es Notion-Pages im Finance-Bereich, die wir nicht kennen? Vanessa nutzt vermutlich Drive + Sheets, aber unverifiziert. Ein 5-min Check (Frage an Vanessa via WhatsApp) würde Klarheit schaffen.
2. **TAS-Notion-Workspace als Ganzes:** Soll der komplette TAS-Notion-Workspace als zip-Export archiviert werden (für Compliance / falls Notion mal teurer wird oder Account-Stress entsteht)? Ein einmaliger Export wäre 5-10 min und ist Versicherung gegen Lock-in.
3. **Volle Notion-Audit als Welle X Item:** Soll eine vollständige Workspace-Audit (read all pages, klassifizieren nach Decision-Matrix) als eigenständiges Welle-Item geplant werden? Effort: 2-4h. Nutzen: vermutlich gering (Item 15 hat gezeigt, dass die größten Cluster Legacy sind), aber Vollständigkeit ist nice-to-have.

---

## 6. Decision

**Was dieses Doc festlegt:**

1. **Notion ist eingefroren ab 2026-04-15.** Soft cutoff, keine Tools, keine Crons, nur Disziplin.
2. **Keine Migration.** Default-Action für jede Notion-Page = „stays as archive, no action". Migration ist die Ausnahme und braucht explizite Begründung pro Page.
3. **Neue Strategie-Inhalte gehen ausschließlich in `docs/` oder DB.** Repo ist canonical, Notion ist Archiv.
4. **Volle Notion-Workspace-Audit ist out-of-scope für Welle 1.** Optional als Welle-X-Item, niedrige Priorität.
5. **TAS-Workspace zip-Export** und **Finance-Notion-Check** sind die zwei einzigen offenen Aktionen — beide in §5 als Open Questions, beide nicht-blocking.
6. **Re-Evaluation nach 30 Tagen** (2026-05-15) ob der Cutoff gehalten wurde. Wenn ja → Regel zementieren. Wenn nein → ehrlich aufschreiben warum + Regel anpassen.

**Welle 1 Item 11 ✅ done mit diesem Doc.** Kein Build, keine Migration, keine Folge-Items. Pure Decision.
