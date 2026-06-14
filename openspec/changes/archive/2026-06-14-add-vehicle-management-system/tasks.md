## 1. Database & infrastructure

- [x] 1.1 Add root `docker-compose.yml` with `postgres` and `pgadmin` services and a named volume
- [x] 1.2 Add `.env.example` (DB credentials, `DATABASE_URL`, `JWT_SECRET`, ports) and gitignore `.env`
- [x] 1.3 Bring up the stack (`docker compose up -d`) and confirm pgAdmin connects to Postgres

## 2. Backend foundation

- [x] 2.1 Scaffold `backend/` npm package (ESM) with Express, scripts (`dev`, `start`), and dotenv
- [x] 2.2 Add dependencies: express, cors, jsonwebtoken, bcrypt, @prisma/client, prisma (dev)
- [x] 2.3 Initialize Prisma; define `Employee` and `Vehicle` models + enums in `schema.prisma` per design
- [x] 2.4 Run initial `prisma migrate` to create the tables
- [x] 2.5 Write `prisma db seed` creating one admin account (hashed password) and sample vehicles/employees
- [x] 2.6 Set up Express app: JSON body parsing, CORS for the front end, health route, error handler

## 3. Authentication & authorization (backend)

- [x] 3.1 Implement `POST /api/auth/login`: look up by email, verify bcrypt hash, reject inactive, issue JWT
- [x] 3.2 Implement `requireAuth` middleware: validate Bearer token, attach `req.user`, 401 on missing/invalid
- [x] 3.3 Implement `requireAdmin` middleware: 403 when `req.user.role !== 'admin'`
- [x] 3.4 Implement `GET /api/auth/me` returning the current employee's public profile
- [x] 3.5 Ensure password hashes are never returned in any response payload

## 4. Vehicles API

- [x] 4.1 `GET /api/vehicles` and `GET /api/vehicles/:id` (requireAuth)
- [x] 4.2 `POST /api/vehicles` with validation: required fields, unique `plate_no`, valid `status` enum
- [x] 4.3 `PATCH /api/vehicles/:id` (requireAuth) with 404 for unknown id
- [x] 4.4 `DELETE /api/vehicles/:id` gated by `requireAdmin`

## 5. Employees API

- [x] 5.1 `GET /api/employees` and `GET /api/employees/:id` (requireAdmin)
- [x] 5.2 `POST /api/employees`: unique email, hash initial password, set role; 400 on duplicate email
- [x] 5.3 `PATCH /api/employees/:id` (requireAdmin) for profile/role/status
- [x] 5.4 `DELETE /api/employees/:id` (requireAdmin) with self-delete guard

## 6. Stats API

- [x] 6.1 `GET /api/stats` (requireAuth) returning card counts (total/available/maintenance vehicles, total employees)
- [x] 6.2 Include chart datasets: vehicle status distribution and per-brand counts

## 7. Frontend foundation

- [x] 7.1 Scaffold `frontend/` with Vite + React + React Router
- [x] 7.2 Install and configure Tailwind; initialize shadcn/ui and add Magic UI components
- [x] 7.3 Add an API client that injects the `Authorization: Bearer` header and handles 401
- [x] 7.4 Add an auth context/store: persist token, expose `user`/`role`, login/logout
- [x] 7.5 Add a protected-route guard that redirects unauthenticated users to `/login`

## 8. Login page

- [x] 8.1 Build `/login` form (email, password) using shadcn form components
- [x] 8.2 Wire submit to `POST /api/auth/login`, store token + user, redirect to dashboard
- [x] 8.3 Show an inline error on invalid credentials / inactive account

## 9. App shell & navigation

- [x] 9.1 Build authenticated layout with nav; hide the Employees link for non-admins
- [x] 9.2 Add logout action that clears the token and returns to `/login`

## 10. Dashboard page

- [x] 10.1 Fetch `GET /api/stats` and render the four key-metric cards
- [x] 10.2 Render the vehicle status distribution chart and per-brand chart with Recharts

## 11. Vehicle management page

- [x] 11.1 List vehicles in a shadcn table with basic search
- [x] 11.2 Create/edit vehicle dialog with field validation
- [x] 11.3 Delete action visible only to admins, behind a confirmation dialog

## 12. Employee management page (admin only)

- [x] 12.1 Route/page accessible only to admins (guarded client-side, enforced server-side)
- [x] 12.2 List employees in a table
- [x] 12.3 Create/edit employee dialog (email, password on create, role, profile fields)
- [x] 12.4 Delete action behind confirmation, disabled for the current user's own row

## 13. End-to-end verification

- [x] 13.1 Seeded admin can log in; general user sees no Employees nav and gets 403 on employee endpoints
- [x] 13.2 General user can create/edit a vehicle but cannot delete; admin can delete
- [x] 13.3 Dashboard cards and charts reflect seeded data
- [x] 13.4 Document run steps (docker up, migrate, seed, backend dev, frontend dev) in `README`
