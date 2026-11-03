
const express = require("express");

const {
  createOrganization,
  getMyOrganizations,
} = require("../controllers/organizationController");

const authenticateToken = require("../middleware/authMiddleware");
const { addOrganizationMember, listOrganizationMembers } = require("../controllers/organizationMemberController");

const router = express.Router();

// All organization routes require authentication
router.use(authenticateToken);

// Create an organization
router.post("/", createOrganization);

// Get organizations for the logged-in user
router.get("/", getMyOrganizations);
router.get("/:organizationId/members", listOrganizationMembers);
router.post("/:organizationId/members", addOrganizationMember);

module.exports = router;

