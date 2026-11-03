import { useCallback, useEffect, useMemo, useState } from "react";
import { io } from "socket.io-client";
import {
DndContext,
PointerSensor,
closestCorners,
useSensor,
useSensors,
} from "@dnd-kit/core";
import {
SortableContext,
useSortable,
verticalListSortingStrategy,
arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
Activity,
AlertCircle,
ArrowDownUp,
ArrowRight,
Bell,
CalendarDays,
Check,
CheckCircle2,
ChevronDown,
CircleHelp,
Clock3,
Command,
FolderKanban,
LayoutDashboard,
LogOut,
Menu,
MessageSquare,
Plus,
Search,
Settings2,
ShieldCheck,
Sparkles,
Users,
X,
Zap,
} from "lucide-react";
import api from "./services/api";
import "./App.css";

const STATUSES = [
{ id: "TODO", label: "To do", color: "#8790a5" },
{ id: "IN_PROGRESS", label: "In progress", color: "#7166e8" },
{ id: "IN_REVIEW", label: "In review", color: "#e6a23c" },
{ id: "DONE", label: "Done", color: "#31a878" },
];

const PRIORITIES = {
LOW: { label: "Low", color: "low" },
MEDIUM: { label: "Medium", color: "medium" },
HIGH: { label: "High", color: "high" },
URGENT: { label: "Urgent", color: "urgent" },
};

const getErrorMessage = (error) =>
error.response?.data?.message ||
error.message ||
"Something went wrong. Please try again.";

function Avatar({ name = "U", size = "normal" }) {
const initials = name
.split(/[\s@._-]+/)
.filter(Boolean)
.slice(0, 2)
.map((part) => part[0].toUpperCase())
.join("");

return (
<span className={`avatar avatar-${size}`} title={name}>
{initials || "U"} </span>
);
}

function Modal({ title, subtitle, onClose, children }) {
useEffect(() => {
const handleKey = (event) => {
if (event.key === "Escape") onClose();
};
window.addEventListener("keydown", handleKey);
return () => window.removeEventListener("keydown", handleKey);
}, [onClose]);

return ( <div className="modal-backdrop" onMouseDown={onClose}>
<section
className="modal"
onMouseDown={(event) => event.stopPropagation()}
> <div className="modal-heading"> <div> <h2>{title}</h2>
{subtitle && <p>{subtitle}</p>} </div> <button className="icon-button" onClick={onClose} aria-label="Close"> <X size={19} /> </button> </div>
{children} </section> </div>
);
}

function TaskCard({ task, onEdit }) {
const {
attributes,
listeners,
setNodeRef,
transform,
transition,
isDragging,
} = useSortable({ id: task.id });

const style = {
transform: CSS.Transform.toString(transform),
transition,
opacity: isDragging ? 0.45 : 1,
};

const priority = PRIORITIES[task.priority] || PRIORITIES.MEDIUM;

return (
<article
ref={setNodeRef}
style={style}
className="task-card"
{...attributes}
{...listeners}
onClick={() => onEdit(task)}
> <div className="task-card-top">
<span className={`priority-tag priority-${priority.color}`}> <span className="priority-dot" />
{priority.label} </span>
<button
className="task-more"
title="Edit task"
onPointerDown={(event) => event.stopPropagation()}
onClick={(event) => {
event.stopPropagation();
onEdit(task);
}}
>
··· </button> </div>

 
  <h4>{task.title}</h4>
  {task.description && <p className="task-description">{task.description}</p>}

  <div className="task-card-bottom">
    <div className="task-meta">
      <span className="task-version">v{task.version || 1}</span>
      {task.dueDate && (
        <span className="task-due">
          <CalendarDays size={12} />
          {new Date(task.dueDate).toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
          })}
        </span>
      )}
    </div>
    <div className="task-people">
      {task.assignee ? (
        <Avatar name={task.assignee.name || task.assignee.email} size="small" />
      ) : (
        <span className="unassigned-avatar" title="Unassigned">
          <Plus size={12} />
        </span>
      )}
    </div>
  </div>
</article>
 

);
}

function AuthScreen({ onAuthenticated }) {
const [mode, setMode] = useState("login");
const [name, setName] = useState("");
const [email, setEmail] = useState("");
const [password, setPassword] = useState("");
const [loading, setLoading] = useState(false);
const [error, setError] = useState("");

async function handleSubmit(event) {
event.preventDefault();
setError("");
setLoading(true);

 
try {
  if (mode === "register") {
    await api.post("/auth/register", { name, email, password });
  }

  const response = await api.post("/auth/login", { email, password });
  localStorage.setItem("token", response.data.token);
  localStorage.setItem("user", JSON.stringify(response.data.user));
  onAuthenticated(response.data.user);
} catch (err) {
  setError(getErrorMessage(err));
} finally {
  setLoading(false);
}
 

}

return ( <main className="auth-page"> <section className="auth-showcase"> <div className="auth-brand"> <span className="brand-mark"><Command size={22} /></span> <span>orbit<span className="brand-dot">.</span></span> </div> <div className="showcase-copy"> <span className="eyebrow"><Sparkles size={14} /> YOUR TEAM, IN SYNC</span> <h1>Good work<br />happens <span>together.</span></h1> <p>One shared space for your team's ideas, tasks, and momentum.</p> <div className="showcase-preview"> <div className="preview-top"> <span className="preview-dot" /> <span className="preview-dot" /> <span className="preview-dot" /> <span className="preview-label">TEAM WORKSPACE</span> </div> <div className="preview-content"> <div className="preview-line long" /> <div className="preview-line short" /> <div className="preview-task"> <span className="preview-task-icon"><Check size={14} /></span> <div><strong>Ship something great</strong><small>Design · Development</small></div> <span className="preview-complete">Done</span> </div> <div className="preview-task"> <span className="preview-task-icon purple"><Zap size={14} /></span> <div><strong>Bring the team together</strong><small>Collaboration · Planning</small></div> <span className="preview-progress">In progress</span> </div> </div> </div> </div> <p className="auth-footer">Less busywork. More meaningful work.</p> </section>

 
  <section className="auth-panel">
    <div className="auth-mobile-brand">
      <span className="brand-mark"><Command size={20} /></span>
      orbit<span className="brand-dot">.</span>
    </div>
    <div className="auth-form-wrap">
      <span className="auth-kicker">{mode === "login" ? "WELCOME BACK" : "GET STARTED"}</span>
      <h2>{mode === "login" ? "Sign in to Orbit" : "Create your account"}</h2>
      <p className="auth-subtitle">
        {mode === "login"
          ? "Your team's next great idea is waiting."
          : "Create an account to start collaborating."}
      </p>

      <form onSubmit={handleSubmit} className="auth-form">
        {mode === "register" && (
          <label>
            Full name
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Your name"
              autoComplete="name"
              required
            />
          </label>
        )}
        <label>
          Email address
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@company.com"
            autoComplete="email"
            required
          />
        </label>
        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="At least 8 characters"
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            minLength={mode === "register" ? 8 : undefined}
            required
          />
        </label>
        {error && <div className="form-error"><AlertCircle size={16} />{error}</div>}
        <button className="button button-primary auth-submit" disabled={loading}>
          {loading ? "Please wait..." : mode === "login" ? "Sign in" : "Create account"}
          {!loading && <ArrowRight size={17} />}
        </button>
      </form>

      <div className="auth-switch">
        {mode === "login" ? "New to Orbit?" : "Already have an account?"}
        <button onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); }}>
          {mode === "login" ? "Create an account" : "Sign in"}
        </button>
      </div>
      <div className="auth-secure"><ShieldCheck size={15} /> Your workspace is private and secure.</div>
    </div>
  </section>
</main>
 

);
}

function App() {
const [user, setUser] = useState(() => {
try {
return JSON.parse(localStorage.getItem("user") || "null");
} catch {
return null;
}
});
const [organizations, setOrganizations] = useState([]);
const [organizationMenuOpen, setOrganizationMenuOpen] = useState(false);
const [organization, setOrganization] = useState(null);
const [tenants, setTenants] = useState([]);
const [activeTenant, setActiveTenant] = useState(null);
const [tenantName, setTenantName] = useState("");
const [boardForm, setBoardForm] = useState({ name: "", description: "" });
const [projects, setProjects] = useState([]);
const [project, setProject] = useState(null);
const [tasks, setTasks] = useState([]);
const [onlineUsers, setOnlineUsers] = useState([]);
const [loading, setLoading] = useState(false);
const [notice, setNotice] = useState("");
const [error, setError] = useState("");
const [search, setSearch] = useState("");
const [sidebarOpen, setSidebarOpen] = useState(false);
const [modal, setModal] = useState("");
const [editingTask, setEditingTask] = useState(null);
const [taskActivity, setTaskActivity] = useState([]);
const [organizationName, setOrganizationName] = useState("");
const [members, setMembers] = useState([]);
const [memberEmail, setMemberEmail] = useState("");
const [memberRole, setMemberRole] = useState("MEMBER");
const [memberLoading, setMemberLoading] = useState(false);
const [memberError, setMemberError] = useState("");
const [projectForm, setProjectForm] = useState({ name: "", description: "" });
const [taskForm, setTaskForm] = useState({
title: "",
description: "",
status: "TODO",
priority: "MEDIUM",
dueDate: "",
});

const sensors = useSensors(
useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
);

const notify = useCallback((message) => {
setNotice(message);
window.setTimeout(() => setNotice(""), 3000);
}, []);

const loadOrganizations = useCallback(async () => {
try {
const response = await api.get("/organizations");
const list = response.data.organizations || [];
setOrganizations(list);
setOrganization((current) => {
if (current && list.some((item) => item.id === current.id)) return current;
return list[0] || null;
});
} catch (err) {
setError(getErrorMessage(err));
}
}, []);

const loadTenants = useCallback(async (organizationId) => {
  if (!organizationId) { setTenants([]); setActiveTenant(null); return; }
  try {
    const response = await api.get(`/tenants/organization/${organizationId}`);
    const list = response.data.tenants || [];
    setTenants(list);
    setActiveTenant((current) => current && list.some((item) => item.id === current.id) ? current : (list[0] || null));
  } catch (err) { setError(getErrorMessage(err)); }
}, []);

const createTenant = async (event) => {
  event.preventDefault();
  if (!organization || !tenantName.trim()) return;
  try {
    const response = await api.post("/tenants", { organizationId: organization.id, name: tenantName.trim() });
    setTenantName(""); setModal("");
    await loadTenants(organization.id); setActiveTenant(response.data.tenant);
    notify("Tenant created successfully.");
  } catch (err) { setError(getErrorMessage(err)); }
};

const createBoard = async (event) => {
  event.preventDefault();
  if (!activeTenant || !boardForm.name.trim()) return;
  try {
    const response = await api.post("/boards", { tenantId: activeTenant.id, name: boardForm.name.trim(), description: boardForm.description.trim() });
    setBoardForm({ name: "", description: "" }); setModal("");
    const projectsResponse = await api.get(`/projects/organization/${organization.id}`);
    const list = projectsResponse.data.projects || []; setProjects(list);
    const linkedProject = list.find((item) => item.id === response.data.board.projectId);
    if (linkedProject) setProject(linkedProject);
    notify("Board created with default columns.");
  } catch (err) { setError(getErrorMessage(err)); }
};

const loadProjects = useCallback(async (organizationId) => {
if (!organizationId) {
setProjects([]);
setProject(null);
return;
}

 
try {
  const response = await api.get(`/projects/organization/${organizationId}`);
  const list = response.data.projects || [];
  setProjects(list);
  setProject((current) => {
    if (current && list.some((item) => item.id === current.id)) return current;
    return list[0] || null;
  });
} catch (err) {
  setError(getErrorMessage(err));
}
 

}, []);

const loadTasks = useCallback(async (projectId) => {
if (!projectId) {
setTasks([]);
return;
}

 
setLoading(true);
try {
  const response = await api.get(`/tasks/project/${projectId}`);
  setTasks(response.data.tasks || []);
  setError("");
} catch (err) {
  setError(getErrorMessage(err));
} finally {
  setLoading(false);
}
 

}, []);

useEffect(() => {
if (!user) return;
api.get("/auth/profile")
.then((response) => setUser(response.data.user))
.catch(() => {
localStorage.removeItem("token");
localStorage.removeItem("user");
setUser(null);
});
}, [user?.id]);

useEffect(() => {
if (user) loadOrganizations();
}, [user?.id, loadOrganizations]);

useEffect(() => {
if (organization) { setActiveTenant(null); setProject(null); setTasks([]); loadProjects(organization.id); loadTenants(organization.id); }
else { setProjects([]); setProject(null); setTenants([]); setActiveTenant(null); }
}, [organization?.id, loadProjects, loadTenants]);

useEffect(() => {
if (project && activeTenant && project.tenantId === activeTenant.id) loadTasks(project.id);
else setTasks([]);
}, [project?.id, activeTenant?.id, loadTasks]);

useEffect(() => {
if (!user || !project || !activeTenant || project.tenantId !== activeTenant.id) {
setOnlineUsers([]);
return;
}

 
const socket = io(import.meta.env.VITE_SOCKET_URL || "http://localhost:5000", {
  auth: { token: localStorage.getItem("token") },
  transports: ["websocket", "polling"],
});

socket.on("connect", () => {
  socket.emit("join_project", project.id, (result) => {
    if (result?.success) setOnlineUsers(result.onlineUsers || []);
  });
});

socket.on("presence_update", (data) => {
  if (data.projectId === project.id) setOnlineUsers(data.onlineUsers || []);
});

const refreshTasks = () => loadTasks(project.id);
socket.on("task_created", refreshTasks);
socket.on("task_updated", refreshTasks);
socket.on("task_deleted", refreshTasks);

socket.on("connect_error", (err) => {
  console.warn("Socket connection failed:", err.message);
});

return () => {
  socket.emit("leave_project", project.id);
  socket.disconnect();
};
 

}, [user?.id, project?.id, activeTenant?.id, loadTasks]);

async function createOrganization(event) {
event.preventDefault();
try {
const response = await api.post("/organizations", { name: organizationName });
setOrganizationName("");
setModal("");
await loadOrganizations();
setOrganization(response.data.organization);
notify("Organization created successfully.");
} catch (err) {
setError(getErrorMessage(err));
}
}

async function openMembersModal() {
  if (!organization) return;

  setMemberEmail("");
  setMemberRole("MEMBER");
  setMemberError("");
  setMembers([]);
  setModal("members");
  setMemberLoading(true);

  try {
    const response = await api.get(`/organizations/${organization.id}/members`);
    setMembers(response.data.memberships || []);
  } catch (err) {
    setMemberError(getErrorMessage(err));
  } finally {
    setMemberLoading(false);
  }
}

async function addOrganizationMember(event) {
  event.preventDefault();
  if (!organization || !memberEmail.trim()) return;

  setMemberError("");
  setMemberLoading(true);

  try {
    await api.post(`/organizations/${organization.id}/members`, {
      email: memberEmail.trim(),
      role: memberRole,
    });

    setMemberEmail("");
    const response = await api.get(`/organizations/${organization.id}/members`);
    setMembers(response.data.memberships || []);
    notify("Member added successfully!");
  } catch (err) {
    setMemberError(getErrorMessage(err));
  } finally {
    setMemberLoading(false);
  }
}

async function createProject(event) {
event.preventDefault();
if (!organization) return;
try {
const response = await api.post("/projects", {
...projectForm,
organizationId: organization.id,
});
setProjectForm({ name: "", description: "" });
setModal("");
await loadProjects(organization.id);
setProject(response.data.project);
notify("Project created successfully.");
} catch (err) {
setError(getErrorMessage(err));
}
}

function openNewTask(status = "TODO") {
setEditingTask(null);
setTaskActivity([]);
setTaskForm({
title: "",
description: "",
status,
priority: "MEDIUM",
dueDate: "",
});
setModal("task");
}

async function openEditTask(task) {
setEditingTask(task);
setTaskActivity([]);
try {
  const response = await api.get(`/tasks/${task.id}/activity`);
  setTaskActivity(response.data.activityLogs || []);
} catch (err) {
  setTaskActivity([]);
}
setTaskForm({
title: task.title || "",
description: task.description || "",
status: task.status || "TODO",
priority: task.priority || "MEDIUM",
dueDate: task.dueDate ? task.dueDate.slice(0, 10) : "",
});
setModal("task");
}

async function saveTask(event) {
event.preventDefault();
if (!project) return;

 
const payload = {
  ...taskForm,
  dueDate: taskForm.dueDate ? new Date(taskForm.dueDate).toISOString() : null,
};

try {
  if (editingTask) {
    await api.patch(`/tasks/${editingTask.id}`, {
      ...payload,
      version: editingTask.version,
    });
    notify("Task updated successfully.");
  } else {
    await api.post("/tasks", {
      ...payload,
      projectId: project.id,
    });
    notify("Task created successfully.");
  }
  setModal("");
  await loadTasks(project.id);
} catch (err) {
  const message = getErrorMessage(err);
  setError(message);
  if (err.response?.status === 409) {
    await loadTasks(project.id);
  }
}


}

async function deleteTask() {
if (!editingTask || !window.confirm(`Delete "${editingTask.title}"?`)) return;
try {
await api.delete(`/tasks/${editingTask.id}`);
setModal("");
await loadTasks(project.id);
notify("Task deleted successfully.");
} catch (err) {
setError(getErrorMessage(err));
}
}

async function moveTask(task, status) {
if (task.status === status) return;
try {
await api.patch(`/tasks/${task.id}`, {
status,
version: task.version,
});
await loadTasks(project.id);
} catch (err) {
setError(getErrorMessage(err));
await loadTasks(project.id);
}
}

async function handleDragEnd(event) {
const { active, over } = event;
if (!over || active.id === over.id) return;

const activeTask = tasks.find((task) => task.id === active.id);
const overTask = tasks.find((task) => task.id === over.id);
if (!activeTask) return;

let destinationStatus = null;

if (STATUSES.some((status) => status.id === over.id)) {
  destinationStatus = over.id;
} else if (overTask) {
  destinationStatus = overTask.status;
}

if (destinationStatus && destinationStatus !== activeTask.status) {
  await moveTask(activeTask, destinationStatus);
} else if (overTask && overTask.status === activeTask.status) {
  const columnTasks = tasks.filter((task) => task.status === activeTask.status);
  const oldIndex = columnTasks.findIndex((task) => task.id === active.id);
  const newIndex = columnTasks.findIndex((task) => task.id === over.id);
  const reordered = arrayMove(columnTasks, oldIndex, newIndex);
  setTasks((current) => {
    const others = current.filter((task) => task.status !== activeTask.status);
    return [...others, ...reordered];
  });
}


}

function logout() {
localStorage.removeItem("token");
localStorage.removeItem("user");
setUser(null);
setOrganizations([]);
setOrganization(null);
setProjects([]);
setProject(null);
setTasks([]);
}

const visibleProjects = useMemo(() => activeTenant ? projects.filter((item) => item.tenantId === activeTenant.id) : [], [projects, activeTenant?.id]);

useEffect(() => {
  const next = visibleProjects.find((item) => item.id === project?.id) || visibleProjects[0] || null;
  if (next?.id !== project?.id) setProject(next);
}, [activeTenant?.id, visibleProjects]);

const visibleTasks = useMemo(() => {
const query = search.trim().toLowerCase();
return tasks.filter((task) =>
!query ||
task.title.toLowerCase().includes(query) ||
(task.description || "").toLowerCase().includes(query)
);
}, [tasks, search]);

const completedCount = tasks.filter((task) => task.status === "DONE").length;
const progress = tasks.length ? Math.round((completedCount / tasks.length) * 100) : 0;

if (!user) {
return <AuthScreen onAuthenticated={(nextUser) => setUser(nextUser)} />;
}

return ( <div className="app-shell">
<aside className={`sidebar ${sidebarOpen ? "sidebar-open" : ""}`}> <div className="sidebar-brand"> <span className="brand-mark"><Command size={20} /></span> <span>orbit<span className="brand-dot">.</span></span>
<button className="mobile-close icon-button" onClick={() => setSidebarOpen(false)}><X size={18} /></button> </div>


    <div className="workspace-picker-wrapper">
  <button
    type="button"
    className="workspace-picker"
    onClick={() => setOrganizationMenuOpen((open) => !open)}
    aria-expanded={organizationMenuOpen}
  >
    <div className="workspace-icon">
      {(organization?.name || "W")[0].toUpperCase()}
    </div>

<div className="workspace-copy">
  <strong>{organization?.name || "Your workspace"}</strong>
  <span>{organization?.role || "Workspace"}</span>
</div>

<ChevronDown size={16} className="muted-icon" />

  </button>

{organizationMenuOpen && ( <div className="workspace-dropdown">
{organizations.map((org) => (
<button
type="button"
key={org.id}
className={`workspace-dropdown-item ${
            organization?.id === org.id ? "selected" : ""
          }`}
onClick={() => {
setOrganization(org);
setOrganizationMenuOpen(false);
setProject(null);
setTasks([]);
}}
> <span className="workspace-dropdown-icon">
{org.name[0].toUpperCase()} </span>

      <span className="workspace-dropdown-copy">
        <strong>{org.name}</strong>
        <small>{org.role || "Member"}</small>
      </span>

      {organization?.id === org.id && <Check size={16} />}
    </button>
  ))}

  <button
    type="button"
    className="workspace-dropdown-create"
    onClick={() => {
      setOrganizationMenuOpen(false);
      setModal("organization");
    }}
  >
    <Plus size={15} /> Create organization
  </button>
</div>


)}

</div>


    <div className="tenant-picker-block">
      <label className="sidebar-label" htmlFor="tenant-picker">TENANT / WORKSPACE</label>
      <select id="tenant-picker" className="tenant-select" value={activeTenant?.id || ""} onChange={(event) => { const next = tenants.find((item) => item.id === event.target.value) || null; setActiveTenant(next); setProject(null); setTasks([]); }}>
        <option value="">Select a tenant</option>
        {tenants.map((tenant) => <option key={tenant.id} value={tenant.id}>{tenant.name}</option>)}
      </select>
      <button type="button" className="workspace-dropdown-create tenant-create" disabled={!organization} onClick={() => { setTenantName(""); setModal("tenant"); }}><Plus size={15} /> Create tenant</button>
    </div>

    <div className="sidebar-section">
      <span className="sidebar-label">WORKSPACE</span>
      <button className="nav-item active"><LayoutDashboard size={17} /> Overview</button>
      <button className="nav-item" onClick={() => setModal("organization")}><Users size={17} /> Organizations <Plus size={15} className="nav-trailing" /></button>
      <button className="nav-item" onClick={() => setModal(activeTenant ? "board" : "tenant")}><FolderKanban size={17} /> Boards <Plus size={15} className="nav-trailing" /></button>
    </div>

    <div className="sidebar-section project-nav">
      <div className="section-heading">
        <span className="sidebar-label">YOUR PROJECTS</span>
        <button className="tiny-icon-button" onClick={() => setModal(activeTenant ? "board" : "tenant")} title="Create board"><Plus size={15} /></button>
      </div>
      {visibleProjects.map((item) => (
        <button
          key={item.id}
          className={`project-nav-item ${project?.id === item.id ? "selected" : ""}`}
          onClick={() => { setProject(item); setSidebarOpen(false); }}
        >
          <span className={`project-color project-color-${visibleProjects.indexOf(item) % 4}`} />
          <span>{item.name}</span>
          {project?.id === item.id && <span className="selected-dot" />}
        </button>
      ))}
      {visibleProjects.length === 0 && <p className="sidebar-empty">No boards in this tenant yet</p>}
    </div>

    <div className="sidebar-bottom">
      <div className="sidebar-help">
        <span className="help-icon"><CircleHelp size={17} /></span>
        <div><strong>Need a hand?</strong><span>We're here to help.</span></div>
        <ArrowRight size={15} />
      </div>
      <button className="nav-item" onClick={() => notify("Settings are coming soon.")}><Settings2 size={17} /> Settings</button>
      <div className="sidebar-user">
        <Avatar name={user.name || user.email} />
        <div className="sidebar-user-copy"><strong>{user.name}</strong><span>{user.email}</span></div>
        <button className="icon-button logout-button" onClick={logout} title="Sign out"><LogOut size={17} /></button>
      </div>
    </div>
  </aside>

  {sidebarOpen && <button className="sidebar-overlay" onClick={() => setSidebarOpen(false)} aria-label="Close navigation" />}

  <main className="main-area">
    <header className="topbar">
      <button className="mobile-menu icon-button" onClick={() => setSidebarOpen(true)}><Menu size={20} /></button>
      <div className="breadcrumbs">
        <span>Workspace</span><span className="breadcrumb-slash">/</span>
        <span>{project?.name || "Projects"}</span><span className="breadcrumb-slash">/</span>
        <strong>Board</strong>
      </div>
      <div className="topbar-actions">
        <div className="search-box">
          <Search size={16} />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search tasks..." />
          <kbd>⌘ K</kbd>
        </div>
        <button className="icon-button notification-button" title="Notifications" onClick={() => notify("You're all caught up.")}><Bell size={18} /><span /></button>
        <div className="topbar-avatars">
          {onlineUsers.slice(0, 3).map((online) => <Avatar key={online.userId} name={online.email} size="small" />)}
          {onlineUsers.length > 3 && <span className="avatar avatar-small avatar-extra">+{onlineUsers.length - 3}</span>}
        </div>
        <span className="online-status"><span /> {onlineUsers.length} online</span>
      </div>
    </header>

    <div className="page-content">
      <div className="page-heading">
        <div>
          <div className="page-eyebrow"><span className="live-indicator" /> TEAM WORKSPACE <span className="eyebrow-divider">/</span> {organization?.name || "GET STARTED"}</div>
          <h1>{project?.name || "Your workspace"} <span className="title-badge">Board</span></h1>
          <p className="page-subtitle">{project?.description || "A clear view of your team's work, from first idea to done."}</p>
        </div>
        <div className="page-heading-actions">
          <button className="button button-secondary" onClick={openMembersModal} disabled={!organization}>
            <Users size={16} /> Manage members
          </button>
          <button className="button button-secondary" onClick={() => notify("You're viewing the live board.")}><Activity size={16} /> Live board</button>
          <button className="button button-primary" onClick={() => openNewTask()} disabled={!project}><Plus size={17} /> Add task</button>
        </div>
      </div>

      {error && (
        <div className="global-error">
          <AlertCircle size={17} /><span>{error}</span>
          <button onClick={() => setError("")}><X size={16} /></button>
        </div>
      )}

      <section className="overview-grid">
        <div className="overview-card overview-total">
          <div className="overview-card-top"><span className="overview-icon"><FolderKanban size={18} /></span><span className="overview-caption">ALL TASKS</span><span className="overview-trend"><ArrowDownUp size={13} /> Total</span></div>
          <div className="overview-value">{tasks.length.toString().padStart(2, "0")}</div>
          <div className="overview-foot"><span>Tasks in this project</span><span className="mini-bars"><i /><i /><i /><i /><i /><i /></span></div>
        </div>
        <div className="overview-card overview-progress">
          <div className="overview-card-top"><span className="overview-icon purple-icon"><Zap size={18} /></span><span className="overview-caption">IN PROGRESS</span><span className="overview-trend purple-trend">Active</span></div>
          <div className="overview-value">{tasks.filter((task) => task.status === "IN_PROGRESS").length.toString().padStart(2, "0")}</div>
          <div className="overview-foot"><span>Currently being worked on</span><span className="metric-symbol">↗</span></div>
        </div>
        <div className="overview-card overview-done">
          <div className="overview-card-top"><span className="overview-icon green-icon"><CheckCircle2 size={18} /></span><span className="overview-caption">COMPLETED</span><span className="overview-trend green-trend">Finished</span></div>
          <div className="overview-value">{completedCount.toString().padStart(2, "0")}</div>
          <div className="overview-foot"><span>{progress}% of all tasks completed</span><span className="progress-ring">{progress}%</span></div>
        </div>
        <div className="overview-card overview-team">
          <div className="overview-card-top"><span className="overview-icon orange-icon"><Users size={18} /></span><span className="overview-caption">TEAM ONLINE</span><span className="overview-trend green-trend"><span className="status-pulse" /> Live</span></div>
          <div className="overview-value">{onlineUsers.length.toString().padStart(2, "0")}</div>
          <div className="overview-foot"><span>Collaborating right now</span><div className="online-mini-avatars">{onlineUsers.slice(0, 4).map((online) => <Avatar key={online.userId} name={online.email} size="tiny" />)}</div></div>
        </div>
      </section>

      <section className="board-section">
        <div className="board-toolbar">
          <div className="board-toolbar-left">
            <h2>Project board</h2><span className="board-task-count">{tasks.length} tasks</span>
            <span className="board-live-tag"><span /> Live sync</span>
          </div>
          <div className="board-toolbar-right">
            <button className="toolbar-button" onClick={() => loadTasks(project?.id)}><ArrowDownUp size={15} /> Refresh</button>
            <button className="toolbar-button" onClick={() => notify("Task filtering is available through search.")}><Settings2 size={15} /> Filter</button>
          </div>
        </div>

        {!organization ? (
          <div className="empty-state">
            <div className="empty-state-icon"><Users size={25} /></div>
            <h3>Create your first organization</h3>
            <p>Organizations keep your team's projects and tasks in one shared workspace.</p>
            <button className="button button-primary" onClick={() => setModal("organization")}><Plus size={17} /> Create organization</button>
          </div>
        ) : !project ? (
          <div className="empty-state">
            <div className="empty-state-icon"><FolderKanban size={25} /></div>
            <h3>Start your first project</h3>
            <p>Create a project to organize tasks and collaborate with your team.</p>
            <button className="button button-primary" onClick={() => setModal(activeTenant ? "board" : "tenant")}><Plus size={17} /> {activeTenant ? "Create board" : "Create tenant"}</button>
          </div>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
            <div className="kanban-board">
              {STATUSES.map((status) => {
                const columnTasks = visibleTasks.filter((task) => task.status === status.id);
                return (
                  <KanbanColumn
                    key={status.id}
                    status={status}
                    tasks={columnTasks}
                    onEdit={openEditTask}
                    onAdd={() => openNewTask(status.id)}
                    loading={loading}
                  />
                );
              })}
            </div>
          </DndContext>
        )}
      </section>

      <footer className="page-footer">
        <span><span className="footer-live-dot" /> All changes synced</span>
        <span>Made for teams that move forward <Sparkles size={13} /></span>
      </footer>
    </div>
  </main>

  {modal === "members" && (
    <Modal
      title="Manage organization members"
      subtitle={`Manage the team in ${organization?.name || "your organization"}.`}
      onClose={() => setModal("")}
    >
      <form className="modal-form" onSubmit={addOrganizationMember}>
        <label>
          Registered user's email
          <input
            type="email"
            autoFocus
            value={memberEmail}
            onChange={(event) => setMemberEmail(event.target.value)}
            placeholder="teammate@example.com"
            required
          />
        </label>

        <label>
          Organization role
          <select value={memberRole} onChange={(event) => setMemberRole(event.target.value)}>
            <option value="MEMBER">Member</option>
            <option value="ADMIN">Admin</option>
          </select>
        </label>

        {memberError && (
          <div className="form-error">
            <AlertCircle size={16} /> {memberError}
          </div>
        )}

        <div className="modal-actions">
          <button type="button" className="button button-secondary" onClick={() => setModal("")}>Close</button>
          <button type="submit" className="button button-primary" disabled={memberLoading || !memberEmail.trim()}>
            <Plus size={16} /> {memberLoading ? "Please wait..." : "Add member"}
          </button>
        </div>
      </form>

      <div className="task-activity-panel">
        <strong>Organization members</strong>
        {memberLoading && members.length === 0 ? (
          <p>Loading members...</p>
        ) : members.length === 0 ? (
          <p>No members to display.</p>
        ) : (
          members.map((membership) => (
            <div className="task-activity-item" key={membership.id}>
              <span>{membership.user?.name || membership.user?.email} — {membership.role}</span>
              <small>{membership.user?.email}</small>
            </div>
          ))
        )}
      </div>
    </Modal>
  )}

  {modal === "tenant" && (
    <Modal title="Create a tenant" subtitle="Create an isolated workspace inside this organization." onClose={() => setModal("")}>
      <form className="modal-form" onSubmit={createTenant}>
        <label>Tenant name<input autoFocus value={tenantName} onChange={(event) => setTenantName(event.target.value)} placeholder="e.g. Hyderabad Team" required maxLength={100} /></label>
        <div className="modal-actions"><button type="button" className="button button-secondary" onClick={() => setModal("")}>Cancel</button><button type="submit" className="button button-primary" disabled={!organization || !tenantName.trim()}><Plus size={16} /> Create tenant</button></div>
      </form>
    </Modal>
  )}

  {modal === "board" && (
    <Modal title="Create a board" subtitle={`This board will belong to ${activeTenant?.name || "your selected tenant"}.`} onClose={() => setModal("")}>
      <form className="modal-form" onSubmit={createBoard}>
        <label>Board name<input autoFocus value={boardForm.name} onChange={(event) => setBoardForm({ ...boardForm, name: event.target.value })} placeholder="e.g. Product Development" required maxLength={120} /></label>
        <label>Description <span className="optional-label">OPTIONAL</span><textarea rows="3" value={boardForm.description} onChange={(event) => setBoardForm({ ...boardForm, description: event.target.value })} placeholder="What is this board for?" maxLength={2000} /></label>
        <div className="modal-actions"><button type="button" className="button button-secondary" onClick={() => setModal("")}>Cancel</button><button type="submit" className="button button-primary" disabled={!activeTenant || !boardForm.name.trim()}><Plus size={16} /> Create board</button></div>
      </form>
    </Modal>
  )}

  {modal === "organization" && (
    <Modal title="Create an organization" subtitle="Give your team a shared home." onClose={() => setModal("")}>
      <form className="modal-form" onSubmit={createOrganization}>
        <label>Organization name<input autoFocus value={organizationName} onChange={(event) => setOrganizationName(event.target.value)} placeholder="e.g. Design Studio" required /></label>
        <div className="modal-actions"><button type="button" className="button button-secondary" onClick={() => setModal("")}>Cancel</button><button className="button button-primary"><Plus size={16} /> Create organization</button></div>
      </form>
    </Modal>
  )}

  {modal === "project" && (
    <Modal title="Create a project" subtitle={organization ? `Adding to ${organization.name}` : "Create an organization first."} onClose={() => setModal("")}>
      <form className="modal-form" onSubmit={createProject}>
        <label>Project name<input autoFocus value={projectForm.name} onChange={(event) => setProjectForm({ ...projectForm, name: event.target.value })} placeholder="e.g. Website redesign" required /></label>
        <label>Description <span className="optional-label">OPTIONAL</span><textarea rows="3" value={projectForm.description} onChange={(event) => setProjectForm({ ...projectForm, description: event.target.value })} placeholder="What is this project about?" /></label>
        <div className="modal-actions"><button type="button" className="button button-secondary" onClick={() => setModal("")}>Cancel</button><button className="button button-primary" disabled={!organization}><Plus size={16} /> Create project</button></div>
      </form>
    </Modal>
  )}

  {modal === "task" && (
    <Modal title={editingTask ? "Edit task" : "Create a task"} subtitle={editingTask ? "Update details and keep everyone in sync." : `Add work to ${project?.name || "your project"}.`} onClose={() => setModal("")}>
      <form className="modal-form" onSubmit={saveTask}>
        <label>Task title<input autoFocus value={taskForm.title} onChange={(event) => setTaskForm({ ...taskForm, title: event.target.value })} placeholder="What needs to get done?" required /></label>
        <label>Description <span className="optional-label">OPTIONAL</span><textarea rows="3" value={taskForm.description} onChange={(event) => setTaskForm({ ...taskForm, description: event.target.value })} placeholder="Add some context..." /></label>
        <div className="form-row">
          <label>Status<select value={taskForm.status} onChange={(event) => setTaskForm({ ...taskForm, status: event.target.value })}>{STATUSES.map((status) => <option key={status.id} value={status.id}>{status.label}</option>)}</select></label>
          <label>Priority<select value={taskForm.priority} onChange={(event) => setTaskForm({ ...taskForm, priority: event.target.value })}>{Object.entries(PRIORITIES).map(([key, value]) => <option key={key} value={key}>{value.label}</option>)}</select></label>
        </div>
        <label>Due date <span className="optional-label">OPTIONAL</span><input type="date" value={taskForm.dueDate} onChange={(event) => setTaskForm({ ...taskForm, dueDate: event.target.value })} /></label>
        {editingTask && <div className="version-note"><ShieldCheck size={15} /> Version {editingTask.version || 1} · Concurrent updates protected</div>}
        {editingTask && <div className="task-activity-panel"><strong>Activity history</strong>{taskActivity.length === 0 ? <p>No activity history available yet.</p> : taskActivity.slice(0, 5).map((entry) => <div className="task-activity-item" key={entry.id}><span>{(entry.action || "TASK_UPDATED").replaceAll("_", " ").toLowerCase()}</span><small>{entry.user?.name || entry.user?.email || "Team member"} · {new Date(entry.createdAt).toLocaleString()}</small></div>)}</div>}
        <div className="modal-actions">
          {editingTask && <button type="button" className="button button-danger" onClick={deleteTask}>Delete</button>}
          <span className="modal-actions-spacer" />
          <button type="button" className="button button-secondary" onClick={() => setModal("")}>Cancel</button>
          <button className="button button-primary"><Check size={16} /> {editingTask ? "Save changes" : "Create task"}</button>
        </div>
      </form>
    </Modal>
  )}

  {notice && <div className="toast"><CheckCircle2 size={18} />{notice}<button onClick={() => setNotice("")}><X size={15} /></button></div>}
</div>


);
}

function KanbanColumn({ status, tasks, onEdit, onAdd, loading }) {
const { setNodeRef, isOver } = useSortable({
id: status.id,
data: { type: "column", status: status.id },
});

return (
<section ref={setNodeRef} className={`kanban-column ${isOver ? "column-over" : ""}`}> <div className="column-heading"> <div className="column-title-wrap">
<span className="column-status-dot" style={{ background: status.color }} /> <h3>{status.label}</h3> <span className="column-count">{tasks.length}</span> </div>
<button className="tiny-icon-button" onClick={onAdd} title={`Add task to ${status.label}`}><Plus size={16} /></button> </div>
<SortableContext items={tasks.map((task) => task.id)} strategy={verticalListSortingStrategy}> <div className="column-task-list">
{tasks.map((task) => <TaskCard key={task.id} task={task} onEdit={onEdit} />)}
{tasks.length === 0 && ( <div className="column-empty"> <span className="column-empty-icon"><Plus size={15} /></span> <span>{loading ? "Loading tasks..." : "Drop a task here"}</span> </div>
)} </div> </SortableContext> <button className="column-add-task" onClick={onAdd}><Plus size={15} /> Add task</button> </section>
);
}

export default App;
