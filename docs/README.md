# Project Overhaul: "Take-a-Shot" ATS V2

## Vision: Lean, Evidence-Based Hiring

This project is a refactoring of the existing React/Supabase application to implement a lean, evidence-based hiring process. The goal is to move away from generic forms and CV uploads towards a 2-stage process that prioritizes social proof, psychometrics, and real-world work samples.

This approach aims to:

1.  **Reduce Bias:** Focus on objective skills and personality traits rather than resume prestige.
2.  **Increase Signal:** Gather high-quality, relevant data through targeted questions and work samples.
3.  **Improve Candidate Experience:** Create a more engaging and fair process for applicants.
4.  **Boost Recruiter Efficiency:** Provide structured, actionable insights for better decision-making.

---

## The New Workflow

The hiring process is now divided into three distinct stages:

### Stage 1: Public Application

The candidate visits the public portal and completes a streamlined application form. This form is designed to be quick yet insightful.

- **Submission:**
  - **Basics:** Standard contact information.
  - **Professional Profile:** A link to their LinkedIn, GitHub, or personal portfolio. This replaces the traditional CV upload.
  - **Project Highlight:** A concise, written description of a project they are proud of, focusing on their specific contribution.
  - **Personality Assessment:** A short, scientifically-validated Big Five (BFI-10) personality test.

### Stage 2: Recruiter Review & Task Invitation

The recruiter reviews the Stage 1 submission in the Admin Hub. The dashboard visualizes the candidate's Big Five scores and provides a direct link to their professional profile.

- **Decision:** If the profile is promising, the recruiter proceeds.
- **Action:** The recruiter clicks a "Copy Task Link" button, which generates a unique, secure URL for the candidate. This link is then manually sent to the candidate via email.

### Stage 3: Work Sample Submission (Invite-Only)

The candidate receives the link and accesses a secure, personalized page to complete a work sample.

- **Task:** The candidate is presented with a realistic case study or work-related problem.
- **Submission:** They provide their solution in a text area and submit it. This submission is tied to their initial application via a secure token.
- **Outcome:** The application status is updated, and the submitted work sample appears in the Admin Hub for the recruiter's final review.

---

This V2 architecture represents a strategic pivot towards a more effective and modern way of hiring talent.
