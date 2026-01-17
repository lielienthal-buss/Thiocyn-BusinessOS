# Backend Operations & Notes

---
## V2 Database & API (Lean, Evidence-Based Hiring)
*Date: January 2026*

This section outlines the backend architecture for the V2 hiring process.

### 1. V2 Database Schema (`applications` table)
The `applications` table has been refactored to support the new 3-stage workflow.

**New & Updated Columns:**
- `linkedin_url` (TEXT): Replaces traditional CV uploads. Stores the URL to the candidate's professional profile.
- `psychometrics` (JSONB): Stores the calculated Big Five (BFI-10) scores (e.g., `{ "openness": 80, "conscientiousness": 95, ... }`).
- `stage` (TEXT): Manages the candidate's progress. Expected values: `'applied'`, `'task_requested'`, `'task_submitted'`, `'rejected'`. Defaults to `'applied'`.
- `access_token` (UUID): A unique token generated on insert. This is used to create the secure link for the Stage 3 work sample.
- `work_sample_text` (TEXT): Stores the candidate's submission for the Stage 3 case study. Nullable.

**Deprecated Columns (V1):**
- `disc_answers`
- `project_example_text`
- `requirements_handling_text`
- `remote_work_text`
These columns are no longer populated by the V2 form and can be ignored or removed.

### 2. V2 API: Secure Task Submission (RPC Function)
To allow an unauthenticated candidate to submit their work sample securely, a dedicated PostgreSQL function has been created.

**Function:** `submit_task_response(p_token uuid, p_answer text)`

**Logic:**
1. The function is called from the frontend with the candidate's unique `access_token` and their text answer.
2. It finds the matching record in the `applications` table.
3. It updates the `work_sample_text` with the answer and sets the `stage` to `'task_submitted'`.

**Security:** This approach is crucial because it avoids exposing a general-purpose `UPDATE` endpoint. The function can only perform one specific, safe action, preventing any potential abuse.

---
## V1 Operations & Schema (Legacy Context)

### 1. User & Role Management (Still Active)
Access to the admin dashboard is controlled by a Role-Based Access Control (RBAC) system. The backend itself does **not** have a public-facing user registration for admins or recruiters.

**Creating New Team Members (Admins/Recruiters):**
The process for adding a new team member is **manual** and must be performed by an existing administrator with access to the Supabase project dashboard.
1.  **Invite the User:** Navigate to **Authentication** -> **Users** -> **"Invite user"**.
2.  **Create a Profile & Assign a Role:** Navigate to **Table Editor** -> `profiles` table -> **`+ Insert row`**.
    -   **`id`**: Enter the User ID of the new user (must match the `auth.users` table).
    -   **`role`**: Enter `admin` or `recruiter` (lowercase).

### 2. V1 Database Schema (Superseded)
The canonical source for the original database structure is the `supabase_schema.sql` file. This schema is now superseded by the V2 structure detailed above.