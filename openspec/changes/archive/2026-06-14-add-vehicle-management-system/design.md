## Context

This is a greenfield build. The repository is currently an agent-skills practice project (`src/skills/` only) with no application code. We are adding a full-stack vehicle management system with four screens (login, dashboard, vehicle management, employee management) and role-based access for administrators vs general users.

Constraints and context:
- Teaching/course project — clarity and conventional patterns are valued over cleverness.
- Development happens on Windows; Postgres and pgAdmin run via Docker Compose while the front end and back end run locally with hot reload.
- Decisions below were settled during an explore session and are intentionally biased toward the simplest design that meets the requirements.

## Goals / Non-Goals

**Goals:**
- Email/password login issuing a JWT, distinguishing `admin` and `user` roles.
- Vehicle CRUD for all authenticated users, with delete gated to admins.
- Employee (= account) CRUD restricted to admins.
- Dashboard with key-metric cards and charts driven by a server-side stats endpoint.
- Reproducible local Postgres + pgAdmin via Docker; schema and seed managed by Prisma.

**Non-Goals:**
- No relationship between vehicles and employees (no vehicle assignment / dispatch) in this iteration.
- No soft delete / audit history — deletes are permanent (with UI confirmation).
- No password reset, email verification, refresh tokens, or self-service registration.
- No containerization of the front end / back end (only the database tier is dockerized).
- No pagination/advanced filtering beyond basic list + search (kept minimal for now).

## Decisions

### Repository layout: `frontend/` + `backend/` at repo root
Two sibling folders, each its own npm package, plus a root `docker-compose.yml`. The existing `src/skills/` tooling is untouched.
- **Why:** Clear separation, simple mental model for a course project; each side has its own deps and scripts.
- **Alternatives:** Monorepo workspaces (pnpm/npm workspaces) — more machinery than this project needs.

### Employee record IS the login account (single `employees` table)
No separate `users` table. The `role` column (`admin` | `user`) drives authorization. Creating an employee provisions a login.
- **Why:** Matches the requirement that admins manage staff; avoids syncing two tables; fewer moving parts.
- **Alternative:** Separate `users` + `employees` — closer to real HR systems but unnecessary complexity here.

### JWT bearer auth + bcrypt
Login verifies the bcrypt hash and returns a JWT (payload: `sub`=employee id, `role`, `exp`). The front end stores the token and sends it as `Authorization: Bearer`. `GET /api/auth/me` restores session on reload.
- **Why:** Stateless, clean fit for separated front end / back end, the common teaching pattern.
- **Alternative:** httpOnly session cookies — safer against token theft but adds CORS/cookie/session-store handling.
- **Trade-off:** Token-in-JS is exposed to XSS; mitigated by short token lifetime and disciplined output escaping (React default).

### Authorization via Express middleware
Two middlewares: `requireAuth` (valid token → attaches `req.user`) and `requireAdmin` (role must be `admin`). Routes compose them: vehicle `DELETE`, all `/api/employees`, are admin-gated; other vehicle routes need only `requireAuth`.
- **Why:** Centralizes the permission matrix in one place; routes stay declarative.

### Prisma for data access + migrations + seed
`schema.prisma` defines `Employee` and `Vehicle` models with enums; `prisma migrate` manages schema; `prisma db seed` creates an initial admin and sample data.
- **Why:** Schema-first clarity, generated migrations, type-safe client — easiest to teach and maintain.
- **Alternatives:** Drizzle (lighter, SQL-like) or raw `pg` (most explicit, most boilerplate).

### Docker scope: Postgres + pgAdmin only
`docker-compose.yml` runs `postgres` and `pgadmin`; the apps run on the host (`npm run dev`).
- **Why:** Best dev experience (instant hot reload) while still giving a one-command database with a web admin UI.

### Front end: React + Vite + Tailwind + shadcn/ui + Magic UI, charts via Recharts
shadcn/ui provides the base components (forms, tables, dialogs); Magic UI adds polish/animation on the dashboard; Recharts (shadcn's charting base) renders the status-distribution and per-brand charts. React Router handles routing with an auth guard.

### Hard delete with mandatory UI confirmation
Deletes remove the row; the UI always shows a confirmation dialog first. Admins cannot delete their own account (prevents self-lockout).

## Data Model

```
Employee
  id            serial / cuid   PK
  name          text
  email         text            UNIQUE
  password_hash text
  role          enum(admin,user)
  department    text
  position      text
  phone         text
  hire_date     date
  status        enum(active,inactive)   default active
  created_at / updated_at  timestamptz

Vehicle
  id            serial / cuid   PK
  plate_no      text            UNIQUE
  brand         text
  model         text
  year          int
  status        enum(available,in_use,maintenance,retired)  default available
  mileage       int
  purchase_date date
  created_at / updated_at  timestamptz
```

## API Surface

```
POST   /api/auth/login          public      → { token, user }
GET    /api/auth/me             requireAuth → { user }

GET    /api/vehicles            requireAuth
POST   /api/vehicles            requireAuth
PATCH  /api/vehicles/:id        requireAuth
DELETE /api/vehicles/:id        requireAdmin

GET    /api/employees           requireAdmin
POST   /api/employees           requireAdmin
PATCH  /api/employees/:id       requireAdmin
DELETE /api/employees/:id       requireAdmin   (cannot delete self)

GET    /api/stats               requireAuth  → cards + chart datasets
```

## Risks / Trade-offs

- **JWT stored in browser is XSS-exposed** → short expiry, rely on React escaping, no `dangerouslySetInnerHTML`; cookie-based sessions remain a future option.
- **No refresh token** → token expiry forces re-login; acceptable for a course project.
- **Hard delete is irreversible** → mandatory confirmation dialog + self-delete guard reduce accidents; soft delete deferred.
- **Magic UI + shadcn version drift** (`shadcn@latest`) → pin versions in `package.json` after first install to keep the course reproducible.
- **Secret management** → `JWT_SECRET` and DB credentials come from `.env` (gitignored), with a committed `.env.example`.

## Migration Plan

1. `docker compose up -d` brings up Postgres + pgAdmin.
2. `prisma migrate dev` creates the schema; `prisma db seed` inserts the admin + sample rows.
3. No rollback strategy needed beyond dropping the volume / `prisma migrate reset` — there is no existing data.

## Implementation Notes (as built)

Intentional deviations made during implementation, kept for an accurate record:

- **`bcryptjs` instead of native `bcrypt`** — avoids native compilation on Windows; API-compatible.
- **Prisma pinned to v6** — Prisma 7 dropped `datasource.url` in schema files and requires driver adapters + `prisma.config.ts`; v6 keeps the simpler, well-documented workflow this design assumed.
- **Postgres published on host port `5433`** — the dev machine already runs a native Postgres on `5432`; the container is mapped to `5433` (`POSTGRES_PORT` / `DATABASE_URL`) to avoid the conflict.
- **pgAdmin default email `admin@example.com`** — pgAdmin rejects reserved domains like `.local`.
- **shadcn/ui components hand-added** — the interactive `shadcn init` CLI can't run in a non-TTY shell; the same component sources were authored directly under `src/components/ui`.

## Open Questions

- Second dashboard chart: "vehicles by brand" (chosen as default) vs "new vehicles over time" — can revisit during apply.
- Whether to add a `color` field to `Vehicle` — minor, decide when building the form.
- Token lifetime value (e.g., 1h vs 8h) — pick a sensible default during implementation.
