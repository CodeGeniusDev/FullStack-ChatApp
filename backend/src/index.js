import "dotenv/config";
import express from "express";
import { createServer } from "http";
import cookieParser from "cookie-parser";
import cors from "cors";
import helmet from "helmet";
import authRoutes from "./routes/auth.route.js";
import messageRoutes from "./routes/message.route.js";
import { connectDB, disconnectDB, getDatabaseHealth, sanitizeDatabaseError } from "./lib/db.js";
import { getAllowedOrigins, validateEnvironment } from "./lib/env.js";
import { createSocketServer, getOnlineUserCount, userSockets } from "./lib/socket.js";

const app = express();
const server = createServer(app);
const port = Number(process.env.PORT) || 5002;
const allowedOrigins = getAllowedOrigins();
const corsOptions = {
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin.replace(/\/$/, ""))) return callback(null, true);
    return callback(Object.assign(new Error("Origin not allowed"), { status: 403 }));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.disable("x-powered-by");
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(cors(corsOptions));
app.options("*splat", cors(corsOptions));
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true, limit: "2mb" }));
app.use(cookieParser());

const io = createSocketServer(server, allowedOrigins);
app.set("io", io);
app.set("userSocketMap", userSockets);

app.get("/health", (_req, res) => res.status(200).json({ status: "ok", database: getDatabaseHealth().status, onlineUsers: getOnlineUserCount(), uptime: process.uptime() }));
app.get("/ready", (_req, res) => {
  const database = getDatabaseHealth();
  res.status(database.ready ? 200 : 503).json({ ready: database.ready, database: database.status });
});
app.use("/api/auth", authRoutes);
app.use("/api/messages", messageRoutes);
app.use((_req, res) => res.status(404).json({ success: false, message: "API route not found" }));
app.use((error, _req, res, _next) => {
  let status = Number(error.status) || 500;
  let message = status >= 500 ? "Internal server error" : error.message;
  if (error.type === "entity.too.large") { status = 413; message = "Request payload is too large"; }
  if (error.name === "CastError") { status = 400; message = "Invalid identifier"; }
  if (error.name === "ValidationError") { status = 400; message = "Request validation failed"; }
  if (error.code === 11000) { status = 409; message = "A record with that value already exists"; }
  if (status >= 500) console.error("Request failed:", error.name || "Error");
  res.status(status).json({ success: false, message });
});

let shuttingDown = false;
const shutdown = async (signal, exitCode = 0) => {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`${signal} received; shutting down`);
  io.close();
  server.close(async () => {
    await disconnectDB();
    process.exit(exitCode);
  });
  setTimeout(() => process.exit(1), 10_000).unref();
};

const startServer = async () => {
  try {
    validateEnvironment();
    await connectDB();
    await new Promise((resolve, reject) => {
      const handleError = (error) => reject(error);
      server.once("error", handleError);
      server.listen(port, "0.0.0.0", () => {
        server.off("error", handleError);
        console.log(`Server running on port ${port}`);
        resolve();
      });
    });
  } catch (error) {
    const errorText = `${error?.name || ""} ${error?.message || ""}`;
    const message = error?.code === "EADDRINUSE"
      ? `Port ${port} is already in use`
      : /mongo|querysrv|enotfound|econnrefused/i.test(errorText)
        ? sanitizeDatabaseError(error)
        : error?.message || "Unknown startup error";
    console.error("Application startup failed:", message);
    await disconnectDB();
    process.exit(1);
  }
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("unhandledRejection", (error) => { console.error("Unhandled rejection:", error?.name || "Error"); shutdown("unhandledRejection", 1); });
process.on("uncaughtException", (error) => { console.error("Uncaught exception:", error?.name || "Error"); shutdown("uncaughtException", 1); });

startServer();
