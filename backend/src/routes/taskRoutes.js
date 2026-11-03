const express = require("express");

const {
createTask,
getProjectTasks,
updateTask,
deleteTask,
} = require("../controllers/taskController");

const authenticateToken = require("../middleware/authMiddleware");
const requireTaskRole = require("../middleware/requireTaskRole");

const {
getTaskActivityLogs,
} = require("../controllers/activityLogController");

const router = express.Router();

// All task routes require authentication
router.use(authenticateToken);

// Create a task — any organization member can create tasks
router.post("/", createTask);

// View tasks belonging to a project
router.get("/project/:projectId", getProjectTasks);

// View activity logs for a task
router.get("/:taskId/activity", getTaskActivityLogs);

// Update tasks — any organization member can update
router.patch(
"/:taskId",
requireTaskRole("OWNER", "ADMIN", "MEMBER"),
updateTask
);

// Delete tasks — only OWNER and ADMIN can delete
router.delete(
"/:taskId",
requireTaskRole("OWNER", "ADMIN"),
deleteTask
);

module.exports = router;
