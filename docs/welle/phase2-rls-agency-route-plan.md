# Phase 2 — RLS + Agency Route Plan

**Status:** Draft (2026-04-16) · Awaiting approval
**Predecessor:** `marketing-hub-campaign-ops-plan.md` (Phase 1 — permissive RLS, no external users)
**Migration files:** `20260416_audit_log_triggers.sql` (already applied) · `20260416_phase2_rls.sql` (TBD)

---

## Goal

Open the Marketing Hub to external **agency users** without exposing internal data. Agency users see only campaigns + briefs + assets + comments tied to their agency. Internal team retains full access. All write actions remain audited (via Phase 1 audit triggers, now live).

## Why now

Phase 1 build is feature-complete but RLS is `phase1_all_authenticated` (anyone signed in sees everything). Before inviting any external CMO/agency contact, we need scoped policies — otherwise one agency user could read another agency's brief.

---

## Identity model

Three principal types:

| Principal | Detection | Access |
|---|---|---|
| **Internal team** | `auth.users.email` ends in `@hartlimesgmbh.de` OR row in `team_members` | Everything (current behavior) |
| **Agency member** | Row in `agency_members(user_id, agency_id)` | Only their agency's data |
| **Anonymous / other** | Neither of the above | Nothing |

### New tables

```sql
-- Internal team flag (small, hand-curated)
CREATE TABLE team_members (
  user_id    UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email      TEXT NOT NULL UNIQUE,
  role       TEXT NOT NULL CHECK (role IN ('admin','cmo','manager','staff')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Agency membership (M:N — one user can advise multiple agencies)
CREATE TABLE agency_members (
  agency_id  UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role       TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner','member','viewer')),
  invited_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (agency_id, user_id)
);
CREATE INDEX idx_agency_members_user ON agency_members(user_id);
```

### Helper functions (all `SECURITY DEFINER`, search_path locked)

```sql
CREATE OR REPLACE FUNCTION is_internal_team() RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM team_members WHERE user_id = auth.uid()
  ) OR (auth.jwt() ->> 'email') LIKE '%@hartlimesgmbh.de';
$$;

CREATE OR REPLACE FUNCTION current_user_agencies() RETURNS SETOF UUID
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT agency_id FROM agency_members WHERE user_id = auth.uid();
$$;
```

---

## RLS policies (per table)

Replace every `phase1_all_authenticated` policy with two policies: `internal_full` + `agency_scoped`.

### `agencies`
- **internal_full** — `is_internal_team()` for ALL
- **agency_self_read** — agency members SELECT their own agency only

### `campaigns`
- **internal_full** — `is_internal_team()` for ALL
- **agency_scoped_rw** — `agency_id IN (SELECT current_user_agencies())` for SELECT + UPDATE (no INSERT/DELETE for agencies)

### `campaign_briefs` and `agency_briefs`
- Scoped via parent `campaigns.agency_id`:
- **internal_full** — `is_internal_team()` for ALL
- **agency_scoped** — `EXISTS (SELECT 1 FROM campaigns c WHERE c.id = campaign_briefs.campaign_id AND c.agency_id IN (SELECT current_user_agencies()))` for SELECT + UPDATE

### `campaign_creative_sets` + `campaign_assets` + `campaign_comments`
- Same pattern: parent campaign's `agency_id` must match
- Comments: agency members can INSERT (own author_id), but only UPDATE/DELETE their own rows

### `campaign_kpis`
- Same scoping for SELECT
- INSERT/UPDATE: `is_internal_team()` only (KPIs are pulled from ad APIs by internal jobs)

### `audit_log`
- **internal_full** — `is_internal_team()` SELECT all
- **agency_scoped_read** — agency members SELECT only entries where `row_id` belongs to a campaign in their scope (subquery)

---

## `/agency` route

### Route topology
- `app.thiocyn-businessos.vercel.app/agency` — agency-only landing
- Same Vercel app, same Supabase auth, separate React route + layout
- Shares 80% of components with `/admin/marketing/*` but with reduced nav and read-mostly UX

### Access control
Three layers (defense in depth):
1. **Frontend route guard** — `useEffect(() => { if (!isAgencyMember && !isInternal) navigate('/login') }, [...])`
2. **API/Edge functions** — already JWT-protected
3. **RLS** — even if (1) and (2) fail, queries return empty result sets

### UI scope (Phase 2.0 minimum)
- Campaign list (read-only, scoped)
- Campaign detail with Brief (read) + Comments (read/write own) + Asset upload (write)
- No KPI editing, no agency management, no user invite

Phase 2.1 nice-to-haves: status change `live → paused` on agency-owned campaigns.

---

## Invite flow

1. Internal admin opens `/admin/marketing/agencies` (new view)
2. Selects agency, enters email + role
3. Backend Edge Function `invite-agency-member`:
   - Creates `auth.users` row via Supabase admin API (or sends magic link)
   - Inserts row in `agency_members(agency_id, user_id, role)`
   - Sends Resend email with magic-link to `/agency`
4. User clicks link → lands on `/agency` → RLS does the rest

---

## Migration sequence (additive — safe rollback at each step)

1. **20260416_phase2_rls_setup.sql** (additive, no policy swap)
   - Create `team_members`, `agency_members`
   - Create `is_internal_team()`, `current_user_agencies()` functions
   - Seed `team_members` with current Hart Limes emails

2. **20260417_phase2_rls_policies.sql** (the actual swap)
   - For each table: `DROP POLICY phase1_all_authenticated`, `CREATE POLICY internal_full + agency_scoped`
   - Test in isolation: spin up a non-internal user, verify they see nothing
   - Then test as agency member, verify scoped visibility

3. **20260418_phase2_invite_flow.sql** (optional helpers)
   - Edge function `invite-agency-member`
   - View `agency_member_overview` for admin UI

**Rollback:** each migration reverses cleanly — drop new policies, recreate `phase1_all_authenticated`.

---

## Test plan

| Test | Tool | Pass criteria |
|---|---|---|
| Internal team sees all campaigns | Live UI as `jll@hartlimesgmbh.de` | Same row count as Phase 1 |
| Agency user sees only own campaigns | Test JWT with seeded agency_members row | Row count matches subset |
| Agency user cannot read other agency's brief | Direct SELECT on `campaign_briefs` of foreign campaign | Returns 0 rows |
| Agency user cannot DELETE campaign | UPDATE attempt with `status='killed'` (which is DELETE-ish) | RLS blocks, returns error |
| Audit-log captures agency edits | Update brief as agency user, query audit_log | Entry has correct `actor_email`, `operation`, diff |
| Anonymous user sees nothing | Logged-out fetch | All policies block |

---

## Open decisions for Luis

1. **Internal-team detection rule:** email-domain match alone, or require explicit `team_members` row? *Default proposal: BOTH (either grants access).*
2. **Agency role granularity:** start with single `role = 'member'`, or distinguish `owner` (can invite teammates within their agency) vs `member`? *Default proposal: 3 roles defined, but only `owner`/`member` used in v1; `viewer` reserved.*
3. **Magic-link vs password invite:** Resend magic-link is friction-free but expires. Password is permanent but slower onboarding. *Default proposal: magic-link, 7-day expiry.*
4. **Brand-allowed-list interaction:** `agencies.allowed_brands` already exists. Should agency members ALSO be filtered by brand within their agency? *Default proposal: NO — agency_members get all agency campaigns regardless of brand. Brand-filter is for the UI dropdown only.*
5. **`/agency` design:** subdomain (`agency.thiocyn-businessos.vercel.app`) or path-prefix (`/agency`)? *Default proposal: path-prefix — simpler, same auth context.*

---

## Effort estimate

| Phase | Work | Hours |
|---|---|---|
| 2.0 | Tables + helper functions + seed | 1h |
| 2.0 | Policy migration + test matrix | 2h |
| 2.0 | `/agency` route shell + scoped Campaign List | 2h |
| 2.0 | Brief + Comments + Asset upload | 2h |
| 2.1 | Invite flow Edge Function + admin UI | 2h |
| 2.1 | End-to-end test with one real agency contact | 1h |

**Total: ~10h split across 2-3 work blocks.**

---

## Recommended next step

Approve defaults for the 5 open decisions (or override) → I write migration `20260416_phase2_rls_setup.sql` → we apply + test before touching policies.
