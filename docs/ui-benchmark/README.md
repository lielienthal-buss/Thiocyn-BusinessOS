# UI Benchmark Sprint

Systematischer Prozess, um von besseren Tools zu lernen, **ohne Business OS zur Feature-Müllhalde zu machen**.

## Grund-Prinzip

Business OS ist opinionated für HSB — wir kopieren keine Sections, wir kopieren **Interaction-Patterns + UX-Shortcuts**, die unsere User schneller machen. Jede Adaption muss in unser Design-System übersetzt werden (HSB Teal/Coral, Typography, motion rules).

## Copy-Worthy vs. Bloat-Trap

| Copy-worthy | Bloat-Trap (weglassen!) |
|---|---|
| UX-Patterns (Kanban-Drag, Inline-Edit, Command-Palette) | Ganze Feature-Sections ohne HSB-Need |
| Datenmodell-Shortcuts (Notion Relations, Linear Cycles) | Multi-Tenant-Gedöns (wir sind single-tenant) |
| Keyboard-Shortcuts + Accessibility | White-Label-UIs, die wir nicht brauchen |
| Permission-Matrix-Designs (Linear rollenbasiert) | Marketplace / Plugin-Stores |
| Onboarding-Flows (Linear, Arc) | Komplexe Automation-Builder (haben Edge Functions + Make) |

## Section-Map: Wo lernen wir von wem

| Business-OS-Section | Benchmark-Tool | Zu stehlen |
|---|---|---|
| Home / Dashboard | Linear, Height | Command-Palette ⌘K, Smart-Filter, Inline-Edit |
| Marketing Cockpit | Supermetrics, Triple Whale | KPI-Cards mit Sparklines, Period-Comparison |
| Content Calendar | Later, Planable | Multi-Brand-Kalender-View, Drag-to-Schedule |
| Recruiting | Ashby, Greenhouse | Custom-Scorecards, Interview-Kits, SLA-Alerts |
| Ambassador | GRIN, Aspire | Creator-Scoring, Relationship-Warmth, Payout-Pipeline |
| Academy | 15Five, Lattice | 1:1-Agendas, Weekly Check-ins, Kudos-Feed |
| Finance | Pleo, Qonto | Receipt-Upload mobile-first, Auto-Categorization-Preview |
| M&A | Affinity | Relationship-Intelligence, Warmth-Score, Touchpoint-Log |

## Sprint-Prozess (3 Schritte)

### 1. Scouting (30min, monatlich)

- Öffne 2–3 Tools aus der Section-Map (Trial-Accounts reichen)
- Screenshot 3 Patterns pro Tool
- Ablage: `docs/ui-benchmark/<yyyy-mm>/<tool>-<pattern>.md`
- Template:

```markdown
# <Tool> — <Pattern-Name>

![screenshot](./screenshot.png)

**Was macht das besser:** <1 Satz>
**Warum relevant für HSB:** <1 Satz>
**Implementations-Aufwand:** S / M / L
**Priority:** adopt / backlog / skip
```

### 2. Kuration (15min, monatlich mit Matic)

- Screenshots durchgehen
- Je Pattern: `adopt` · `backlog` · `skip`
- Max **1 `adopt` pro Sprint** — sonst Frankenstein-UX
- Restliche `adopt`-Kandidaten → `backlog`

### 3. Adaption (im Sprint)

- 1 Pattern pro Sprint ins Design-System übersetzen (nicht 1:1 klonen)
- Vor Implementation: Quick-Mock in Figma oder direkt in `components/ui-lab/`
- Nach Go-Live: Eintrag in `adopted.md` mit Before/After-Screenshot

## Review-Rhythmus

| Cadence | Wer | Was |
|---|---|---|
| Monatlich | Luis (+ optional Matic) | Scouting + Kuration (45min total) |
| Pro Sprint | Luis oder Dev-Team | 1 Adaption implementieren |
| Quartalsweise | Luis | `adopted.md` Review — was hat gezogen, was nicht |

## Ablage-Struktur

```
docs/ui-benchmark/
  README.md                     ← diese Datei
  adopted.md                    ← Changelog der implementierten Patterns
  backlog.md                    ← kuratierter Stapel für nächste Sprints
  2026-04/                      ← monatliche Scouting-Ordner
    linear-command-palette.md
    ashby-scorecard.md
    ...
```

## Nicht-Ziele

- Wir bauen **kein Tool wie Tool X** nach. Business OS ist vertikal-integriert für HSB.
- Wir **klonen keine UI 1:1** — jedes Pattern wird ins HSB-Design übersetzt.
- Wir **machen kein Feature-Parity-Tracking** gegen Konkurrenten — nur UX-Exzellenz zählt.

## Verknüpft mit

- [tool-analogs (Memory)](~/.claude/projects/-Users-luislielienthal-Desktop-Claude-Code/memory/work/reference_business_os_tool_analogs.md)
- [../intern-academy/program-buildout-roadmap.md](../intern-academy/program-buildout-roadmap.md)
