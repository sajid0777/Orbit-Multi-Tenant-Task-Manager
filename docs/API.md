# Orbit API and WebSocket Reference

All endpoints below are relative to `http://localhost:5000/api`. Authenticated endpoints require `Authorization: Bearer <JWT>`. JSON request bodies use `Content-Type: application/json`.

## Authentication

| Method | Path | Purpose |
|---|---|---|
| POST | `/auth/register` | Register a user |
| POST | `/auth/login` | Login and receive a JWT |
| GET | `/auth/profile` | Get current user profile |

## Organizations and memberships

| Method | Path | Body / purpose |
|---|---|---|
| POST | `/organizations` | `{ "name": "ABC Technologies" }`; creator becomes `OWNER` |
| GET | `/organizations` | List organizations current user belongs to |
| GET | `/organizations/:organizationId/members` | List organization members |
| POST | `/organizations/:organizationId/members` | `{ "email": "registered@example.com", "role": "ADMIN" }` or `MEMBER`; organization admin only |

A user must register before an organization admin can add them. The `OWNER` role cannot be assigned through the member-management endpoint.

## Tenants

| Method | Path | Body / purpose |
|---|---|---|
| GET | `/tenants/organization/:organizationId` | List tenants visible to the user in an organization |
| POST | `/tenants` | `{ "organizationId": "...", "name": "Hyderabad" }`; organization `OWNER`/`ADMIN` only |
| GET | `/tenants/:tenantId/members` | List tenant memberships; tenant members or org admins |
| POST | `/tenants/:tenantId/members` | `{ "email": "registered@example.com", "role": "MEMBER" }`; org or tenant admin only |

Tenant membership roles are `TENANT_ADMIN` and `MEMBER`. A user must already be an organization member before being added to one of its tenants. Adding an existing tenant member again updates their role.

## Boards and columns

| Method | Path | Body / purpose |
|---|---|---|
| GET | `/boards/tenant/:tenantId` | List authorized tenant boards with ordered columns |
| POST | `/boards` | `{ "tenantId": "...", "name": "Product Development", "description": "..." }`; tenant admin or org admin |
| POST | `/boards/columns` | `{ "boardId": "...", "name": "Blocked", "position": 4 }`; tenant admin or org admin |
| PATCH | `/boards/columns/:columnId` | `{ "name": "QA", "position": 3 }`; tenant admin or org admin |
| DELETE | `/boards/columns/:columnId` | Delete a column; tasks linked to it retain the task but have `columnId` set to null |
| DELETE | `/boards/:boardId` | Delete a board and its linked project/tasks; tenant admin or org admin |

Creating a board creates a linked legacy `Project` and four default columns. The linked project ID is returned as `board.projectId` and can be used with the existing task APIs.

## Projects and tasks (existing API)

| Method | Path | Purpose |
|---|---|---|
| POST | `/projects` | Create a project; body includes `name`, `organizationId`, optional `description` and optional `tenantId` |
| GET | `/projects/organization/:organizationId` | List projects visible to current user |
| POST | `/tasks` | Create a task; include `title`, `projectId`, optional `description`, `status`, `priority`, `assigneeId`, `dueDate` |
| GET | `/tasks/project/:projectId` | List tasks in an authorized project |
| PATCH | `/tasks/:taskId` | Update task fields; include current integer `version` |
| DELETE | `/tasks/:taskId` | Delete a task in an authorized project |

Statuses: `TODO`, `IN_PROGRESS`, `IN_REVIEW`, `DONE`. Priorities: `LOW`, `MEDIUM`, `HIGH`, `URGENT`. A stale task version returns `409 Conflict`; fetch the current task and retry with its latest version. Task creation/update/deletion is logged in `ActivityLog` by the existing task controller.

## WebSocket events

Connect to `http://localhost:5000` using Socket.IO with `auth: { token: <JWT> }`.

| Event | Direction | Payload / behavior |
|---|---|---|
| `join_project` | Client → server | Project ID; server checks organization membership and tenant membership/admin scope before joining `project:<id>` |
| `leave_project` | Client → server | Project ID; leave authorized joined room |
| `task_created` | Server → clients | Created task event in project room |
| `task_updated` | Server → clients | Updated task event in project room |
| `task_deleted` | Server → clients | Deleted task event in project room |
| `presence_update` | Server → clients | Project ID, unique online users, online count |

A failed room join returns a callback `{ success: false, message: "..." }`. Clients should fetch the current board state after reconnecting rather than relying on missed events.

## Error behavior

- `400`: invalid or missing input.
- `401`: missing/invalid authentication token.
- `403`: authenticated user lacks required organization/tenant role.
- `404`: resource not found or intentionally concealed due to access restrictions.
- `409`: stale task version / concurrent edit conflict.
- `500`: unexpected server error; check backend logs.
