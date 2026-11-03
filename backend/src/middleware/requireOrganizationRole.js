const prisma = require("../config/database");

function requireOrganizationRole(...allowedRoles) {
return async function (req, res, next) {
try {
const userId = req.user.userId;


  // Accept the organization ID from the URL or request body.
  const organizationId =
    req.params.organizationId ||
    req.body?.organizationId;

  if (!organizationId) {
    return res.status(400).json({
      message: "Organization ID is required.",
    });
  }

  const membership = await prisma.membership.findUnique({
    where: {
      userId_organizationId: {
        userId,
        organizationId,
      },
    },
    select: {
      role: true,
    },
  });

  if (!membership) {
    return res.status(403).json({
      message: "You are not a member of this organization.",
    });
  }

  if (!allowedRoles.includes(membership.role)) {
    return res.status(403).json({
      message: "You do not have permission to perform this action.",
      requiredRoles: allowedRoles,
      yourRole: membership.role,
    });
  }

  req.organizationRole = membership.role;
  next();
} catch (error) {
  console.error("Organization role check error:", error);

  return res.status(500).json({
    message: "Failed to verify organization permissions.",
  });
}


};
}

module.exports = requireOrganizationRole;
