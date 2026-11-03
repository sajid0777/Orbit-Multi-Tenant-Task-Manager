
const prisma = require("../config/database");

// Create an organization
async function createOrganization(req, res) {
  try {
    const { name } = req.body || {};

    if (typeof name !== "string" || !name.trim()) {
      return res.status(400).json({
        message: "Organization name is required.",
      });
    }

    const userId = req.user.userId;

    const organization = await prisma.$transaction(async (tx) => {
      const newOrganization = await tx.organization.create({
        data: {
          name: name.trim(),
        },
      });

      await tx.membership.create({
        data: {
          userId,
          organizationId: newOrganization.id,
          role: "OWNER",
        },
      });

      return newOrganization;
    });

    return res.status(201).json({
      message: "Organization created successfully!",
      organization,
      role: "OWNER",
    });
  } catch (error) {
    console.error("Create organization error:", error);

    return res.status(500).json({
      message: "Failed to create organization.",
    });
  }
}

// Get organizations belonging to the logged-in user
async function getMyOrganizations(req, res) {
  try {
    const userId = req.user.userId;

    const memberships = await prisma.membership.findMany({
      where: {
        userId,
      },
      include: {
        organization: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return res.status(200).json({
      message: "Organizations retrieved successfully!",
      organizations: memberships.map((membership) => ({
        ...membership.organization,
        role: membership.role,
      })),
    });
  } catch (error) {
    console.error("Get organizations error:", error);

    return res.status(500).json({
      message: "Failed to retrieve organizations.",
    });
  }
}

module.exports = {
  createOrganization,
  getMyOrganizations,
};

