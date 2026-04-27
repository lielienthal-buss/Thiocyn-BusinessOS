# Process Documentation (BPMN)

Zentrale Stelle für alle Kern-Prozesse von HSB / Business OS in **BPMN 2.0** Notation.

## Warum BPMN

- Eindeutig, visuell, lingua franca in Ops-/Consulting-Welt
- Übersetzbar zu SOPs, Hiring-Docs, Audits
- Später productizable: ein BPMN-Flow = ein Feature-Kandidat für den B2B-Playbook-Verkauf

## Prozess-Liste

| Prozess | Status | Datei |
|---|---|---|
| Intern Onboarding (Day 0 bis Ende Woche 1) | ✅ Modelliert | [intern-onboarding.md](./intern-onboarding.md) + [.bpmn](./intern-onboarding.bpmn) + [.png](./intern-onboarding.png) |
| Ambassador Application Pipeline | 🟡 Geplant | `ambassador-application.md` |
| M&A Inquiry → Closing | 🟡 Geplant | `ma-pipeline.md` |
| Content-Calendar Approval (Brief → Published) | 🟡 Geplant | `content-approval.md` |
| Monatliches Finance-Reporting | 🟡 Geplant | `finance-monthly-close.md` |
| PayPal-Dispute-Handling | 🟡 Geplant | `paypal-dispute.md` |

## Format

Jeder Prozess liegt als Markdown-Doc mit:
1. **Kontext** (wer nutzt, warum, wann)
2. **BPMN-Diagramm** (`.bpmn` + exportiertes `.png` daneben)
3. **Swimlanes** (Rollen: Intern · Buddy · Lead · System · Peter)
4. **Event-Typen** (Start, Tasks, Gateways, End)
5. **Exceptions** (was wenn X schiefgeht)
6. **Backed by in Business OS** (welche Tabellen / Components / Edge-Funcs implementieren das)

## Tooling

- Modellierung: [bpmn.io](https://bpmn.io) (kostenlos, Browser-basiert, exportiert `.bpmn` + `.png`)
- Alternativ: Lucidchart BPMN-Shapes, Camunda Modeler (Desktop)
- Referenz-Notation: `docs/processes/_notation-cheatsheet.md` (TODO)

## Wie neuen Prozess anlegen

1. Flow in bpmn.io modellieren
2. Export als `.bpmn` (Source) + `.png` (Preview)
3. Markdown-Doc mit den 6 Standardsektionen schreiben
4. In obige Liste eintragen
5. Commit

## Quellen / Eigene BPMN-Grundlagen

Luis hat BPMN im SS 2023 (HS Flensburg, BIV) gelernt. Unterlagen liegen unter:
`~/Documents/Uni generell/Uni SS 2023/BIV/` (Grundlagen + Teil 2 + Klausur-Notizen).

## Verknüpft mit

- [../intern-academy/](../intern-academy/)
- [../ui-benchmark/README.md](../ui-benchmark/README.md)
