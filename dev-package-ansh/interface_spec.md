# Interface Specification — Data Ingestion Pipeline
**For:** Ansh (external developer)
**Project:** Thiocyn BusinessOS — Ads & Orders Ingestion
**Date:** 2026-03-25

---

## 1. Target Table: `ads_metrics`

```sql
CREATE TABLE ads_metrics (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand                 TEXT NOT NULL,               -- 'Thiocyn' | 'Take A Shot' | 'Paigh'
  account_id            TEXT NOT NULL,               -- platform account/customer ID
  date_range_start      DATE NOT NULL,
  date_range_end        DATE NOT NULL,
  conversions           INT,
  conversions_change    NUMERIC,                     -- % change vs. prior period
  cost_per_conversion   NUMERIC,
  cpc_change            NUMERIC,                     -- % change vs. prior period
  clicks                INT,
  clicks_change         NUMERIC,
  ctr                   NUMERIC,                     -- decimal, e.g. 0.0312 = 3.12%
  ctr_change            NUMERIC,
  impressions           INT,
  cost                  NUMERIC,                     -- in base currency unit (EUR/USD)
  currency              TEXT DEFAULT 'EUR',
  top_campaign          TEXT,                        -- campaign_name with highest spend
  source                TEXT NOT NULL,               -- see Section 3
  created_at            TIMESTAMPTZ DEFAULT now()
);
```

---

## 2. Ingestion Architecture

```
External API  →  Transform Layer  →  Supabase (ads_metrics)
     |                |
  Google Ads       Normalize fields, compute aggregates
  Meta Ads         (conversions_change, cpc_change, etc.)
  Shopify          Convert cost_micros → cost (divide by 1,000,000)
```

- All API calls must run **server-side only** (Node.js backend or edge function).
- Credentials are injected via environment variables (see `.env.example`).
- The transform layer must aggregate rows per `(brand, account_id, date_range_start, date_range_end)` before inserting.
- Use upsert on `(brand, source, date_range_start, date_range_end)` to avoid duplicates.

---

## 3. `source` Field Values

| Platform    | source value        |
|-------------|---------------------|
| Google Ads  | `'google_ads_api'`  |
| Meta Ads    | `'meta_ads_api'`    |
| Shopify     | `'shopify_api'`     |

---

## 4. Security Requirements

- All API calls **server-side only** — never expose credentials to the client.
- Credentials loaded exclusively via environment variables, never hardcoded.
- Do not log credential values, tokens, or raw API responses to persistent storage.
- Use the Supabase `SUPABASE_ANON_KEY` for writes only if RLS permits; prefer a service role key (provided at deployment) for ingestion jobs.

---

## 5. Development Notes

- **Build and test against `mock_data/` only.**
- Production credentials will be injected by Luis / Valentin at deployment.
- `cost_micros` (Google Ads) → divide by `1_000_000` to get EUR value.
- `spend` (Meta Ads) → already in base currency (EUR/USD string), parse as float.
- Shopify orders do not map directly to `ads_metrics` — use for revenue reconciliation only (separate table TBD).
- Questions / blockers → contact Luis via Slack or email before making assumptions about schema changes.
