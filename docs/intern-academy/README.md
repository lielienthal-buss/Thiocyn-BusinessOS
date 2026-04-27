# Hartlimes Intern Academy

The structured 12-week internship programme for the House of Sustainable Brands.

## Documents in this folder

| File | What it covers |
|------|---------------|
| [thiocyn-employment-onboarding.md](./thiocyn-employment-onboarding.md) | Universal Day-1 setup for every hire (paperwork, accounts, tools, buddy pairing). All hires go through Thiocyn GmbH. |
| [fellowship-agreement-template.md](./fellowship-agreement-template.md) | Fellowship-Agreement template (unpaid, international, 12 weeks, GDPR + NDA + IP). **DRAFT — legal review required.** |
| [monday-meeting-template.md](./monday-meeting-template.md) | The 3-part Monday meeting structure, weekly cadence, themes, and anti-patterns |
| [assessment-rubrics.md](./assessment-rubrics.md) | Scoring criteria for the Month 1, Month 2, and Graduation assessments |
| [specialisation-tracks.md](./specialisation-tracks.md) | The 5 tracks (Growth, Creative, Ops, AI, Finance) with example Big Target projects |
| [buddy-program.md](./buddy-program.md) | Buddy pairing rules, cadence, conversation starters, and the buddy → admin feedback loop |
| [program-buildout-roadmap.md](./program-buildout-roadmap.md) | Luis's original 4-week buildout plan + delivery status (which features are live, partial, pending) |
| [brand-walkthroughs/](./brand-walkthroughs/) | Short brand-intro 1-pagers per portfolio brand (Thiocyn, Dr. Severin, Take A Shot, Paigh, Timber & John, Wristr) |

## How the programme runs in Business OS

- **Database:** intern data lives in `intern_accounts` (extended with phase, level, track, buddy, admin_notes)
- **Goals:** `intern_goals` (3 personal goals set in Week 1)
- **Milestones:** `intern_milestones` (Rookie → Explorer → Contributor → Builder → Owner → Graduated)
- **Assignments:** `intern_assignments` (instances) created from `assignment_templates` (reusable definitions)
- **Monday meetings:** `monday_meetings` + `intern_meeting_attendance`

## Roles

- **Programme owner:** Luis
- **Programme lead:** Danylo Kutsiuk — runs onboarding, Monday meetings, day-to-day intern operations
- **Track leads:** assigned per cohort based on which tracks interns pick
- **Buddies:** full-time employees, paired with interns in Week 1

> Note: Tom Roelants co-created this framework as the original programme lead (March–April 2026). After his exit, Danylo Kutsiuk took over the role on 2026-04-23.

## Cohort flow at a glance

```
Week 1     Onboarding (Phase 1)         → Rookie 🌱
Weeks 2–4  Foundation: CS Academy        → Month 1 Pitch (Week 4) → Explorer 🧭
Weeks 5–8  Specialisation: Big Target    → Month 2 Pitch (Week 8) → Contributor ⚡ / Builder 🛠
Weeks 9–12 Ownership: Function lead      → Graduation Project (Week 12) → Owner 👑 → Graduated 🎓
```

## Add a new intern

1. In the academy view, click **+ Add Intern**
2. Fill in name, email, department, brand, AI Senior token budget
3. The system auto-creates the auth user, the 6 onboarding assignments, and the Rookie milestone
4. Send the invite (manually for now until Resend domain is verified)
5. Assign a buddy in Week 1

## Advance an intern's phase

In the academy view, expand the intern card and click **Advance →** in the Phase Status section. This:
- Updates the intern's phase + level
- Grants the next milestone
- Auto-creates assignments for the new phase

The action is intentional — there's no auto-advance based on completed assignments. Danylo or Luis decides when an intern is ready.
