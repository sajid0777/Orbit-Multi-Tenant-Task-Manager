const prisma = require("../config/database");

async function addOrganizationMember(req, res) {
  try {
    const { organizationId } = req.params;
    const { email, role = "MEMBER" } = req.body || {};

    // Temporary debugging logs
    console.log("========== ADD ORGANIZATION MEMBER ==========");
    console.log("Authenticated user ID:", req.user.userId);
    console.log("Authenticated user email:", req.user.email);
    console.log("Requested organization ID:", organizationId);
    console.log("Member email:", email);
    console.log("Requested role:", role);

    // Check whether the logged-in user belongs to this organization
    const actor = await prisma.membership.findUnique({
      where: {
        userId_organizationId: {
          userId: req.user.userId,
          organizationId,
        },
      },
    });

    console.log("Found actor membership:", actor);

    if (!actor) {
      console.log("ERROR: Authenticated user is not a member of this organization.");

      return res.status(403).json({
        message: "You are not a member of this organization.",
      });
    }

    // Only owners and admins can add members
    if (!["OWNER", "ADMIN"].includes(actor.role)) {
      return res.status(403).json({
        message: "Only organization admins can manage organization members.",
      });
    }

    // Validate email
    if (typeof email !== "string" || !email.trim()) {
      return res.status(400).json({
        message: "A valid email is required.",
      });
    }

    // Prevent assigning the OWNER role
    if (!["ADMIN", "MEMBER"].includes(role)) {
      return res.status(400).json({
        message: "Role must be ADMIN or MEMBER.",
      });
    }

    // Find the registered user
    const user = await prisma.user.findUnique({
      where: {
        email: email.trim().toLowerCase(),
      },
    });

    if (!user) {
      return res.status(404).json({
        message: "User must register before being added to an organization.",
      });
    }

    // Add the user or update their existing membership
    const membership = await prisma.membership.upsert({
      where: {
        userId_organizationId: {
          userId: user.id,
          organizationId,
        },
      },
      create: {
        userId: user.id,
        organizationId,
        role,
      },
      update: {
        role,
      },
    });

    console.log("Member added successfully:", user.email);
    console.log("=============================================");

    return res.status(201).json({
      message: "Member added successfully.",
      membership: {
        ...membership,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
        },
      },
    });
  } catch (error) {
    console.error("Add organization member error:", error);

    return res.status(500).json({
      message: "Failed to add organization member.",
    });
  }
}

async function listOrganizationMembers(req, res) {
  try {
    const { organizationId } = req.params;

    console.log("========== LIST ORGANIZATION MEMBERS ==========");
    console.log("Authenticated user ID:", req.user.userId);
    console.log("Requested organization ID:", organizationId);

    // Verify membership
    const actor = await prisma.membership.findUnique({
      where: {
        userId_organizationId: {
          userId: req.user.userId,
          organizationId,
        },
      },
    });

    if (!actor) {
      return res.status(403).json({
        message: "You are not a member of this organization.",
      });
    }

    // Retrieve organization members
    const memberships = await prisma.membership.findMany({
      where: {
        organizationId,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    return res.status(200).json({
      memberships,
    });
  } catch (error) {
    console.error("List organization members error:", error);

    return res.status(500).json({
      message: "Failed to retrieve organization members.",
    });
  }
}

module.exports = {
  addOrganizationMember,
  listOrganizationMembers,
};