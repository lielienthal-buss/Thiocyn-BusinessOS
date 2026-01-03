
# MVP Roadmap: Internal Hiring Tool

## Vision
An automated, high-end hiring pipeline designed for startups (50-200 applicants) that leverages Bento-Grid UI and AI analysis to streamline recruitment.

## Current Status: Design System, Legal & Admin Hub Finalized
- [x] **Bento UI Concept**: All portal components converted to a modular tile system.
- [x] **Glassmorphism Styling**: Unified semi-transparent cards with deep blurs and subtle borders.
- [x] **Legal Compliance**: Imprint and Privacy Policy integrated with explicit 30-day retention notice.
- [x] **AI Scoring**: Automated Gemini 3 Pro screening on submission.
- [x] **Kanban Dashboard**: Drag & Drop status transitions for admins.
- [x] **Email Template System**: Dynamic templates stored in DB, editable via Admin UI.
- [x] **KPI Dashboard**: Read-only module for admins to track funnel conversion and AI distribution.

## Phase 2: Collaboration & Storage (Next 4 Weeks)
1. **Supabase Storage Linking**: Wire up actual CV/Task uploads to private buckets with RLS.
2. **Resend Live Integration**: Connect the email action logic to the Resend API for transactional mail.
3. **Admin Invitations**: Move from open signup to an invite-only system for security.
4. **Interview Scheduling**: Basic Calendly integration or internal availability picker.
5. **Feedback Loops**: Simple rating system (1-5 stars) for multiple team members per candidate.

## Phase 3: Scale
- Vercel Deployment with Edge Config.
- Multi-tenant support (Multiple "Projects" or "Job Postings" per company).
