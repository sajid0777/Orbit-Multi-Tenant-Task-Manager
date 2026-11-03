const prisma = require("../config/database");
const { getIo } = require("../socket");

async function canAccessTenantProject(userId, project) {
  if (!project?.tenantId) return true;
  const [tenantMembership, orgMembership] = await Promise.all([
    prisma.tenantMembership.findUnique({ where: { tenantId_userId: { tenantId: project.tenantId, userId } } }),
    prisma.membership.findUnique({ where: { userId_organizationId: { userId, organizationId: project.organizationId } } }),
  ]);
  return Boolean(tenantMembership || (orgMembership && ["OWNER", "ADMIN"].includes(orgMembership.role)));
}

// Valid values
const VALID_STATUSES = ["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"];
const VALID_PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"];

// Custom error used for concurrency conflicts
class TaskConflictError extends Error {
  constructor(message) {
    super(message);
    this.name = "TaskConflictError";
  }
}

// Create a task
async function createTask(req, res) {
  try {
    const {
      title,
      description,
      priority,
      assigneeId,
      dueDate,
      projectId,
      status = "TODO",
    } = req.body || {};

    const userId = req.user.userId;

    // Validate title
    if (typeof title !== "string" || !title.trim()) {
      return res.status(400).json({
        message: "Task title is required.",
      });
    }

    // Validate project ID
    if (typeof projectId !== "string" || !projectId.trim()) {
      return res.status(400).json({
        message: "Project ID is required.",
      });
    }

    // Validate status and priority
    if (status !== undefined && !VALID_STATUSES.includes(status)) {
      return res.status(400).json({ message: "Invalid task status.", validStatuses: VALID_STATUSES });
    }
    if (
      priority !== undefined &&
      !VALID_PRIORITIES.includes(priority)
    ) {
      return res.status(400).json({
        message: "Invalid priority.",
        validPriorities: VALID_PRIORITIES,
      });
    }

    // Validate description
    if (
      description !== undefined &&
      description !== null &&
      typeof description !== "string"
    ) {
      return res.status(400).json({
        message: "Description must be a string or null.",
      });
    }

    // Validate assignee ID
    if (
      assigneeId !== undefined &&
      assigneeId !== null &&
      assigneeId !== "" &&
      typeof assigneeId !== "string"
    ) {
      return res.status(400).json({
        message: "Assignee ID must be a string or null.",
      });
    }

    // Verify project access
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        organization: {
          members: {
            some: { userId },
          },
        },
      },
      select: {
        id: true,
        organizationId: true,
        tenantId: true,
        board: { select: { id: true, columns: { orderBy: { position: "asc" }, select: { id: true, name: true, position: true } } } },
      },
    });

    if (!project || !(await canAccessTenantProject(userId, project))) {
      return res.status(404).json({
        message: "Project not found or you do not have access to it.",
      });
    }

    // Ensure the assignee belongs to the same organization
    if (assigneeId) {
      const membership = await prisma.membership.findFirst({
        where: {
          userId: assigneeId,
          organizationId: project.organizationId,
        },
        select: { id: true },
      });

      if (!membership) {
        return res.status(400).json({
          message: "Assignee must belong to the project's organization.",
        });
      }
    }

    // Validate due date
    let parsedDueDate = null;

    if (dueDate !== undefined && dueDate !== null && dueDate !== "") {
      parsedDueDate = new Date(dueDate);

      if (Number.isNaN(parsedDueDate.getTime())) {
        return res.status(400).json({
          message: "Invalid due date.",
        });
      }
    }

    // Create task and activity log atomically
    const task = await prisma.$transaction(async (tx) => {
      const createdTask = await tx.task.create({
        data: {
          title: title.trim(),
          description:
            typeof description === "string"
              ? description.trim() || null
              : null,
          priority: priority || "MEDIUM",
          status: status || "TODO",
          projectId,
          ...(project.board ? { boardId: project.board.id, columnId: project.board.columns.find((column) => column.name.toLowerCase() === ({ TODO: "to do", IN_PROGRESS: "in progress", IN_REVIEW: "review", DONE: "done" }[status]))?.id || project.board.columns[0]?.id || null } : {}),
          creatorId: userId,
          assigneeId: assigneeId || null,
          dueDate: parsedDueDate,
        },
      });

      await tx.activityLog.create({
        data: {
          action: "TASK_CREATED",
          details: {
            title: createdTask.title,
            projectId: createdTask.projectId,
            priority: createdTask.priority,
          },
          taskId: createdTask.id,
          userId,
        },
      });

      return createdTask;
    });

    // Notify users viewing this project
  const io = getIo();

  if (io) {
    io.to(`project:${task.projectId}`).emit("task_created", {
        task,
        message: "A new task was created.",
      });
    }

  return res.status(201).json({
    message: "Task created successfully!",
    task,
  });
  } catch (error) {
    console.error("Create task error:", error);

    return res.status(500).json({
      message: "Failed to create task.",
    });
  }
}

// Get tasks belonging to a project
async function getProjectTasks(req, res) {
  try {
    const { projectId } = req.params;
    const userId = req.user.userId;

    // Verify project access
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        organization: {
          members: {
            some: { userId },
          },
        },
      },
      select: { id: true, organizationId: true, tenantId: true },
    });

    if (!project || !(await canAccessTenantProject(userId, project))) {
      return res.status(404).json({
        message: "Project not found or you do not have access to it.",
      });
    }

    const tasks = await prisma.task.findMany({
      where: { projectId },
      include: {
        assignee: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: [
        { position: "asc" },
        { createdAt: "desc" },
      ],
    });

    return res.status(200).json({
      message: "Tasks retrieved successfully!",
      tasks,
    });
  } catch (error) {
    console.error("Get project tasks error:", error);

    return res.status(500).json({
      message: "Failed to retrieve tasks.",
    });
  }
}

// Update an existing task
async function updateTask(req, res) {
  try {
    const { taskId } = req.params;

    const {
      title,
      description,
      status,
      priority,
      assigneeId,
      dueDate,
      version,
    } = req.body || {};

    const userId = req.user.userId;

    // Version is mandatory for safe concurrent updates
    if (
      !Number.isSafeInteger(version) ||
      version < 1
    ) {
      return res.status(400).json({
        message: "A valid task version is required.",
        hint: "Include the task's current version in your request body.",
      });
    }

    // Find task only if the user belongs to its organization
    const existingTask = await prisma.task.findFirst({
      where: {
        id: taskId,
        project: {
          organization: {
            members: {
              some: { userId },
            },
          },
        },
      },
      include: {
        project: {
          select: { organizationId: true, tenantId: true },
        },
        board: { include: { columns: { orderBy: { position: "asc" } } } },
      },
    });

    if (!existingTask || !(await canAccessTenantProject(userId, existingTask.project))) {
      return res.status(404).json({
        message: "Task not found or you do not have access to it.",
      });
    }

    // Reject stale edits before attempting the update
    if (version !== existingTask.version) {
      return res.status(409).json({
        message: "Task was modified by another user. Refresh and try again.",
        currentVersion: existingTask.version,
      });
    }

    // Validate fields
    if (
      title !== undefined &&
      (typeof title !== "string" || !title.trim())
    ) {
      return res.status(400).json({
        message: "Title cannot be empty.",
      });
    }

    if (
      description !== undefined &&
      description !== null &&
      typeof description !== "string"
    ) {
      return res.status(400).json({
        message: "Description must be a string or null.",
      });
    }

    if (
      status !== undefined &&
      !VALID_STATUSES.includes(status)
    ) {
      return res.status(400).json({
        message: "Invalid status.",
        validStatuses: VALID_STATUSES,
      });
    }

    if (
      priority !== undefined &&
      !VALID_PRIORITIES.includes(priority)
    ) {
      return res.status(400).json({
        message: "Invalid priority.",
        validPriorities: VALID_PRIORITIES,
      });
    }

    if (
      assigneeId !== undefined &&
      assigneeId !== null &&
      assigneeId !== "" &&
      typeof assigneeId !== "string"
    ) {
      return res.status(400).json({
        message: "Assignee ID must be a string or null.",
      });
    }

    // Require at least one editable field
    const editableFields = [
      "title",
      "description",
      "status",
      "priority",
      "assigneeId",
      "dueDate",
    ];

    const hasEditableField = editableFields.some(
      (field) => Object.hasOwn(req.body || {}, field)
    );

    if (!hasEditableField) {
      return res.status(400).json({
        message: "Provide at least one field to update.",
      });
    }

    // Verify that the assignee belongs to this organization
    if (assigneeId) {
      const membership = await prisma.membership.findFirst({
        where: {
          userId: assigneeId,
          organizationId: existingTask.project.organizationId,
        },
        select: { id: true },
      });

      if (!membership) {
        return res.status(400).json({
          message: "Assignee must belong to the task's organization.",
        });
      }
    }

    // Validate due date
    let parsedDueDate;

    if (dueDate !== undefined) {
      if (dueDate === null || dueDate === "") {
        parsedDueDate = null;
      } else {
        parsedDueDate = new Date(dueDate);

        if (Number.isNaN(parsedDueDate.getTime())) {
          return res.status(400).json({
            message: "Invalid due date.",
          });
        }
      }
    }

    // Build update data using only supplied fields
    const updateData = {
      ...(title !== undefined
        ? { title: title.trim() }
        : {}),

      ...(description !== undefined
        ? {
            description:
              typeof description === "string"
                ? description.trim() || null
                : null,
          }
        : {}),

      ...(status !== undefined ? { status } : {}),
      ...(priority !== undefined ? { priority } : {}),

      ...(assigneeId !== undefined
        ? { assigneeId: assigneeId || null }
        : {}),

      ...(dueDate !== undefined
        ? { dueDate: parsedDueDate }
        : {}),

      version: { increment: 1 },
      ...(status !== undefined && existingTask.board ? { columnId: existingTask.board.columns.find((column) => column.name.toLowerCase() === ({ TODO: "to do", IN_PROGRESS: "in progress", IN_REVIEW: "review", DONE: "done" }[status]))?.id || null } : {}),
    };

    // Update and record activity in the same transaction
    const updatedTask = await prisma.$transaction(async (tx) => {
      const updateResult = await tx.task.updateMany({
        where: {
          id: taskId,
          version,
          project: {
            organization: {
              members: {
                some: { userId },
              },
            },
          },
        },
        data: updateData,
      });

      // Another request may have updated or deleted the task
      if (updateResult.count !== 1) {
        throw new TaskConflictError(
          "Task was modified or deleted. Refresh and try again."
        );
      }

      const task = await tx.task.findUnique({
        where: { id: taskId },
        include: {
          assignee: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          creator: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      await tx.activityLog.create({
        data: {
          action: "TASK_UPDATED",
          details: {
            changedFields: Object.keys(updateData).filter(
              (field) => field !== "version"
            ),
            version: task.version,
          },
          taskId: task.id,
          userId,
        },
      });

      return task;
    });

    const io = getIo();

if (io) {
    io.to(`project:${updatedTask.projectId}`).emit("task_updated", {
        task: updatedTask,
        message: "A task was updated.",
      });
    }

    return res.status(200).json({
      message: "Task updated successfully!",
      task: updatedTask,
    });

  } catch (error) {
    if (error instanceof TaskConflictError) {
      return res.status(409).json({
        message: error.message,
      });
    }

    console.error("Update task error:", error);

    return res.status(500).json({
      message: "Failed to update task.",
    });
  }
}

// Delete a task
async function deleteTask(req, res) {
  try {
    const { taskId } = req.params;
    const userId = req.user.userId;

    // Verify the user has access to the task
    const task = await prisma.task.findFirst({
      where: {
        id: taskId,
        project: {
          organization: {
            members: {
              some: { userId },
            },
          },
        },
      },
      select: {
        id: true,
        title: true,
        projectId: true,
        project: { select: { id: true, organizationId: true, tenantId: true } },
      },
    });

    if (!task || !(await canAccessTenantProject(userId, task.project))) {
      return res.status(404).json({
        message: "Task not found or you do not have access to it.",
      });
    }

    // Record deletion and delete the task atomically
    await prisma.$transaction(async (tx) => {
      await tx.activityLog.create({
        data: {
          action: "TASK_DELETED",
          details: {
            title: task.title,
            projectId: task.projectId,
          },
          taskId: task.id,
          userId,
        },
      });

      await tx.task.delete({
        where: { id: task.id },
      });
    });


const io = getIo();

if (io) {
  io.to(`project:${task.projectId}`).emit("task_deleted", {
    taskId: task.id,
    projectId: task.projectId,
    message: "A task was deleted.",
  });
}



    return res.status(200).json({
      message: "Task deleted successfully!",
    });

  } catch (error) {
    console.error("Delete task error:", error);

    return res.status(500).json({
      message: "Failed to delete task.",
    });
  }
}

module.exports = {
  createTask,
  getProjectTasks,
  updateTask,
  deleteTask,
};