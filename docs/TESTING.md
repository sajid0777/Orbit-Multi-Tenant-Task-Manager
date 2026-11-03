# Manual test checklist

This is a test plan, not a claim that every scenario has already passed. Run it against a disposable test database first.

## 1. Baseline
- [ ] Backend starts and `GET /api/health` reports database connected.
- [ ] Register, login, fetch profile, logout, and login again.
- [ ] Existing organizations, projects, tasks, and activity logs remain available after migration.

## 2. Organization and roles
- [ ] Create organization; creator is `OWNER`.
- [ ] Add a registered user as `MEMBER`; reject unknown email.
- [ ] Confirm a normal member cannot add organization members or create tenants.
- [ ] Confirm `OWNER`/`ADMIN` can create tenants.

## 3. Tenant isolation
- [ ] Create two tenants in one organization.
- [ ] Add different users to each tenant.
- [ ] Verify tenant list is scoped to memberships, except org admins who manage tenants.
- [ ] Verify tenant A member cannot list tenant B boards or access tenant B project/task IDs.
- [ ] Verify editing a tenant ID in a request does not bypass membership checks.
- [ ] Verify a tenant member cannot add users unless they are already members of the organization.

## 4. Board, column, and task CRUD
- [ ] Create board and confirm four default columns.
- [ ] Add, rename, reorder, and delete a column as tenant admin.
- [ ] Confirm a member cannot manage boards/columns.
- [ ] Create, edit, move, and delete tasks using the linked `board.projectId`.
- [ ] Verify activity log rows are written for task changes.

## 5. Realtime and concurrency
- [ ] Open two browser sessions as two users authorized for the same tenant project.
- [ ] Create/update/delete a task in one session; confirm the other receives events without refresh.
- [ ] Confirm a user in another tenant does not receive the room's events.
- [ ] Submit two updates with the same task version; stale update must return `409`.
- [ ] Disconnect/reconnect and refetch the latest board state.

## 6. Regression and UX
- [ ] Switch organizations and tenants.
- [ ] Verify project list reflects the selected tenant.
- [ ] Test empty states, validation messages, API failures, refresh and mobile layout.
- [ ] Check server logs for unhandled exceptions.
