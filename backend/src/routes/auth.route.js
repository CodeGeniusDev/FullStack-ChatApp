import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import { login, logout, signup, updateProfile, checkAuth, togglePinContact, toggleMuteChat } from "../controllers/auth.controller.js";
import { rateLimit } from "../middleware/validation.middleware.js";

const router = express.Router();

const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 20, keyPrefix: "auth" });
router.post("/signup", authLimiter, signup);
router.post("/login", authLimiter, login);
router.post("/logout", logout);

router.put("/update-profile", protectRoute, updateProfile);

router.get("/check", protectRoute, checkAuth);

// Pin and Mute routes
router.post("/toggle-pin", protectRoute, togglePinContact);
router.post("/toggle-mute", protectRoute, toggleMuteChat);

// router.get("/refresh", (req, res) => {
//     res.send("refresh Route");
// });

// router.post("/register", register);
// router.post("/login", login);

export default router;
