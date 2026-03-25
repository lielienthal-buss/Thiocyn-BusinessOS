# n8n — Hart Limes Business OS

## Overview

8 automation workflows powering the Hart Limes GmbH Business OS. Covers finance, HR, operations, and marketing across all brands. Runs on n8n (local dev or cloud prod).

---

## Local Development

```bash
npx n8n
```

Opens at [http://localhost:5678](http://localhost:5678). No Docker needed. Workflows are stored in `~/.n8n/` by default.

---

## Import a Workflow

1. Open n8n UI at `localhost:5678`
2. Navigate to **Workflows → New** (or open any existing workflow)
3. Click the **...** menu → **Import from file**
4. Select the desired `.json` file from this folder
5. Save and activate

---

## Workflow Index

| File | Name | Trigger | Handles |
|---|---|---|---|
| `shopify-daily-sync.json` | Shopify — Daily Revenue Sync | Cron 02:00 | Pulls revenue + orders from all brand stores → Supabase `ecom_metrics` |
| `application-auto-score.json` | HR — Application Auto-Score | Supabase webhook (new application row) | Sends applicant data to Claude Haiku → writes `ai_score` + summary back to row |
| `task-delegation-email.json` | Ops — Task Delegation Email | Supabase webhook (task assigned) | Emails the assigned intern when a task is delegated to them |
| `task-overdue-reminder.json` | Ops — Overdue Task Reminder | Cron weekdays 17:00 | Queries open overdue tasks → emails each responsible intern |
| `dispute-triage.json` | Finance — Dispute Triage | PayPal / Stripe / Klarna webhook | Logs dispute to Supabase → notifies Vanessa + Luis via email |
| `meta-ads-daily-snapshot.json` | Marketing — Meta Ads Daily Snapshot | Cron 06:00 | Fetches ROAS, spend, impressions per ad account → Supabase `ad_campaigns` |
| `weekly-standup-generator.json` | Ops — Weekly Standup Generator | Cron Monday 10:50 | Queries open tasks + metrics → generates standup doc → emails Luis |
| `invoice-intake.json` | Finance — Invoice Intake (GetMyInvoices) | GetMyInvoices webhook (new invoice) | Normalizes payload → logs to Supabase `invoices` → emails Luis |

---

## Required Environment Variables

Set these in n8n: **Settings → Environment Variables** (self-hosted) or via the credential/env system in n8n Cloud.

| Variable | Required by | Where to get |
|---|---|---|
| `SUPABASE_URL` | All workflows | Supabase → Project Settings → API → Project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | All workflows | Supabase → Project Settings → API → `service_role` key (keep secret) |
| `RESEND_API_KEY` | task-delegation-email, task-overdue-reminder, dispute-triage, weekly-standup-generator, invoice-intake | [resend.com](https://resend.com) → API Keys → Create API Key |
| `ANTHROPIC_API_KEY` | application-auto-score | [console.anthropic.com](https://console.anthropic.com) → API Keys |
| `META_ACCESS_TOKEN` | meta-ads-daily-snapshot | Meta Business Manager → System Users → generate token with `ads_read` + `ads_management` permissions |
| Shopify credentials (per brand) | shopify-daily-sync | Shopify Admin → Apps → Develop apps → create private app → Admin API access token |

---

## Production Deployment

### Option 1 — n8n Cloud (recommended for getting started)

- Sign up at [n8n.io/cloud](https://n8n.io/cloud)
- ~20 €/month for the Starter plan
- No server management, automatic updates, built-in credential storage
- Import workflows via UI, set env vars under Settings

### Option 2 — Self-hosted on Hetzner VPS (cost-optimized)

- CX11 instance (~4 €/month), Ubuntu 22.04
- Install via Docker Compose (recommended):

```bash
# On the VPS:
mkdir n8n && cd n8n
curl -o docker-compose.yml https://raw.githubusercontent.com/n8n-io/n8n-hosting/main/docker-compose/withPostgres/docker-compose.yml
# Edit .env with your domain + credentials
docker compose up -d
```

- Or via npm directly: `npm install -g n8n && n8n start`
- Point a subdomain (e.g. `n8n.hartlimesgmbh.de`) via Hetzner DNS + nginx reverse proxy
- Use `certbot` for HTTPS

---

## Credential Setup Guide

All HTTP-based integrations in these workflows use **n8n HTTP Header Auth** or **HTTP Query Auth** credentials. Create them once and reference them by name across workflows.

### Supabase (HTTP Header Auth)

1. n8n → Credentials → New → **HTTP Header Auth**
2. Name: `Supabase Hart Limes`
3. Header name: `Authorization`
4. Header value: `Bearer <your SUPABASE_SERVICE_ROLE_KEY>`
5. Also add a second header credential for `apikey` with just the raw key value, or pass both via the workflow's header parameters as shown in the workflow JSON.

### Resend (HTTP Header Auth — Bearer)

1. n8n → Credentials → New → **HTTP Header Auth**
2. Name: `Resend`
3. Header name: `Authorization`
4. Header value: `Bearer <your RESEND_API_KEY>`

### Shopify (HTTP Header Auth — one per brand store)

1. In Shopify Admin: Apps → Develop apps → Create app → enable Admin API scopes (`read_orders`, `read_products`)
2. Install app → copy **Admin API access token**
3. n8n → Credentials → New → **HTTP Header Auth**
4. Name: e.g. `Shopify — Take A Shot`
5. Header name: `X-Shopify-Access-Token`
6. Header value: `<token>`
7. Repeat for each brand store.

### Meta Ads (HTTP Query Auth)

1. Meta Business Manager → System Users → create or select a system user
2. Assign the user to your ad accounts with `Analyst` role
3. Generate a **permanent token** with scopes: `ads_read`, `ads_management`
4. n8n → Credentials → New → **HTTP Query Auth**
5. Name: `Meta Ads`
6. Parameter name: `access_token`
7. Parameter value: `<your token>`

---

*Hart Limes GmbH Business OS — maintained by Luis / Founders Associate*
