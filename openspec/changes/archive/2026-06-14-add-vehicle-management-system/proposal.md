## Why

The organization needs a single place to track its vehicle fleet and the staff who use the system, with access controlled by role. Today there is no application at all (the repo is a greenfield skills-practice project), so we are introducing a full-stack vehicle management system that lets staff manage vehicles and lets administrators manage staff accounts, backed by a dashboard that surfaces key fleet metrics at a glance.

## What Changes

- Add a **login page** with email/password authentication that issues a JWT and distinguishes administrators from general users.
- Add a **dashboard** home page showing key-metric cards (total vehicles, available, in maintenance, total employees) and charts (vehicle status distribution + vehicles by brand / new vehicles over time).
- Add a **vehicle management** page where any authenticated user can view, create, and edit vehicles; **deleting a vehicle is restricted to administrators**.
- Add an **employee management** page restricted to administrators for full CRUD of employee accounts. Because an employee record *is* a login account, creating an employee provisions a login with a role.
- Stand up the supporting stack: React (Vite) + Tailwind + shadcn/ui + Magic UI front end, an Express (ESM) JSON API, a Postgres database accessed through Prisma, and a Docker Compose setup running Postgres + pgAdmin.
- Seed an initial administrator account plus sample vehicles and employees for first login and testing.

## Capabilities

### New Capabilities
- `authentication`: Email/password login, bcrypt password verification, JWT issuance and validation, and the role identity (`admin` / `user`) that authorization decisions across the system depend on.
- `vehicle-management`: Listing, viewing, creating, editing, and deleting vehicles, with create/edit available to all authenticated users and delete restricted to administrators.
- `employee-management`: Administrator-only listing, viewing, creating, editing, and deleting of employee accounts (which double as login accounts with an assigned role).
- `dashboard`: Aggregated fleet metrics presented as key-figure cards and charts on the authenticated home page.

### Modified Capabilities
<!-- None. This is a greenfield system; openspec/specs/ is currently empty. -->

## Impact

- **New code**: `frontend/` (React + Vite app) and `backend/` (Express API + Prisma) directories at the repo root; a root `docker-compose.yml` for Postgres + pgAdmin.
- **Database**: New Postgres instance with `employees` and `vehicles` tables managed via Prisma migrations, plus a seed script.
- **Dependencies (new)**: react, react-dom, vite, tailwindcss, shadcn/ui + Magic UI components, recharts, react-router; express, @prisma/client, prisma, jsonwebtoken, bcrypt, cors, dotenv.
- **APIs (new)**: `POST /api/auth/login`, `GET /api/auth/me`; `/api/vehicles` CRUD (DELETE admin-only); `/api/employees` CRUD (admin-only); `GET /api/stats`.
- **Unaffected**: The existing `src/skills/` practice files and the agent-skill tooling are left untouched.
