import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import { login, logout, signup, updateProfile, checkAuth, togglePinContact, toggleMuteChat } from "../controllers/auth.controller.js";

const router = express.Router();

router.post("/signup", signup);
router.post("/login", login);
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
