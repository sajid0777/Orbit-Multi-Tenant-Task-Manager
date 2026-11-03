const prisma = require("../config/database");

// Create a project inside an organization
async function createProject(req, res) {
  try {
    const { name, description, organizationId, tenantId } = req.body || {};

    // Validate project name
    if (typeof name !== "string" || !name.trim()) {
      return res.status(400).json({
        message: "Project name is required.",
      });
    }

    // Validate organization ID
    if (
      typeof organizationId !== "string" ||
      !organizationId.trim()
    ) {
      return res.status(400).json({
        message: "Organization ID is required.",
      });
    }

    const userId = req.user.userId;

    // Check whether the user belongs to this organization
    const membership = await prisma.membership.findUnique({
      where: {
        userId_organizationId: {
          userId,
          organizationId,
        },
      },
    });

    if (!membership) {
      return res.status(403).json({
        message: "You are not a member of this organization.",
      });
    }
    if (tenantId) {
      const tenant = await prisma.tenant.findFirst({ where: { id: tenantId, organizationId } });
      const tenantMembership = await prisma.tenantMembership.findUnique({ where: { tenantId_userId: { tenantId, userId } } });
      if (!tenant || !(tenantMembership || ["OWNER", "ADMIN"].includes(membership.role))) return res.status(403).json({ message: "Tenant not found or access denied." });
    }

    // Create the project
    const project = await prisma.project.create({
      data: {
        name: name.trim(),
        description:
          typeof description === "string"
            ? description.trim() || null
            : null,
        organizationId,
        ...(tenantId ? { tenantId } : {}),
      },
    });

    return res.status(201).json({
      message: "Project created successfully!",
      project,
    });
  } catch (error) {
    console.error("Create project error:", error);

    return res.status(500).json({
      message: "Failed to create project.",
    });
  }
}

// Get projects belonging to an organization
async function getOrganizationProjects(req, res) {
  try {
    const { organizationId } = req.params;
    const userId = req.user.userId;

    // Verify organization membership before returning projects
    const membership = await prisma.membership.findUnique({
      where: {
        userId_organizationId: {
          userId,
          organizationId,
        },
      },
    });

    if (!membership) {
      return res.status(403).json({
        message: "You are not a member of this organization.",
      });
    }

    const projects = await prisma.project.findMany({
      where: {
        organizationId,
        OR: [
          { tenantId: null },
          { tenant: { memberships: { some: { userId } } } },
          ...(membership.role === "OWNER" || membership.role === "ADMIN" ? [{ tenantId: { not: null } }] : []),
        ],
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return res.status(200).json({
      message: "Projects retrieved successfully!",
      projects,
    });
  } catch (error) {
    console.error("Get projects error:", error);

    return res.status(500).json({
      message: "Failed to retrieve projects.",
    });
  }
}

module.exports = {
  createProject,
  getOrganizationProjects,
};