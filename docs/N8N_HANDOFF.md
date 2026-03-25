# n8n Automation — Production Setup Handoff
Hart Limes GmbH | Business OS

---

## Accounts to Create

| Account | URL | Who | Notes |
|---|---|---|---|
| n8n Cloud | n8n.io/cloud | Valentin | Start on Starter plan (~20€/month). Use hartlimes company email. |
| Resend | resend.com | Valentin | Free tier sufficient for start. Add domain: mail.hartlimesgmbh.de |
| Meta System User | business.facebook.com | Matic (CMO) | System User with ads_read on all brand ad accounts |

---

## Step 1 — n8n Cloud Setup

1. Create account at n8n.io/cloud
2. Create workspace "Hart Limes Business OS"
3. Note your webhook base URL (format: `https://[your-instance].app.n8n.cloud/webhook/`)

---

## Step 2 — Environment Variables in n8n

In n8n Cloud: **Settings → Variables**. Add these:

| Variable | Value | Source |
|---|---|---|
| `SUPABASE_URL` | `https://dfzrkzvsdiiihoejfozn.supabase.co` | Supabase Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | [service role key] | Supabase Settings → API → service_role (keep secret!) |
| `RESEND_API_KEY` | [api key] | Resend → API Keys |
| `ANTHROPIC_API_KEY` | [api key] | console.anthropic.com (same as Vercel key or separate) |
| `META_ACCESS_TOKEN` | [long-lived token] | Meta Business → System User (see Step 6) |

---

## Step 3 — n8n Credentials Setup

Create these credentials in n8n: **Credentials → Add**

**For Supabase calls (all workflows):**
- Type: HTTP Header Auth
- Name: `Supabase — Hart Limes`
- Header Name: `apikey`
- Header Value: [SUPABASE_SERVICE_ROLE_KEY]

**For Resend (email workflows):**
- Type: HTTP Header Auth
- Name: `Resend`
- Header Name: `Authorization`
- Header Value: `Bearer [RESEND_API_KEY]`

**For each Shopify brand (6 total — shopify-daily-sync):**
- Type: HTTP Header Auth
- Name: `Shopify — [Brand Name]` (repeat for each brand)
- Header Name: `X-Shopify-Access-Token`
- Header Value: [brand shopify admin API token]
- Pattern to get token: Shopify Admin → Apps → Develop apps → Create app → API credentials

---

## Step 4 — Import Workflows

For each JSON file in `/n8n/workflows/`:
1. n8n → Workflows → **Import from file**
2. Select JSON file
3. After import: update any placeholder values (`act_REPLACE_*`, email addresses)
4. Do NOT activate yet — configure first

---

## Step 5 — Shopify Webhook Configuration (dispute-triage, shopify-daily-sync)

- For **shopify-daily-sync**: no Shopify webhook needed — n8n pulls daily via API.
- For order webhooks (future): Shopify → Settings → Notifications → Webhooks

---

## Step 6 — Supabase Webhooks (application-auto-score, task-delegation-email)

In Supabase (`dfzrkzvsdiiihoejfozn`):

1. **Database → Webhooks → Create webhook**
   - Name: `application-submitted`
   - Table: `applications`
   - Events: INSERT
   - URL: [n8n webhook URL for application-auto-score workflow]

2. Create second webhook:
   - Name: `task-assigned`
   - Table: `team_tasks`
   - Events: UPDATE
   - URL: [n8n webhook URL for task-delegation-email workflow]

---

## Step 7 — Payment Provider Webhooks (dispute-triage)

**PayPal:** business.paypal.com → Account Settings → Notifications → Webhooks
- URL: [n8n webhook URL for dispute-triage workflow]
- Events: `CUSTOMER.DISPUTE.CREATED`, `CUSTOMER.DISPUTE.UPDATED`

**Stripe:** dashboard.stripe.com → Developers → Webhooks
- URL: same n8n webhook URL as above
- Events: `charge.dispute.created`

**Klarna:** Klarna merchant portal → Settings → Notifications (if available)

---

## Step 8 — GetMyInvoices Webhook (invoice-intake)

GetMyInvoices → Einstellungen → Webhooks → Add URL
- URL: [n8n webhook URL for invoice-intake workflow]
- Event: New invoice received

---

## Step 9 — Meta System User Token (meta-ads-daily-snapshot)

1. Open Meta Business Manager: business.facebook.com
2. Business Settings → Users → System Users → Add
3. Name: `Hart Limes n8n Bot`, Role: Employee
4. Assign to all 6 brand ad accounts with Analyst permission
5. Generate Token with scopes: `ads_read`, `business_management`
6. Copy token to `META_ACCESS_TOKEN` env var in n8n (Step 2)
7. In the workflow: replace all `act_REPLACE_*` placeholders with actual Meta Ad Account IDs

---

## Step 10 — Update Workflow Configs

Before activating, update these values in each workflow:

- `shopify-daily-sync.json`: verify all 6 Shopify store URLs
- `meta-ads-daily-snapshot.json`: replace all `act_REPLACE_*` with real ad account IDs
- `dispute-triage.json`: update Vanessa's email if different from `vanessa@mail.hartlimesgmbh.de`

---

## Step 11 — Activate Workflows (in order)

Activate one at a time, test each before continuing:

1. `application-auto-score` — test with a dummy application first
2. `task-delegation-email` — test by assigning a test task
3. `task-overdue-reminder` — safe to activate, runs at 17:00
4. `invoice-intake` — coordinate with GetMyInvoices webhook setup
5. `dispute-triage` — coordinate with PayPal/Stripe webhook setup
6. `weekly-standup-generator` — safe to activate, runs Monday 10:50
7. `shopify-daily-sync` — activate after Shopify API tokens are ready
8. `meta-ads-daily-snapshot` — activate after Meta token is ready

---

## Testing Checklist

- [ ] **application-auto-score**: Submit test application via public form → check `aiScore` appears in Supabase within 30s
- [ ] **task-delegation-email**: Assign task in Business OS → check email arrives at assignee
- [ ] **task-overdue-reminder**: Manually trigger (n8n → Execute workflow) → check email format looks correct
- [ ] **invoice-intake**: Send test webhook via n8n test trigger → check Supabase `invoices` table populated + email sent
- [ ] **dispute-triage**: Send test webhook → check `disputes` table populated + email to Vanessa
- [ ] **weekly-standup-generator**: Manually trigger → check email arrives for Luis
- [ ] **shopify-daily-sync**: Manually trigger → check `ecom_metrics` table populated
- [ ] **meta-ads-daily-snapshot**: Manually trigger → check `ad_campaigns` table populated

---

## Credentials Summary Table

| What | Where to Get It | Who Sets It | Urgency |
|---|---|---|---|
| Supabase Service Role Key | Supabase → Settings → API → service_role | Valentin | Before any workflow runs |
| Resend API Key | resend.com → API Keys | Valentin | Before email workflows |
| Anthropic API Key | console.anthropic.com | Valentin | Before application-auto-score |
| Meta Access Token | Meta Business → System Users (Step 9) | Matic (CMO) | Before meta-ads-daily-snapshot |
| Shopify API Tokens (x6) | Shopify Admin → Apps → Develop apps (per brand) | Valentin + Brand Leads | Before shopify-daily-sync |
| PayPal Webhook Secret | business.paypal.com → Notifications | Vanessa / Finance | Before dispute-triage |
| Stripe Webhook Secret | dashboard.stripe.com → Developers → Webhooks | Vanessa / Finance | Before dispute-triage |
| GetMyInvoices Webhook | GetMyInvoices → Einstellungen → Webhooks | Valentin | Before invoice-intake |
