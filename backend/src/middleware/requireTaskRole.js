const prisma = require("../config/database");

function requireTaskRole(...allowedRoles) {
return async function (req, res, next) {
try {
const userId = req.user.userId;
const { taskId } = req.params;


  if (!taskId) {
    return res.status(400).json({
      message: "Task ID is required.",
    });
  }

  // Find the task only if the user belongs to its organization.
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
      project: {
        select: {
          organizationId: true,
        },
      },
    },
  });

  if (!task) {
    return res.status(404).json({
      message: "Task not found or you do not have access to it.",
    });
  }

  const membership = await prisma.membership.findUnique({
    where: {
      userId_organizationId: {
        userId,
        organizationId: task.project.organizationId,
      },
    },
    select: {
      role: true,
    },
  });

  if (!membership || !allowedRoles.includes(membership.role)) {
    return res.status(403).json({
      message: "You do not have permission to perform this action.",
      requiredRoles: allowedRoles,
      yourRole: membership?.role || null,
    });
  }

  req.organizationRole = membership.role;
  req.taskOrganizationId = task.project.organizationId;

  next();
} catch (error) {
  console.error("Task role check error:", error);

  return res.status(500).json({
    message: "Failed to verify task permissions.",
  });
}


};
}

module.exports = requireTaskRole;
