
# Architectural Decision Records (ADR)

## 1. Bento-Grid Layout System
**Decision**: Use a strict modular grid (Tailwind `grid-cols-12`) for all major UI sections.
**Reasoning**: Bento layouts provide high information density while maintaining clean visual hierarchy. It allows us to treat distinct parts of the application process (Files, Personality, Progress) as independent modules.

## 2. Visual Layer: Pure Glassmorphism
**Decision**: Standardize on `bg-white/40 backdrop-blur-md border-white/30`.
**Reasoning**: Creates a tactile, premium feel associated with modern OS designs (Apple, Windows 11), signaling that the hiring process is cutting-edge and professional.

## 3. Personality Assessment (Big Five)
**Decision**: Implementation of a 5-question baseline assessment stored as JSON in the `applications` table.
**Reasoning**: While not a full clinical test, it provides immediate behavioral context for the AI scoring engine (`gemini-3-pro-preview`) to generate more nuanced hiring summaries.

## 4. File Upload Constraints
**Decision**: Restriction to `application/pdf` only.
**Reasoning**: PDFs are the standard for professional documents and provide the safest surface area for AI text extraction and recruiter viewing.

## 5. Client-Side State Management
**Decision**: Use React state for form progression and `ThankYouView` toggle.
**Reasoning**: For a single-page portal, keeping state local to the components ensures zero-latency transitions between steps, improving conversion rates for applicants.

## 6. Admin Dashboard Authentication
**Decision**: Supabase Auth with an "Event-Based Demo Bypass".
**Reasoning**: Allows developers to evaluate the dashboard UI/UX even without active environment variables, while ensuring production data is protected by industry-standard JWT auth.

## 7. Legal Compliance & Language
**Decision**: Dedicated routes for Imprint and Privacy Policy, standardized in English.
**Reasoning**: To comply with EU/German regulations (TMG/GDPR) while maintaining a consistent international brand for Take A Shot GmbH. All automated processing and retention (30-day deletion) must be transparently documented.
