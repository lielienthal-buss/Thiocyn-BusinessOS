# V2 Roadmap: Lean, Evidence-Based Hiring

_Date: January 2026_

**Vision**: Refactor the application to a 2-stage, evidence-based hiring process. The priority is to implement a lean, high-signal workflow over complex, nice-to-have features. The previous roadmap is superseded by this plan.

---

## V2 Implementation Plan

### Task 1: Backend & Type Safety

- [ ] **SQL Migration**: Write and apply the script to modify the `applications` table (add `linkedin_url`, `psychometrics`, `stage`, `access_token`, `work_sample_text`).
- [ ] **RPC Function**: Create and test the `submit_task_response` PostgreSQL function for secure work sample submissions.
- [ ] **Type Definitions**: Update `types.ts` to reflect the new database schema (`ApplicationFormData`, etc.).

### Task 2: Stage 1 - Application Form Refactoring

- [ ] **Step 2 (Experience)**: Refactor `Step2Experience.tsx` to include only two inputs:
  - A required URL input for the "Professional Profile" (LinkedIn/GitHub).
  - A textarea for the "Project Highlight".
- [ ] **Step 3 (Personality)**: Refactor `Step3Personality.tsx`:
  - Replace the DISC test with the BFI-10 Likert scale UI.
  - Implement the client-side calculation logic to generate the `psychometrics` JSON object before submission.

### Task 3: Stage 3 - Work Sample Submission Page

- [ ] **New Route**: Create a new page and route at `/task/:token`.
- [ ] **Component `TaskSubmissionPage.tsx`**:
  - Fetch candidate data using the token.
  - Display the static case study text.
  - Include a textarea for the answer and a submit button that calls the `submit_task_response` RPC function.

### Task 4: Admin Dashboard Update

- [ ] **Applicant Detail View**:
  - Display the candidate's Big Five scores (e.g., with progress bars).
  - Show a clickable icon/link for the `linkedin_url`.
- [ ] **Workflow Actions**:
  - If `stage === 'applied'`, show a "Copy Task Link" button.
  - If `stage === 'task_submitted'`, display the `work_sample_text` for review.

---

## Legacy V1/V1.5 Roadmap (Superseded)

_The following features were part of the previous vision but are now on hold or deprecated in favor of the lean V2 workflow._

- **AI Scoring**: Automated Gemini 3 Pro screening on submission.
- **Kanban Dashboard**: Drag & Drop status transitions for admins.
- **Email Template System**: Dynamic templates stored in DB, editable via Admin UI.
- **KPI Dashboard**: Read-only module for admins to track funnel conversion.
- **Supabase Storage Linking**: For CV/Task uploads.
- **Resend Live Integration**: For transactional mail.
- **Interview Scheduling**: Calendly integration.
- **Feedback Loops**: Simple rating system (1-5 stars).
- **Multi-tenancy**.

---

## V2.1 Enhancements (February 2026)

This section outlines the next set of features and fixes planned for the V2 application.

### Task 1: UI Fixes & Core Workflow

- [ ] **Add "Return to Hub" Button**: Implement a back button in the `ApplicantDetailView` to allow users to easily navigate back to the main application list.
- [ ] **Fix "Copy Task Link"**: The current implementation is unclear. The plan is to replace it with a static, configurable link (e.g., to a Notion or Google Drive document) that can be copied by the recruiter.

### Task 2: Feature - Internal Notes

- [ ] **Database**: Create a new `application_notes` table with columns for `application_id`, `user_id`, `note`, and `created_at`.
- [ ] **Backend**: Add RLS policies and `getNotesForApplication` / `addNote` functions in `lib/actions.ts`.
- [ ] **Frontend**: Update `ApplicantDetailView` to display existing notes and include a form for adding new ones.

### Task 3: Feature - Ideal BFI-10 Profile

- [ ] **Frontend**: Modify `BigFiveVisualizer.tsx` to display a hardcoded "ideal" personality profile alongside the candidate's scores for easy comparison.

### Task 4: Feature - Kanban Board

- [ ] **Component**: Create a new `KanbanBoard.tsx` component.
- [ ] **Columns**: The board will display columns representing the application `stage` (e.g., 'applied', 'task_submitted').
- [ ] **Drag-and-Drop**: Integrate a library (e.g., `react-beautiful-dnd`) to allow dragging applicant cards between columns.
- [ ] **Backend**: On drop, trigger an action to update the applicant's `stage` in the database.
- [ ] **Integration**: Add a navigation link to the Kanban board in the main `Dashboard`.