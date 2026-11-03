# Orbit — Real-Time Collaborative Task Manager

Orbit is a multi-organization collaborative task manager built with React, Express, Prisma, MySQL and Socket.IO. This repository extends the existing organization/project/task workflow with tenant-scoped workspaces, boards, columns and tenant memberships while preserving existing project/task records.

## Features

- JWT registration/login and authenticated REST endpoints.
- Organization creation and membership management (`OWNER`, `ADMIN`, `MEMBER`).
- Tenant creation per organization and tenant membership roles (`TENANT_ADMIN`, `MEMBER`).
- Board creation per tenant; boards have ordered columns and a linked project for compatibility with the existing task board.
- Task CRUD, status/priority, activity logs, optimistic version checks (`409 Conflict` for stale versions), and Socket.IO project rooms/presence.
- Tenant-scoped project/task reads and authenticated Socket.IO room joins.
- Additive MySQL migration; existing projects, tasks and activity logs are not dropped.

## Requirements

- Node.js 20+ recommended
- MySQL 8+
- npm

## Setup

### 1. Backend

```powershell
cd backend
npm install
```

Create `backend/.env` (never commit it):

```env
DATABASE_URL="mysql://USER:PASSWORD@localhost:3306/fde_task_manager"
JWT_SECRET="replace-with-a-long-random-secret"
PORT=5000
CLIENT_URL="http://localhost:5173"
```

Apply the additive migration to the same database used by the existing app:

```powershell
npx prisma migrate deploy
npx prisma generate
npm run dev
```

If your database is not tracked by the existing migration history, stop and inspect `npx prisma migrate status` before applying anything. Do not run `migrate reset` against data you need to keep. Back up the database first.

Backend health check: `http://localhost:5000/api/health`.

### 2. Frontend

In a second terminal:

```powershell
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`. The frontend uses `http://localhost:5000/api` by default. Optional overrides:

```env
VITE_API_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
```

## Tenant setup flow

1. Register and log in.
2. Create an organization. The creator is the organization `OWNER`.
3. Create a tenant from the tenant picker. Only organization `OWNER`/`ADMIN` can create tenants. The creator becomes `TENANT_ADMIN` for that tenant.
4. Create a board within the selected tenant. Four default columns are created: To Do, In Progress, Review and Done.
5. Create/register teammates, add them to the organization, then add them to the tenant using the member endpoints.
6. Create tasks on the board's linked project. Tenant members and organization admins can access the tenant's project/task data.

## Roles

| Role | Scope | Permissions |
|---|---|---|
| `OWNER` | Organization | Organization administration, tenant creation, and tenant administration |
| `ADMIN` | Organization | Organization membership management, tenant creation, and tenant administration |
| `TENANT_ADMIN` | Tenant | Manage tenant members, boards and columns |
| `MEMBER` | Tenant | Work with tasks in authorized tenant projects |

Legacy organization `MEMBER` records do not automatically grant tenant membership. This is intentional: membership in an organization alone must not grant access to each tenant's private project/task data.

## Documentation

- [API and WebSocket reference](docs/API.md)
- [Database schema and migration notes](docs/DATABASE.md)
- [Testing checklist](docs/TESTING.md)
- [Database ER diagram (PNG)](docs/database-erd.png)
- [Editable ER diagram (SVG)](docs/database-erd.svg)

## Notes and limitations

- This is an assignment prototype, not a production-hardened service. Add rate limiting, email verification, password reset, structured logging, stronger request schemas, and automated integration tests before production use.
- The optional AI service described in the assignment guide is not implemented because it is explicitly optional; tenant isolation, authorization, CRUD and real-time collaboration take priority.
- The schema retains the existing `Project` model and links each new `Board` to a project so the existing frontend/task APIs continue to work.
