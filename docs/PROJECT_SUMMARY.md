# Project Summary: Take A Shot - Hiring Tool

This document provides a high-level overview of the "Take A Shot" internal hiring tool, including its vision, features, architecture, and technology stack.

## 1. Vision & Goal

The project is an automated, modern hiring pipeline designed for startups. Its primary goal is to streamline the recruitment process for a moderate number of applicants (50-200) by leveraging a clean user interface and AI-powered analysis.

## 2. Core Features

### Applicant-Facing Portal
*   **Multi-Step Application Form:** A 3-step wizard guides applicants through the process (Basics, Experience, Personality).
*   **DISC Personality Assessment:** A built-in questionnaire to gauge applicant work styles.
*   **AI Chatbot:** An integrated AI guide to answer applicant questions.

### Admin & Recruiter Dashboard
*   **Centralized Dashboard:** A secure area for the hiring team to manage the entire pipeline.
*   **Application Management:** View, filter, and manage all incoming applications.
*   **Kanban Board:** A drag-and-drop interface to move applicants through different stages of the hiring process (e.g., 'new', 'review', 'interview').
*   **Role-Based Access Control (RBAC):** A secure system distinguishes between `admin` and `recruiter` roles, granting different levels of permissions.
*   **Email Template Management:** A system for managing and using transactional email templates.
*   **KPI & Insights View:** A dashboard to track key performance indicators of the hiring funnel.

## 3. Technology Stack

*   **Frontend:** React (with TypeScript)
*   **Build Tool:** Vite
*   **Styling:** Tailwind CSS
*   **Backend (BaaS):** Supabase
    *   **Database:** Supabase Postgres
    *   **Authentication:** Supabase Auth
    *   **Security:** Row Level Security (RLS)
*   **AI Integration:** Google Gemini (for Chatbot and potential AI scoring)

## 4. Architecture & Security

### Frontend Architecture
*   The application is a Single Page Application (SPA) built with React.
*   The UI is composed of modular components (e.g., `InputField`, `QuestionCard`).
*   State management is handled within components using React hooks (`useState`, `useEffect`).
*   All database interactions are centralized in a dedicated service layer (`lib/actions.ts`), separating UI from data logic.

### Backend & Security Model
*   The backend relies on Supabase, utilizing its database and authentication services.
*   **Security is enforced at the database level** using PostgreSQL's Row Level Security (RLS).
*   The system implements **Role-Based Access Control (RBAC)** with two primary roles:
    *   `recruiter`: Can view and update applications.
    *   `admin`: Has full permissions, including deleting applications and managing settings.
*   User roles are stored in a dedicated `public.profiles` table, which links a user's authentication ID to their role.
*   A PostgreSQL function (`get_my_role()`) securely retrieves the current user's role for use in RLS policies.
