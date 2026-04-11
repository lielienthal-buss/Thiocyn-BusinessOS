# Welle 1 Item 13 — Paigh Sample Tracking Konzept

**Erstellt:** 2026-04-11
**Owner:** Luis
**Welle-Item:** Welle 1c Item 13
**Status:** Concept-Doc + Schema-Vorschlag, **KEIN Build in Welle 1**
**Build-Kandidat:** Welle 2 oder Welle 3

---

## 0. TL;DR

Konzept für ein Sample-Tracking-System bei Paigh: outbound Versand an Influencer/UGC/Ambassadors, **inventory-aware Sample-Auswahl** (slow-moving SKUs als Samples raus → Kapital rolliert schneller), und Returns-Tracking nur für Marketing-Domain (CS-Returns sind separater Domain). Vier Tabellen, ein Inventory-Signal-View, vier Frontend-Views. Build erst nach Klärung der Open Questions in §8 — die wichtigste: welche Inventory-Quelle füttert das Signal-Logic.

---

## 1. Problem-Framing

Drei verschränkte Probleme, die heute bei Paigh unstrukturiert nebeneinander laufen:

### 1.1 Outbound Sample Shipments

Paigh verschickt regelmäßig Samples an Influencer, UGC-Freelancer und Ambassadors. Heute: kein zentrales Tracking. Wer hat was wann bekommen? Welche Tracking-Nummer? Hat der Creator gepostet? Ist das Paket angekommen? → alles in WhatsApp-Threads, Notion-Snippets, Sheets-Tabs verstreut. Ergebnis: Doppelversand, vergessene Follow-ups, kein Lerneffekt zwischen Kampagnen.

### 1.2 Inventory-aware Sample Selection (das eigentliche Big Win)

**Kern-Insight von Luis:** Sample-Tracking ist nicht (nur) Marketing — es ist **Working-Capital-Optimierung verkleidet als Marketing**.

Logik: Slow-moving Stock liegt im Lager → bindet Kapital. Wenn dieser SKU stattdessen als Sample an einen Creator rausgeht, der darüber postet, passieren zwei Dinge gleichzeitig:
1. **Lager rolliert** — toter SKU wird aktiv abgebaut (auch wenn es nur 1-3 Units sind, summiert sich)
2. **Brand Reach** — der Creator-Post zieht Traffic, oft auf den genau gleichen SKU, der jetzt im Spotlight steht

Doppelter Effekt: Kapital-Velocity ↑ + organische Reach ↑. Schneller Lager-Durchlauf = mehr Cash-Cycles pro Jahr = mehr Re-Investierbarkeit = Wachstum.

Heute: Sample-Auswahl passiert nach „was hat der Creator gefragt" oder „was ist gerade Hero-Produkt". Kein System sagt „diese 5 SKUs sind ripe for sample-out". Das ist genau das Stück, das die größte Hebelwirkung hat.

### 1.3 Returns-Tracking — Domain-Split

**Wichtig:** „Returns" ist NICHT eindeutig. Zwei Domänen, die nicht vermischt werden dürfen:

- **Marketing-Returns:** Sample geht raus → Creator postet nicht / ghostet / schickt zurück. Das ist eine Marketing-Performance-Metrik (Sample-CAC, Creator-Reliability-Score). Gehört in dieses System.
- **CS-Returns:** Normaler Customer Return aus Online-Shop. Hat eigenen Workflow, eigenes Modul (Sameer-Team / CS-Modul im OS). Gehört NICHT in dieses Sample-System.

Dieses Doc adressiert ausschließlich **Marketing-Returns**. Die CS-Domain wird respektiert und nicht angefasst.

---

## 2. Stakeholder & Domain-Split

| Rolle | Verantwortung | Touchpoint im System |
|---|---|---|
| **Marketing / Creator-Team** (Mainak + ggf. Valentin) | Outbound Sample-Auswahl, Creator-Pairing, Post-Tracking | Sample Outbox + Pipeline-View, manuelles Logging der Posts |
| **Operations / Warehouse** | Welche SKUs sind „ripe for sample-out" (slow-moving, Saison auslaufend, Overstock) | Inventory-Signal-Panel — read-only Empfehlungen |
| **CS-Team** (Sameer) | Customer-Returns aus Shop | **out-of-scope** für dieses Doc — eigenes Modul, eigene Tabelle |
| **Finance** (Luis / Vanessa) | Kosten-Attribution pro Kampagne, Sample-COGS als Marketing-Expense, Budget-Cap pro Monat | Reporting-View (Marketing-Spend Sample-Anteil), Welle-2-Hookup an Finance-Modul |
| **Brand-Lead Paigh** (Luis als FA + ggf. Mainak operativ) | Strategische Sample-Strategie, Saison-Ausrichtung, Budget-Freigabe | Top-Level-Dashboard, monatlicher Cap |

**Domain-Boundary explizit:** Sample-System ist Marketing-Domain. CS-Domain hat ihren eigenen Returns-Workflow, der ist nicht Teil dieses Konzepts.

---

## 3. Schema-Vorschlag (Postgres)

Vier Tabellen + ein optionaler View. Alle in `paigh_*` Namespace, weil brand-spezifisch. Falls später eine zweite Brand das gleiche System will → Refactor zu generischem `samples_*` mit `brand_id` Spalte.

### 3.1 `paigh_samples` — eine Row pro Sample-Versand

| Column | Type | Beschreibung |
|---|---|---|
| `id` | uuid PK | |
| `recipient_type` | text | enum: `influencer`, `ugc`, `ambassador`, `internal`, `press` |
| `recipient_name` | text | „Hannah Müller" / „@hannah.fit" |
| `recipient_handle` | text | Social-Handle wenn vorhanden |
| `recipient_contact` | text | Email oder Tel — für Follow-up |
| `sku` | text | Shopify/Billbee SKU |
| `quantity` | int | meist 1 |
| `brand` | text | hardcoded `paigh` für jetzt, future-proofed |
| `sent_at` | timestamptz | |
| `sent_by` | uuid FK auth.users | wer hat geloggt |
| `tracking_number` | text | nullable |
| `carrier` | text | DHL / DPD / Hermes / etc. |
| `status` | text | enum: `pending`, `sent`, `delivered`, `posted`, `returned`, `lost`, `ghosted` |
| `cost_eur` | numeric(10,2) | COGS + Versand, manuell oder aus inventory-cost-table |
| `campaign_ref` | text | freier String oder FK zu künftiger `campaigns` Tabelle |
| `notes` | text | |
| `created_at` / `updated_at` | timestamptz | |

**Purpose:** Single Source of Truth für jedes physische Sample, das das Lager verlässt. Pipeline-Status getrackt vom Versand bis zum Outcome (post / return / ghost / lost).

**RLS Phase-1:** `auth.role() = 'authenticated'` für SELECT/INSERT/UPDATE. Kein Section-Gating in Phase 1 (Default per Doc 04 §5.2). Layer-2-Hardening: nur Marketing-Role darf INSERT/UPDATE, alle authenticated dürfen SELECT.

### 3.2 `paigh_sample_inventory_signals` — Send-Out-Kandidaten (View oder materialized table)

| Column | Type | Beschreibung |
|---|---|---|
| `sku` | text PK | |
| `current_stock` | int | aus Shopify/Billbee Inventory-Quelle |
| `weeks_of_supply` | numeric | `current_stock / (last_30d_sales / 4.3)` |
| `last_30d_sales` | int | |
| `season_tag` | text | `spring`, `summer`, `autumn`, `winter`, `evergreen`, `out_of_season` |
| `sample_priority` | text | enum: `low`, `medium`, `high` — abgeleitet (siehe §4) |
| `last_sampled_at` | timestamptz nullable | wann zuletzt als Sample raus, FK-Lookup zu paigh_samples |
| `recommended_recipient_types` | text[] | z.B. `{ugc, influencer}` |
| `last_refreshed_at` | timestamptz | |

**Purpose:** Operations-/Marketing-View die zeigt: welche SKUs sollten JETZT als Samples raus. Read-only für die meisten User, refreshed entweder cron-basiert oder on-demand.

**Implementation-Option A (View):** SQL-View, der live aus `paigh_inventory` (oder externer Source) joined. Vorteil: immer aktuell. Nachteil: braucht inventory-Tabelle.

**Implementation-Option B (Materialized Table):** Cron refreshed täglich. Vorteil: schnell, simpel. Nachteil: 24h stale.

**Empfehlung:** Erst Option B (täglicher Refresh, manuell trigger-bar). Migration zu View nur wenn Real-Time gebraucht wird.

**RLS Phase-1:** `auth.role() = 'authenticated'` SELECT only. INSERT/UPDATE nur via Service-Role (Cron).

### 3.3 `paigh_sample_returns` — nur Marketing-Domain Returns

| Column | Type | Beschreibung |
|---|---|---|
| `id` | uuid PK | |
| `sample_id` | uuid FK paigh_samples | |
| `returned_at` | timestamptz | |
| `condition` | text | enum: `unopened`, `opened_unused`, `used`, `damaged` |
| `reason` | text | enum: `creator_no_post`, `creator_ghosted`, `wrong_product`, `creator_dislike`, `address_invalid`, `other` |
| `restocked` | bool | true wenn condition `unopened` und Lager-Refurbishment ok |
| `notes` | text | |
| `logged_by` | uuid FK auth.users | |
| `created_at` | timestamptz | |

**Purpose:** Marketing-spezifische Returns. NICHT für Customer-Returns. Wichtig für Creator-Reliability-Score (welche Influencer ghosten, welche performen).

**RLS Phase-1:** `auth.role() = 'authenticated'`.

**Boundary:** Wenn jemals Versuchung entsteht, hier auch CS-Returns einzukippen → STOP. Eigene Tabelle, eigenes Modul, eigener Owner.

### 3.4 `paigh_sample_posts` — Creator-Output-Tracking

| Column | Type | Beschreibung |
|---|---|---|
| `id` | uuid PK | |
| `sample_id` | uuid FK paigh_samples | |
| `platform` | text | enum: `instagram`, `tiktok`, `youtube`, `pinterest`, `other` |
| `post_url` | text | |
| `posted_at` | timestamptz | |
| `reach_estimate` | int nullable | |
| `engagement_metric` | numeric nullable | Likes / Comments / Saves — flexible, optional |
| `screenshot_url` | text nullable | optional Beweis-Asset im Storage Bucket |
| `verified_by` | uuid FK auth.users nullable | wer hat geprüft dass Post existiert |
| `created_at` | timestamptz | |

**Purpose:** Closing the loop — Sample raus → Post in. Pflegt Creator-Track-Record und ermöglicht ROI-Berechnung pro Sample. Mehrere Posts pro Sample möglich (z.B. Reel + Story + Carousel).

**RLS Phase-1:** `auth.role() = 'authenticated'`.

---

## 4. Inventory-Signal-Logik (Plain-Text, kein SQL)

Ein SKU bekommt `sample_priority = 'high'` wenn:

- `weeks_of_supply > 12` (mehr als 3 Monate Lager auf aktueller Verkaufsgeschwindigkeit) **AND**
- `last_30d_sales < 20` (geringer aktueller Abverkauf) **AND**
- `season_tag in (current_season, evergreen)` (passt zur aktuellen Quartal-Saison) **AND**
- `last_sampled_at IS NULL OR last_sampled_at < now() - interval '60 days'` (nicht erst kürzlich gesampelt)

`sample_priority = 'medium'` wenn nur 2-3 der 4 Bedingungen erfüllt sind.

`sample_priority = 'low'` wenn nur 1 Bedingung erfüllt ist oder gar keine.

**Edge-Cases die explizit behandelt werden müssen:**
- **Brand-new launches:** SKU < 30 Tage alt → IMMER `low`, weil noch keine Sales-Daten. Wir sampeln keine ganz neuen SKUs durch dieses System raus, das ist Hero-Strategie und gehört woanders hin.
- **Out-of-Stock:** `current_stock < 5` → immer `low`, egal was sonst gilt. Wir versilbern keine letzten Units.
- **Out-of-Season:** `season_tag = 'out_of_season'` → automatisch `high`, weil maximal slow-moving und Lager-Befreiung höchste Prio. **Aber:** Marketing muss aufpassen, dass das nicht „last winter's stuff" im Hochsommer wird — Creator-Pairing dann Saison-passend machen oder weglassen.

**Refresh-Cadence:** Täglich per Cron, manueller Trigger-Button für Mainak in Frontend.

---

## 5. Frontend-Touchpoints (Sketch only, kein Code)

Vier Views, die das System operativ machen. Alle in `components/admin/paigh/` als neuer Sub-Folder.

| View-Name | Primary User | Purpose |
|---|---|---|
| **SampleOutboxView** | Mainak | Liste aller `paigh_samples`, filterbar nach Status. Kanban-Ansicht: `pending → sent → delivered → posted` (oder `returned`/`ghosted` als End-Status). Drag-and-drop zum Status-Update. |
| **SampleNewView** | Mainak | Form für neuen Sample-Eintrag. Pre-fill Recipient aus Ambassador-DB falls vorhanden. SKU-Picker mit Inventory-Hint („3 Wochen of Supply, sample_priority HIGH"). |
| **InventorySignalPanel** | Mainak + Luis | Read-only Liste aller SKUs sortiert nach `sample_priority DESC`, dann `weeks_of_supply DESC`. Quick-Action-Button „Sample raus" der direkt SampleNewView mit prefilled SKU öffnet. |
| **SampleReportingView** | Luis (Finance + Brand-Lead) | Monatsübersicht: Total Samples sent, Total Cost EUR, Posts generated, Reach total, Sample-CAC (cost / reach), Top-Performer-Creators, Ghost-Rate. |

**Keine separate View für `paigh_sample_returns` und `paigh_sample_posts`** — beide werden inline aus SampleOutboxView heraus erfasst (Detail-Modal pro Sample).

---

## 6. Phase-2-Ideen (out of scope für Welle 2 Build)

Sammelbecken für „nice if, später":

- **Shopify/Billbee Inventory-Sync:** automatischer täglicher Pull der Stock-Levels statt manueller Pflege. Setzt voraus, dass Welle X die Shopify-API für Paigh angebunden hat.
- **Instagram/TikTok API für Auto-Detection:** Creator postet → System findet den Post anhand Handle + Hashtag/Mention → `paigh_sample_posts` Row wird automatisch erzeugt. Setzt voraus dass die `mcp__scraper__*` Tools oder Meta-Graph-API permissions verfügbar sind.
- **AI-Campaign-Cost-Attribution:** Ein Monatsbericht der Sample-COGS auf Marketing-Spend-Buckets aufteilt und an Vanessa's Reporting weiterreicht. Setzt voraus dass Finance-Modul live ist.
- **Creator-Reliability-Score:** auto-berechnet aus Sample-History pro Creator. Ghost-Rate, Post-Latency (sent → posted), Engagement-Quality. Steuert künftiges Sample-Routing.
- **Budget-Cap-Enforcement:** Hard-Stop wenn monatliches Sample-Budget erreicht. Heute Open Question, später ggf. Pflicht.

---

## 7. Datenfluss (Plain Text)

1. Mainak öffnet **InventorySignalPanel**, sieht Top-10 high-priority SKUs
2. Wählt einen SKU + Creator (z.B. aus Ambassador-DB oder Free-Form), klickt „Sample raus"
3. **SampleNewView** öffnet sich vorausgefüllt → Mainak ergänzt Tracking-Nummer (sobald Versand ausgelöst), Status `sent`
4. System loggt Sample, updated `paigh_sample_inventory_signals.last_sampled_at`
5. Sample erreicht Creator → Mainak setzt Status `delivered` (manuell oder via Tracking-Webhook in Phase 2)
6. Creator postet → Mainak loggt Post in **SampleOutboxView Detail-Modal** → Status auto `posted`
7. **Alternativ:** Creator ghostet → Mainak setzt Status `ghosted` nach z.B. 14 Tagen → Creator-Reliability-Score updated
8. **Alternativ:** Sample kommt zurück → `paigh_sample_returns` Row, Status `returned`, ggf. `restocked = true`
9. Monatsende: Luis öffnet **SampleReportingView** → sieht Cost, Reach, Sample-CAC, Trend

---

## 8. Open Questions (Luis-Decision vor Build)

1. **Welche Inventory-Quelle füttert das Signal-Logic?** Shopify-API direkt, Billbee, manueller Sheet-Upload, oder eine eigene `paigh_inventory` Table die von woanders gefüttert wird? **Kritisch — Build kann ohne diese Antwort nicht starten.** Default-Fallback: manuelle Stock-Pflege durch Mainak (suboptimal, aber unblockable).
2. **Ist „Sample" eine separate Shopify-Variant oder wird vom Hauptlager abgezogen?** Wenn separate Variant → eigene SKU-Convention (`{base-sku}-SAMPLE`). Wenn Hauptlager → Stock-Decrement auf Standard-SKU. Hat Auswirkung auf Cost-Tracking und Inventory-Sync.
3. **Wer loggt Sample-Shipments — Mainak only, oder auch Warehouse-Staff?** Wenn Warehouse → eigener User-Role nötig + simpler Mobile-Flow. Wenn nur Mainak → Desktop-View reicht. Empfehlung Phase 1: nur Mainak (keep it simple).
4. **Budget-Cap pro Monat?** Hard-Cap (z.B. 500€ Sample-Cost / Monat) oder soft tracking? Wenn hard → braucht Frontend-Block-Logic. Wenn soft → nur Reporting. Empfehlung: Phase 1 soft, Phase 2 hard wenn nötig.
5. **Creator-DB Anbindung:** Soll `recipient_name` ein Free-Form-String sein oder FK zu einer existierenden Ambassador/Creator-Tabelle? Per `system/memory/work/ambassador-program.md` gibt es 216 Creator in 4 Tiers — die existieren irgendwo, aber unklar ob in DB oder Sheet. Wenn DB → FK. Wenn Sheet → Free-Form mit späterer Migration.

---

## 9. Decision

**Was dieses Doc festlegt:**

1. **Concept-only.** **KEIN Build in Welle 1.** Kein SQL apply, kein Frontend, keine Migration.
2. **Build-Kandidat für Welle 2 oder Welle 3** — abhängig davon, ob die Open Questions in §8 vorher geklärt werden können (insbesondere #1: Inventory-Quelle).
3. **4 Tabellen + 1 View vorgeschlagen:** `paigh_samples`, `paigh_sample_inventory_signals`, `paigh_sample_returns`, `paigh_sample_posts`. Schema kann sich beim Build noch ändern, ist hier als Diskussionsgrundlage.
4. **Domain-Boundary zementiert:** Marketing-Returns ≠ CS-Returns. Dieses System fasst CS-Domain NICHT an.
5. **Kern-Frame ist Working-Capital-Optimierung, nicht (nur) Marketing.** Inventory-Signal-Logic ist das Herzstück, nicht das nette-extra. Wenn beim Build der Inventory-Anteil weggekürzt wird, ist das System nur halb so wertvoll.
6. **Vor Build-Start:** Open Questions §8 #1, #2, #5 müssen beantwortet sein. #3, #4 können während Build entschieden werden.
7. **Re-Read dieses Docs vor Welle-2/3-Planung Pflicht** — damit der Wave-Plan nicht von Null konzeptioniert wird, sondern auf diesem Stand aufbaut.

**Welle 1 Item 13 ✅ done mit diesem Doc.** Pure Concept, kein Build-Effort konsumiert.
