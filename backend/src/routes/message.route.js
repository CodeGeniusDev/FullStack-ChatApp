import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import {
  getUsersForSidebar,
  getMessages,
  sendMessage,
  markAsRead,
  deleteMessage,
  editMessage,
  addReaction,
  getUnreadCount,
  clearChat,
} from "../controllers/message.controller.js";

const router = express.Router();

router.get("/user", protectRoute, getUsersForSidebar);
router.get("/user/:id", protectRoute, getMessages);
router.post("/send/:id", protectRoute, sendMessage);

// New WhatsApp-like features
router.put("/read/:id", protectRoute, markAsRead);
router.delete("/:id", protectRoute, deleteMessage);
router.put("/edit/:id", protectRoute, editMessage);
router.post("/reaction/:id", protectRoute, addReaction);
router.get("/unread/count", protectRoute, getUnreadCount);
router.delete("/clear/:id", protectRoute, clearChat);

export default router;
