const jwt = require("jsonwebtoken");

function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization;

  // Check whether the token was provided
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      message: "Access denied. Authentication token required.",
    });
  }

  const token = authHeader.split(" ")[1];

  // Verify the token
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.user = {
      userId: decoded.userId,
      email: decoded.email,
    };

    next();
  } catch (error) {
  console.error("JWT verification failed:", error.name, error.message);

  return res.status(401).json({
    message: "Invalid or expired authentication token.",
  });
}
}

module.exports = authenticateToken;