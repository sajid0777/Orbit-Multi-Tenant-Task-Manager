const express = require("express");

const {
  register,
  login,
  getProfile,
} = require("../controllers/authController");

const authenticateToken = require("../middleware/authMiddleware");

const router = express.Router();

// Public routes
router.post("/register", register);
router.post("/login", login);

// Protected route
router.get("/profile", authenticateToken, getProfile);

// Test route
router.get("/", (req, res) => {
  res.json({
    message: "Authentication routes are working!",
  });
});

module.exports = router;