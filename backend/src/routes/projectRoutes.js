const express = require("express");

const {
  createProject,
  getOrganizationProjects,
} = require("../controllers/projectController");

const authenticateToken = require("../middleware/authMiddleware");
const requireOrganizationRole = require("../middleware/requireOrganizationRole");

const router = express.Router();

// All project routes require authentication
router.use(authenticateToken);

// Only OWNER and ADMIN can create projects
router.post(
  "/",
  requireOrganizationRole("OWNER", "ADMIN"),
  createProject
);

// All organization members can view their organization's projects
router.get(
  "/organization/:organizationId",
  requireOrganizationRole("OWNER", "ADMIN", "MEMBER"),
  getOrganizationProjects
);

module.exports = router;