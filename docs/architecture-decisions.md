# Architectural Decision Records (ADR)

---
## V2 Architectural Decisions (As of Jan 2026)
*This section documents the major architectural changes for the V2 overhaul.*

### ADR-V2.1: Two-Stage Application & Workflow
**Decision**: Implement a 3-stage workflow (`applied` -> `task_requested` -> `task_submitted`) managed by a `stage` column in the `applications` table.
**Reasoning**: To move from a single, high-friction form to a lean, multi-stage process. Stage 1 captures essential data with low effort. Stage 3 (Work Sample) is invite-only, ensuring only promising candidates invest significant time, which respects the candidate's time and improves recruiter efficiency.

### ADR-V2.2: Secure Work Sample Submission via RPC
**Decision**: Create a Supabase RPC function `submit_task_response(p_token uuid, p_answer text)` to handle Stage 3 submissions.
**Reasoning**: A candidate submitting a work sample is not authenticated. Standard RLS policies would either be too permissive (allowing any anonymous user to update any row) or too restrictive. Using a secure, single-purpose RPC function that requires a unique `access_token` ensures that only the correct candidate can update their specific application.

### ADR-V2.3: Personality Assessment - BFI-10 Scale
**Decision**: Replace the previous personality assessment with the 10-item Big Five Inventory (BFI-10).
**Reasoning**: The BFI-10 is a scientifically validated, efficient measure of the Big Five personality traits. Its structured 1-5 Likert scale allows for quantitative scoring (into a `psychometrics` JSONB field), providing objective, comparable data for recruiters and reducing subjective interpretation.

### ADR-V2.4: Professional Profile URL as Primary Proof
**Decision**: Replace all file uploads with a single, required URL field for a LinkedIn, GitHub, or portfolio URL.
**Reasoning**: This aligns with the "lean" hiring principle. It reduces friction for the candidate (no need to prepare a PDF) and provides recruiters with "social proof" and a dynamic, up-to-date view of the candidate's professional history and work.

---
## V1 Architectural Decisions (Historical Context)
*These are the original decisions for the project. Their current status is noted.*

### 1. Bento-Grid Layout System
**Status**: Active
**Decision**: Use a strict modular grid (Tailwind `grid-cols-12`) for all major UI sections.
**Reasoning**: Bento layouts provide high information density while maintaining clean visual hierarchy. It allows us to treat distinct parts of the application process (Files, Personality, Progress) as independent modules.

### 2. Visual Layer: Pure Glassmorphism
**Status**: Active
**Decision**: Standardize on `bg-white/40 backdrop-blur-md border-white/30`.
**Reasoning**: Creates a tactile, premium feel associated with modern OS designs (Apple, Windows 11), signaling that the hiring process is cutting-edge and professional.

### 3. Personality Assessment (Big Five)
**Status**: Amended. See **ADR-V2.3**.
**Decision**: Implementation of a 5-question baseline assessment stored as JSON in the `applications` table.
**Reasoning**: While not a full clinical test, it provides immediate behavioral context for the AI scoring engine (`gemini-3-pro-preview`) to generate more nuanced hiring summaries.

### 4. File Upload Constraints
**Status**: Superseded. See **ADR-V2.4**.
**Decision**: Restriction to `application/pdf` only.
**Reasoning**: PDFs are the standard for professional documents and provide the safest surface area for AI text extraction and recruiter viewing.

### 5. Client-Side State Management
**Status**: Active
**Decision**: Use React state for form progression and `ThankYouView` toggle.
**Reasoning**: For a single-page portal, keeping state local to the components ensures zero-latency transitions between steps, improving conversion rates for applicants.

### 6. Admin Dashboard Authentication
**Status**: Active
**Decision**: Supabase Auth with an "Event-Based Demo Bypass".
**Reasoning**: Allows developers to evaluate the dashboard UI/UX even without active environment variables, while ensuring production data is protected by industry-standard JWT auth.

### 7. Legal Compliance & Language
**Status**: Active
**Decision**: Dedicated routes for Imprint and Privacy Policy, standardized in English.
**Reasoning**: To comply with EU/German regulations (TMG/GDPR) while maintaining a consistent international brand for Take A Shot GmbH. All automated processing and retention (30-day deletion) must be transparently documented.