# HSB Business OS — Sitemap

**Stand:** 2026-05-02 (Phase 3a Legacy-Cleanup vollzogen)
**Repo:** `Thiocyn-BusinessOS` (Vite + React + Supabase + Vercel)
**Vercel Project:** `hsb-os` → Production URL: `https://hsb-os.vercel.app`
**Custom Domain:** Noch nicht angeschlossen — production läuft auf vercel-Subdomain. Apply-Links + extern verwendete URLs zeigen auf `hsb-os.vercel.app`.

---

## 5 Layer-Architektur

| Layer | Was | Auth | Branding |
|---|---|---|---|
| 1 | Public Marketing (HSB) | ❌ Public | HSB |
| 2 | Public Funnels (Legacy) | ❌ Public | Mixed (HartLimes + HSB) — **Cleanup pending** |
| 3 | Legal/Utility | ❌ Public | Neutral |
| 4 | Auth-Wall | 🔓 Login-Form | HSB |
| 5 | Internal Dashboard | 🔒 Auth-required | HSB Internal Dashboard |

---

## Layer 1 — Public Marketing (HSB-Brand)

| Route | Component | Status | Zweck |
|---|---|---|---|
| `/` | `HSBLanding` (renders Hero + Mission + Path + Portfolio + Pythia + Metrics) | ✅ Live | Holding-Story, 3-CTA Path-Selector |
| `/about` | `AboutPage` | ✅ Live | Peter Hart Bio + Career-Arc + Why HSB |
| `/founders` | `FoundersPage` | ✅ Live | "Sell your brand" — M&A-Inbound für Brand-Owner |
| `/founders-university` | `FoundersUniversityPage` | ✅ Live | 12-Wochen Praktis-Fellowship |
| `/brand-ambassador` | `AmbassadorsPage` | ✅ Live | Creator/Ambassador-Programm |

**HSBLanding-Sections (in Reihenfolge):** Navbar → HeroSection → MissionNarrative → PathSelectionGrid → PortfolioShowcase → AIFeatureSection (Pythia) → MetricsSection → Footer

---

## Layer 2 — Public Funnels (Cleanup vollzogen 2026-05-02)

| Route | Status | Target |
|---|---|---|
| `/hiring` | ✅ Redirect | → `/founders-university` |
| `/company` | ✅ Redirect | → `/` |
| `/creators` | ✅ Redirect | → `/brand-ambassador` |
| `/apply/creator` | ✅ Redirect | → `/brand-ambassador` |
| `/task/:accessToken` | ✅ Live | Token-gated Apply-Task-Upload |
| `/intern/:internId` | ✅ Redirect | → `/admin` (legacy) |

**Cleanup completed:**
- `HartLimesLanding.tsx` — **gelöscht** (nicht mehr referenziert)
- `Header`, `FAQ`, `ApplicationSlidePanel` — Imports aus App.tsx entfernt (Files orphaned, können bei nächster Refactor-Welle gelöscht werden)
- `CreatorApplicationPage.tsx` — File noch da, aber nicht mehr referenziert (orphaned)

---

## Layer 3 — Legal/Utility

| Route | Component | Status |
|---|---|---|
| `/imprint` | `Imprint` | ✅ |
| `/privacy` | `PrivacyPolicy` | ✅ |
| `/legal` | `LegalPage` | ✅ |
| `/fellowship-agreement` | `FellowshipAgreementPage` | ✅ Public + printable, linked from invite emails |

---

## Layer 4 — Auth-Wall

| Route | Component | Status |
|---|---|---|
| `/admin` | `AdminLogin` | ✅ Supabase-Auth |
| `/admin/forgot-password` | `ForgotPassword` | ✅ |

---

## Layer 5 — Internal Dashboard (52 Views, hinter `/admin/dashboard`)

Komponenten in `components/admin/` strukturiert in Funktionsbereiche:

### Daily Use (2)
- `HomeView` — Dashboard-Start
- `DailyBriefingView` — Briefing-Items pro Tag

### Recruiting (7)
- `RecruitingOverview`, `ApplicationListView`, `ApplicantDetailView`, `ApplicantDetailDrawer`, `KanbanBoard`, `AmbassadorApplicationsView`, `AddInternModal`

### Academy / Onboarding (5)
- `AcademyView`, `AdminAcademyView`, `FellowCoursePreviewView`, `FellowCourseView`, `OnboardingChecklistView`, `OnboardingTour`

### Team (4)
- `TeamManagementView`, `TeamTasksView`, `TaskManager`, `WorkspaceView`

### Operations (5)
- `EcommerceView`, `CustomerSupportView`, `CreatorView`, `ProcessExecutionView`, `ToolStackView`

### Finance / M&A (2)
- `FinanceView`, `MAInquiriesView`

### Analytics (4)
- `AnalyticsView`, `InsightsView`, `EvalDashboardView`, `PerformanceView`

### Knowledge / AI (3)
- `KnowledgeBaseView`, `AgentChatDrawer`, `VideoGenerationView`

### Setup (4)
- `BrandConfigView`, `SettingsView`, `AccountView`, `ISOComplianceView`

### Notifications (2)
- `NotificationBell`, `NotificationFeedView`

### Misc (3)
- `BigFiveVisualizer`, `EmailComposeModal`, `EmailTemplateManager`

### Sub-folders (separately structured)
- `admin/analytics/`
- `admin/creator/`
- `admin/finance/`
- `admin/home/`
- `admin/marketing/`

---

## Routing-Quelle

Source-of-Truth: `App.tsx` Lines 127–301. Alle Routes via `react-router-dom` `createBrowserRouter`. SPA-Fallback in `vercel.json` (`/(.*)` → `/index.html`).

## Section-Komponenten (HSBLanding)

`components/landing/sections/`:
- `HeroSection` — Aurora-Background, SplitText-Animation
- `MissionNarrative` — 3-Block Story
- `PathSelectionGrid` — 3 CTA-Cards (Founders University / Ambassadors / Sell)
- `PortfolioShowcase` — 6 Brand-Cards aus `lib/landing/brands.ts`
- `AIFeatureSection` — Pythia-Block (Oracle-Framing, 3 Capabilities)
- `MetricsSection` — Brand-Counts + Reach + Fellow-Counts
- `Navbar`, `Footer` — sitewide
- `StubPage` — Coming-soon Placeholder

## Funnel-Pages

`components/landing/pages/`:
- `AboutPage`, `AmbassadorsPage`, `FellowshipAgreementPage`, `FoundersPage`, `FoundersUniversityPage`

## Public Components

`components/public/`:
- `ApplicationSlidePanel`, `CaptchaComponent`, `ChatBot`, `CreatorApplicationPage`, `InternPortalPage`, `TaskSubmissionPage`

---

## Open Issues (Stand 2026-05-02)

1. ✅ ~~Legacy-Funnel-Cleanup~~ — erledigt 2026-05-02. 4 Redirects + HartLimesLanding gelöscht.
2. **Custom Domain** — production läuft auf `hsb-os.vercel.app`. Custom Domain (z.B. `housesustainablebrands.io`) später anschließen, ist nicht blocking.
3. **Skeleton-Loaders** — Suspense-Fallbacks sind leerer schwarzer Block, Polish-Hebel.
4. **Orphaned Components** — `Header.tsx`, `FAQ.tsx`, `ApplicationSlidePanel.tsx`, `CreatorApplicationPage.tsx` sind nach Cleanup nicht mehr referenziert. Bei nächster Welle löschen.

---

**Maintenance:** Bei Änderungen an Routing in `App.tsx` → diesen File syncen. Idealerweise als Schritt im PR-Template verankern.
