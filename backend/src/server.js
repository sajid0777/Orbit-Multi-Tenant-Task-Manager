
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const { setIo } = require("./socket");
const jwt = require("jsonwebtoken");

const prisma = require("./config/database");

const authRoutes = require("./routes/authRoutes");
const organizationRoutes = require("./routes/organizationRoutes");
const projectRoutes = require("./routes/projectRoutes");
const taskRoutes = require("./routes/taskRoutes");
const tenantRoutes = require("./routes/tenantRoutes");
const boardRoutes = require("./routes/boardRoutes");

const app = express();
const server = http.createServer(app);

// Socket.IO setup
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    methods: ["GET", "POST", "PATCH", "DELETE"],
  },
});

setIo(io);

app.use(cors());
app.use(express.json());

// Existing REST API routes
app.use("/api/auth", authRoutes);
app.use("/api/organizations", organizationRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/tenants", tenantRoutes);
app.use("/api/boards", boardRoutes);

// API home route
app.get("/", (req, res) => {
  res.json({
    message: "Collaborative Task Manager API is running!",
    realtime: "Socket.IO enabled",
  });
});

// Database health check
app.get("/api/health", async (req, res) => {
  try {
    await prisma.$connect();

    res.status(200).json({
      status: "healthy",
      database: "connected",
    });
  } catch (error) {
    console.error("Database health check failed:", error);

    res.status(500).json({
      status: "unhealthy",
      database: "disconnected",
      error: error.message,
    });
  }
});

// Authenticate Socket.IO connections using JWT
io.use((socket, next) => {
  const token = socket.handshake.auth?.token;

  if (!token) {
    return next(new Error("Authentication token required."));
  }

  if (!process.env.JWT_SECRET) {
    console.error("JWT_SECRET is missing from the environment.");
    return next(new Error("Server authentication configuration error."));
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    socket.user = {
      userId: decoded.userId,
      email: decoded.email,
    };

    next();
  } catch (error) {
    console.error(
      "Socket JWT verification error:",
      error.name,
      error.message
    );

    next(new Error("Invalid or expired authentication token."));
  }
});

// Send the current online-user list to everyone in a project.
async function broadcastProjectPresence(projectId) {
  const room = `project:${projectId}`;
  const sockets = await io.in(room).fetchSockets();

  // One user may have multiple tabs open, so count unique users.
  const uniqueUsers = new Map();

  for (const connectedSocket of sockets) {
    if (connectedSocket.user) {
      uniqueUsers.set(connectedSocket.user.userId, {
        userId: connectedSocket.user.userId,
        email: connectedSocket.user.email,
      });
    }
  }

  const onlineUsers = Array.from(uniqueUsers.values());

  io.to(room).emit("presence_update", {
    projectId,
    onlineUsers,
    onlineCount: onlineUsers.length,
  });
}

// Handle authenticated socket connections
io.on("connection", (socket) => {
  console.log(`User connected: ${socket.user.userId}`);

  // Track the project rooms this socket has joined.
  socket.data.projectRooms = new Set();

  // Join a project room only if the user belongs to its organization.
  socket.on("join_project", async (projectId, callback) => {
    try {
      if (typeof projectId !== "string" || !projectId.trim()) {
        if (typeof callback === "function") {
          callback({
            success: false,
            message: "Valid project ID is required.",
          });
        }
        return;
      }

      const project = await prisma.project.findFirst({
        where: {
          id: projectId,
          organization: {
            members: { some: { userId: socket.user.userId } },
          },
          OR: [
            { tenantId: null },
            { tenant: { memberships: { some: { userId: socket.user.userId } } } },
            { organization: { members: { some: { userId: socket.user.userId, role: { in: ["OWNER", "ADMIN"] } } } } },
          ],
        },
        select: { id: true },
      });

      if (!project) {
        if (typeof callback === "function") {
          callback({
            success: false,
            message:
              "Project not found or you do not have access to it.",
          });
        }
        return;
      }

      // Leave previous project rooms and update their presence.
      const previousRooms = Array.from(socket.data.projectRooms);

      for (const previousProjectId of previousRooms) {
        await socket.leave(`project:${previousProjectId}`);
        socket.data.projectRooms.delete(previousProjectId);

        await broadcastProjectPresence(previousProjectId);
      }

      // Join the requested project room.
      const room = `project:${projectId}`;

      await socket.join(room);
      socket.data.projectRooms.add(projectId);

      // Notify everyone in this project that presence has changed.
      await broadcastProjectPresence(projectId);

      // Return the current presence information to the joining client.
      const sockets = await io.in(room).fetchSockets();
      const uniqueUsers = new Map();

      for (const connectedSocket of sockets) {
        if (connectedSocket.user) {
          uniqueUsers.set(connectedSocket.user.userId, {
            userId: connectedSocket.user.userId,
            email: connectedSocket.user.email,
          });
        }
      }

      const onlineUsers = Array.from(uniqueUsers.values());

      if (typeof callback === "function") {
        callback({
          success: true,
          projectId,
          onlineUsers,
          onlineCount: onlineUsers.length,
        });
      }

      console.log(
        `User ${socket.user.userId} joined ${room}. ` +
          `Online users: ${onlineUsers.length}`
      );
    } catch (error) {
      console.error("Join project error:", error);

      if (typeof callback === "function") {
        callback({
          success: false,
          message: "Failed to join project.",
        });
      }
    }
  });

  // Leave a project and notify the remaining users.
  socket.on("leave_project", async (projectId, callback) => {
    try {
      if (
        typeof projectId !== "string" ||
        !socket.data.projectRooms.has(projectId)
      ) {
        if (typeof callback === "function") {
          callback({
            success: false,
            message: "You have not joined this project.",
          });
        }
        return;
      }

      await socket.leave(`project:${projectId}`);
      socket.data.projectRooms.delete(projectId);

      await broadcastProjectPresence(projectId);

      if (typeof callback === "function") {
        callback({
          success: true,
          projectId,
        });
      }

      console.log(
        `User ${socket.user.userId} left project:${projectId}`
      );
    } catch (error) {
      console.error("Leave project error:", error);

      if (typeof callback === "function") {
        callback({
          success: false,
          message: "Failed to leave project.",
        });
      }
    }
  });

  // Update presence when a user disconnects.
  socket.on("disconnecting", async () => {
    const projectIds = Array.from(socket.data.projectRooms || []);

    // During disconnecting, the socket is still in its rooms.
    // Exclude this socket to calculate who will remain online.
    for (const projectId of projectIds) {
      try {
        const room = `project:${projectId}`;
        const sockets = await io.in(room).fetchSockets();

        const uniqueUsers = new Map();

        for (const connectedSocket of sockets) {
          if (
            connectedSocket.id !== socket.id &&
            connectedSocket.user
          ) {
            uniqueUsers.set(connectedSocket.user.userId, {
              userId: connectedSocket.user.userId,
              email: connectedSocket.user.email,
            });
          }
        }

        const onlineUsers = Array.from(uniqueUsers.values());

        // Notify the remaining users about the updated presence.
        socket.to(room).emit("presence_update", {
          projectId,
          onlineUsers,
          onlineCount: onlineUsers.length,
        });
      } catch (error) {
        console.error(
          `Presence update failed for project ${projectId}:`,
          error
        );
      }
    }
  });

  socket.on("disconnect", (reason) => {
    console.log(
      `User disconnected: ${socket.user.userId}. Reason: ${reason}`
    );
  });
});

// Start server
const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log("Socket.IO is ready for authenticated connections.");
});

// Graceful shutdown
async function shutdown() {
  console.log("Shutting down server...");

  io.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

// Export for task-controller integration and testing
module.exports = { app, server, io };

