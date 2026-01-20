# Project Summary: Take A Shot - Hiring Tool

This document provides a high-level overview of the "Take A Shot" internal hiring tool, including its vision, features, architecture, and current status.

## 1. Vision & Goal

The project is an automated, modern hiring pipeline designed for startups. Its primary goal is to streamline the recruitment process for a moderate number of applicants (50-200) by leveraging a clean user interface and AI-powered analysis.

## 2. Core Features & Current Status

### Applicant-Facing Portal

- **Multi-Step Application Form:** A 3-step wizard guides applicants through the process (Basics, Experience, Personality).
  - Includes a new "Video Creation/Marketing" option for project interest.
  - Features enhanced glassmorphism styling for a more compelling visual experience.
- **DISC Personality Assessment:** A built-in questionnaire to gauge applicant work styles.
- **AI Chatbot:** An integrated AI guide to answer applicant questions.
- **Tagline:** "Ready to Take a Shot?" prominently displayed.

### Admin & Recruiter Dashboard

- **Centralized Dashboard (now "Admin Hub"):** A secure area for the hiring team to manage the entire pipeline. The navigation link "Pipeline" has been renamed to "Admin Hub".
- **Application Management:** View, filter, and manage all incoming applications.
  - **Pagination:** The application list now supports pagination for efficient handling of a large number of applications.
  - **AI Score Display:** AI scores are directly visible in the applicant detail view.
  - **Internal Notes:** Functionality for adding and viewing internal notes on applicant profiles is fully operational.
- **Kanban Board:** A drag-and-drop interface to move applicants through different stages of the hiring process (e.g., 'new', 'review', 'interview').
- **Role-Based Access Control (RBAC):** A secure system distinguishes between `admin` and `recruiter` roles, granting different levels of permissions. User management is manual, performed directly in Supabase.
- **KPI Dashboard (Insights View):** An integrated dashboard provides key performance indicators and insights into the hiring funnel and AI match distribution.
  - Features enhanced glassmorphism styling.
- **UI Enhancements:** Clickable text elements throughout the admin interface have been visually styled as buttons for improved clarity and user experience.

## 3. Technology Stack

- **Frontend:** React (with TypeScript)
- **Build Tool:** Vite
- **Styling:** Tailwind CSS (with enhanced glassmorphism effects)
- **Backend (BaaS):** Supabase
  - **Database:** Supabase Postgres
  - **Authentication:** Supabase Auth
  - **Security:** Row Level Security (RLS) with custom role management.
- **AI Integration:** Google Gemini (for Chatbot and potential AI scoring)

## 4. Architecture & Security

### Frontend Architecture

- The application is a Single Page Application (SPA) built with React.
- The UI is composed of modular components (e.g., `InputField`, `QuestionCard`).
- State management is handled within components using React hooks (`useState`, `useEffect`).
- All database interactions are centralized in a dedicated service layer (`lib/actions.ts`), separating UI from data logic.

### Backend & Security Model

- The backend relies on Supabase, utilizing its database and authentication services.
- **Security is enforced at the database level** using PostgreSQL's Row Level Security (RLS).
- The system implements **Role-Based Access Control (RBAC)** with two primary roles:
  - `recruiter`: Can view and update applications.
  - `admin`: Has full permissions, including deleting applications and managing settings.
- User roles are stored in a dedicated `public.profiles` table, which links a user's authentication ID to their role.
- A PostgreSQL function (`get_my_role()`) securely retrieves the current user's role for use in RLS policies.
- User creation and role assignment for admins/recruiters are performed manually in the Supabase dashboard.
