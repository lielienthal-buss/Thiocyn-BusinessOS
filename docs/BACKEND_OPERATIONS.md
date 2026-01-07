# Backend Operations & Notes

This document outlines key operational procedures and points to consider for the Supabase backend.

## 1. User & Role Management

Access to the admin dashboard is controlled by a Role-Based Access Control (RBAC) system. The backend itself does **not** have a public-facing user registration for admins or recruiters.

### Creating New Team Members (Admins/Recruiters)

The process for adding a new team member is **manual** and must be performed by an existing administrator with access to the Supabase project dashboard.

The process has two steps:

1.  **Invite the User:**
    *   Navigate to the **Authentication** section in your Supabase project.
    *   Under **Users**, click the **"Invite user"** button and send an invitation to the new member's email address.

2.  **Create a Profile & Assign a Role:**
    *   After the user has been invited, navigate to the **Table Editor**.
    *   Select the `profiles` table.
    *   Click **`+ Insert row`** to create a new profile for the user.
    *   **`id`**: Enter the User ID of the new user. You can find this in the `users` table under the `Authentication` section. It must match exactly.
    *   **`role`**: Enter the desired role in **lowercase**. The valid roles are:
        *   `admin`: Full access to all data and settings. Can delete applications.
        *   `recruiter`: Can view and update applications, but cannot delete them or change system-wide settings.

### Troubleshooting Access Issues

If a team member reports that they cannot see any application data after logging in, the cause is almost always an issue with their profile.

*   **Check the `profiles` table:** Ensure a profile exists for the user's `id`.
*   **Check the `role` column:** Verify that the role is spelled correctly (`admin` or `recruiter`) and is in lowercase.

## 2. Database Schema

The canonical source for the database structure is the `supabase_schema.sql` file in the root of this project. Any manual changes made in the Supabase UI should ideally be reflected back into this file to keep it in sync. The current schema is designed to be robust and scalable, with role-based security policies enforced at the database level.
