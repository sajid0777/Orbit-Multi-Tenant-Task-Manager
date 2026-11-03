# Database design and migration notes

## Hierarchy

`Organization → Tenant → Board → BoardColumn → Task`

A `Board` belongs to exactly one tenant and organization. A board has ordered columns. Each board is linked one-to-one with a legacy `Project` so existing project/task APIs and UI can continue working. Tasks keep their required `projectId` and optionally reference `boardId` and `columnId` for new tenant boards.

## Tables

- `Organization`: top-level organization/workspace.
- `User`: login identity.
- `Membership`: organization-level membership (`OWNER`, `ADMIN`, `MEMBER`).
- `Tenant`: independent workspace inside an organization; `(organizationId, slug)` is unique.
- `TenantMembership`: tenant-specific user membership and role; `(tenantId, userId)` is unique, so a user can belong to multiple tenants.
- `Board`: tenant-scoped Kanban board; linked to a `Project`.
- `BoardColumn`: ordered columns for a board.
- `Project`: retained existing model; new tenant boards create a linked project.
- `Task`: task data, version, optional board/column references.
- `ActivityLog`: audit history for task changes.

## Isolation rules

- Organization membership is checked before organization operations.
- Tenant data is visible to a tenant member or an organization `OWNER`/`ADMIN` with tenant-administration permissions.
- A normal organization `MEMBER` does not automatically gain access to every tenant.
- Project and task access checks include tenant membership for tenant-scoped projects.
- Socket.IO room joins repeat the authorization check; a client-supplied project ID is not trusted by itself.
- User assignment must remain within the same organization; tenant member management requires organization membership first.

## Migration safety

`20261102100000_add_tenants_boards` is intended to be additive. It creates tenant and board tables, adds nullable `Project.tenantId` and nullable `Task.boardId`/`Task.columnId`, and adds indexes/foreign keys. It does not drop old project/task/activity data. Existing projects remain legacy projects with `tenantId = NULL` until explicitly associated with a tenant.

Before applying in an existing database:

1. Export a database backup.
2. Run `npx prisma migrate status`.
3. Confirm the existing migration history matches the database.
4. Run `npx prisma migrate deploy` and `npx prisma generate`.
5. Verify `/api/health` and existing projects/tasks.

Do not run `prisma migrate reset` against a database containing data you need to preserve.
