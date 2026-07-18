import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import {
  getUsersForSidebar,
  sendMessage,
  getMessages,
  markAsRead,
  deleteMessage,
  editMessage,
  addReaction,
  removeReaction,
  getUnreadCount,
  clearChat,
} from "../controllers/message.controller.js";
import { rateLimit, validateObjectIdParam } from "../middleware/validation.middleware.js";

const router = express.Router();

router.get("/user", protectRoute, getUsersForSidebar);
router.get("/user/:id", protectRoute, validateObjectIdParam, getMessages);
router.post("/send/:id", protectRoute, validateObjectIdParam, rateLimit({ windowMs: 10_000, limit: 30, keyPrefix: "message" }), sendMessage);

// New WhatsApp-like features
router.put("/read/:id", protectRoute, validateObjectIdParam, markAsRead);
router.delete("/:id", protectRoute, validateObjectIdParam, deleteMessage);
router.put("/edit/:id", protectRoute, validateObjectIdParam, editMessage);
router.post("/reaction/:id", protectRoute, validateObjectIdParam, addReaction);
router.delete("/reaction/:id", protectRoute, validateObjectIdParam, removeReaction);
router.get("/unread/count", protectRoute, getUnreadCount);
router.delete("/clear/:id", protectRoute, validateObjectIdParam, clearChat);

export default router;
