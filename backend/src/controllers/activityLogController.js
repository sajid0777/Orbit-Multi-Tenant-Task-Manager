const prisma = require("../config/database");

// Get activity logs for a task
async function getTaskActivityLogs(req, res) {
try {
const { taskId } = req.params;
const userId = req.user.userId;


// Check whether the task exists and belongs to an organization
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
    project: { select: { tenantId: true, organizationId: true } },
  },
});

if (!task) {
  return res.status(404).json({
    message: "Task not found or you do not have access to it.",
  });
}
if (task.project.tenantId) {
  const [tenantMembership, organizationMembership] = await Promise.all([
    prisma.tenantMembership.findUnique({ where: { tenantId_userId: { tenantId: task.project.tenantId, userId } } }),
    prisma.membership.findUnique({ where: { userId_organizationId: { userId, organizationId: task.project.organizationId } } }),
  ]);
  if (!tenantMembership && !["OWNER", "ADMIN"].includes(organizationMembership?.role)) {
    return res.status(404).json({ message: "Task not found or you do not have access to it." });
  }
}

// Retrieve activity logs for this task
const activityLogs = await prisma.activityLog.findMany({
  where: { taskId },
  orderBy: { createdAt: "desc" },
  include: {
    user: {
      select: {
        id: true,
        name: true,
        email: true,
      },
    },
  },
});

return res.status(200).json({
  message: "Task activity logs retrieved successfully!",
  activityLogs,
});


} catch (error) {
console.error("Get task activity logs error:", error);


return res.status(500).json({
  message: "Failed to retrieve task activity logs.",
});


}
}

module.exports = {
getTaskActivityLogs,
};
