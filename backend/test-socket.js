require("dotenv").config();

const { io } = require("socket.io-client");

const token = process.env.TEST_JWT_TOKEN;
const projectId = process.env.TEST_PROJECT_ID;

if (!token || !projectId) {
  console.error(
    "Missing TEST_JWT_TOKEN or TEST_PROJECT_ID environment variable."
  );
  process.exit(1);
}

const socket = io(
  import.meta.env.VITE_API_URL?.replace(/\/api\/?$/, "") || "http://localhost:5000",
  {
    auth: { token },
    reconnection: false,
    timeout: 5000,
  }
);

socket.on("connect", () => {
  console.log("SUCCESS: Socket.IO connected!");
  console.log("Socket ID:", socket.id);

  socket.emit("join_project", projectId, (result) => {
    console.log("Project room result:", result);

    if (result?.success) {
      console.log("SUCCESS: Joined project room!");
      console.log("Listening for task events. Keep this terminal open.");
    } else {
      console.error("FAILED to join project room:", result?.message);
      socket.disconnect();
      process.exitCode = 1;
    }
  });
});
socket.on("presence_update", (data) => {
  console.log("\n🔵 PRESENCE UPDATED!");
  console.log(JSON.stringify(data, null, 2));
});

socket.on("task_created", (data) => {
  console.log("\nSUCCESS: Received task_created event");
  console.log(JSON.stringify(data, null, 2));
});

socket.on("task_updated", (data) => {
  console.log("\nSUCCESS: Received task_updated event");
  console.log(JSON.stringify(data, null, 2));
});

socket.on("task_deleted", (data) => {
  console.log("\nSUCCESS: Received task_deleted event");
  console.log(JSON.stringify(data, null, 2));
});

socket.on("connect_error", (error) => {
  console.error("CONNECTION FAILED:", error.message);
  process.exitCode = 1;
});

socket.on("disconnect", (reason) => {
  console.log("Socket disconnected:", reason);
});

