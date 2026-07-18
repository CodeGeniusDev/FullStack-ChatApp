import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { Server } from "socket.io";
import User from "../models/user.model.js";
import { parseCookieHeader } from "./utils.js";

const userSockets = new Map();
const eventWindows = new Map();
const roomFor = (userId) => `user:${userId}`;

const permitEvent = (socket, event, limit = 30, windowMs = 10_000) => {
  const key = `${socket.id}:${event}`;
  const now = Date.now();
  const recent = (eventWindows.get(key) || []).filter((time) => now - time < windowMs);
  if (recent.length >= limit) return false;
  recent.push(now);
  eventWindows.set(key, recent);
  return true;
};

const validUserId = (value) => mongoose.isValidObjectId(value);

export const createSocketServer = (server, allowedOrigins) => {
  const io = new Server(server, {
    cors: { origin: allowedOrigins, methods: ["GET", "POST"], credentials: true },
    maxHttpBufferSize: 1_000_000,
    connectionStateRecovery: { maxDisconnectionDuration: 2 * 60 * 1000, skipMiddlewares: false },
  });

  io.use(async (socket, next) => {
    try {
      const token = parseCookieHeader(socket.handshake.headers.cookie).token;
      if (!token) return next(new Error("Authentication required"));
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.userId).select("_id").lean();
      if (!user) return next(new Error("Authentication required"));
      socket.data.userId = user._id.toString();
      next();
    } catch {
      next(new Error("Authentication required"));
    }
  });

  io.on("connection", (socket) => {
    const userId = socket.data.userId;
    const wasOnline = userSockets.has(userId);
    const sockets = userSockets.get(userId) || new Set();
    sockets.add(socket.id);
    userSockets.set(userId, sockets);
    socket.join(roomFor(userId));
    User.findByIdAndUpdate(userId, { lastSeen: new Date() }).catch(() => {});
    if (!wasOnline) io.emit("getOnlineUsers", [...userSockets.keys()]);

    socket.on("typing", (payload = {}) => {
      if (!permitEvent(socket, "typing", 40) || !validUserId(payload.receiverId) || typeof payload.isTyping !== "boolean") return;
      socket.to(roomFor(payload.receiverId)).volatile.emit("userTyping", { senderId: userId, isTyping: payload.isTyping });
    });

    const relay = (event, targetKey, outputEvent = event) => socket.on(event, (payload = {}) => {
      const target = payload[targetKey];
      if (!permitEvent(socket, event, 12) || !validUserId(target)) return;
      const safePayload = { ...payload, from: userId };
      delete safePayload[targetKey];
      socket.to(roomFor(target)).emit(outputEvent, safePayload);
    });
    relay("callUser", "userToCall", "incomingCall");
    relay("answerCall", "to", "callAccepted");
    relay("rejectCall", "to", "callRejected");
    relay("endCall", "to", "callEnded");

    socket.on("disconnect", () => {
      eventWindows.forEach((_, key) => { if (key.startsWith(`${socket.id}:`)) eventWindows.delete(key); });
      const active = userSockets.get(userId);
      active?.delete(socket.id);
      if (!active?.size) {
        userSockets.delete(userId);
        User.findByIdAndUpdate(userId, { lastSeen: new Date() }).catch(() => {});
        io.emit("getOnlineUsers", [...userSockets.keys()]);
      }
    });
  });

  return io;
};

export const emitToUser = (io, userId, event, payload) => io.to(roomFor(userId.toString())).emit(event, payload);
export const getOnlineUserCount = () => userSockets.size;
export { userSockets };
