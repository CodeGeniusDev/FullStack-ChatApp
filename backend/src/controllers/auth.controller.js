import { clearTokenCookie, generateToken } from "../lib/utils.js";
import User from "../models/user.model.js";
import bcrypt from "bcryptjs";
import cloudinary from "../lib/cloudinary.js";
import mongoose from "mongoose";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const signup = async (req, res) => {
  const fullName = typeof req.body.fullName === "string" ? req.body.fullName.trim() : "";
  const email = typeof req.body.email === "string" ? req.body.email.trim().toLowerCase() : "";
  const password = typeof req.body.password === "string" ? req.body.password : "";
  try {
    if (!fullName || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }
    if (fullName.length < 2 || fullName.length > 80) return res.status(400).json({ message: "Full name must be between 2 and 80 characters" });
    if (!EMAIL_PATTERN.test(email) || email.length > 254) return res.status(400).json({ message: "Enter a valid email address" });

    if (password.length < 6) {
      return res
        .status(400)
        .json({ message: "Password must be at least 6 characters" });
    }
    const user = await User.findOne({ email });
    if (user) return res.status(409).json({ message: "Email already exists" });
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const newUser = new User({
      fullName: fullName,
      email: email,
      password: hashedPassword,
    });

    if (newUser) {
      await newUser.save();
      generateToken(newUser._id, res);

      res.status(201).json({
        _id: newUser._id,
        fullName: newUser.fullName,
        email: newUser.email,
        profilePic: newUser.profilePic,
        bio: newUser.bio,
        createdAt: newUser.createdAt,
      });
    } else {
      return res.status(400).json({ message: "User not created" });
    }
  } catch (error) {
    console.error("Signup failed:", error.name);
    if (error?.code === 11000) return res.status(409).json({ message: "Email already exists" });
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

export const login = async (req, res) => {
  const email = typeof req.body.email === "string" ? req.body.email.trim().toLowerCase() : "";
  const password = typeof req.body.password === "string" ? req.body.password : "";

  try {
    const user = await User.findOne({ email }).select("+password");
    if (!user) return res.status(401).json({ message: "Invalid credentials" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(401).json({ message: "Invalid credentials" });

    generateToken(user._id, res);

    res.status(200).json({
      _id: user._id,
      fullName: user.fullName,
      email: user.email,
      profilePic: user.profilePic,
      bio: user.bio,
      createdAt: user.createdAt,
      message: "User logged in successfully",
    });
  } catch (error) {
    console.error("Login failed:", error.name);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

export const logout = (req, res) => {
  try {
    clearTokenCookie(res);
    return res.status(200).json({ message: "User logged out successfully" });
  } catch (error) {
    console.error("Logout failed:", error.name);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const { profilePic, fullName, bio } = req.body;
    const userId = req.user._id;

    const updateData = {};

    // Update name if provided
    if (fullName !== undefined) {
      if (typeof fullName !== "string" || fullName.trim().length < 2 || fullName.trim().length > 80) return res.status(400).json({ message: "Full name must be between 2 and 80 characters" });
      updateData.fullName = fullName.trim();
    }

    // Update bio if provided
    if (bio !== undefined) {
      if (typeof bio !== "string" || bio.length > 150) {
        return res
          .status(400)
          .json({ message: "Bio must be 150 characters or less" });
      }
      updateData.bio = bio.trim();
    }

    // Handle profile picture upload
    if (
      profilePic &&
      typeof profilePic === "string" &&
      /^data:image\/(jpeg|jpg|png|webp);base64,/i.test(profilePic)
    ) {
      try {
        const uploadResponse = await cloudinary.uploader.upload(profilePic, {
          folder: "chat_app/profile_pics",
          resource_type: "image",
          transformation: [
            { width: 400, height: 400, crop: "fill", gravity: "face" },
            { quality: "auto" },
          ],
        });

        updateData.profilePic = uploadResponse.secure_url;
      } catch (uploadError) {
        console.error("Cloudinary upload failed:", uploadError.name);
        return res.status(500).json({
          message: "Failed to upload image to Cloudinary",
        });
      }
    }

    // Check if there's anything to update
    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ message: "No fields to update" });
    }

    const updatedUser = await User.findByIdAndUpdate(userId, updateData, {
      new: true,
    }).select("-password");

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json(updatedUser);
  } catch (error) {
    console.error("Profile update failed:", error.name);
    return res.status(500).json({
      message: "Internal Server Error",
    });
  }
};

export const checkAuth = (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const user = req.user;
    // Make sure to exclude sensitive data
    const userData = {
      _id: user._id,
      fullName: user.fullName,
      email: user.email,
      profilePic: user.profilePic,
      bio: user.bio,
      createdAt: user.createdAt,
      pinnedContacts: user.pinnedContacts || [],
      mutedChats: user.mutedChats || [],
      // Add other non-sensitive fields as needed
    };
    res.status(200).json(userData);
  } catch (error) {
    console.error("Auth check failed:", error.name);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// Toggle pin contact
export const togglePinContact = async (req, res) => {
  try {
    const { contactId } = req.body;
    const userId = req.user._id;

    if (!mongoose.isValidObjectId(contactId)) {
      return res.status(400).json({ message: "Contact ID is required" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (contactId === userId.toString() || !(await User.exists({ _id: contactId }))) return res.status(400).json({ message: "Invalid contact" });
    const isPinned = user.pinnedContacts.some((id) => id.toString() === contactId);

    if (isPinned) {
      // Unpin
      user.pinnedContacts = user.pinnedContacts.filter((id) => id.toString() !== contactId);
    } else {
      // Pin
      user.pinnedContacts.push(contactId);
    }

    await user.save();

    // Emit socket event to sync across devices
    const io = req.app.get("io");
    io.to(`user:${userId}`).emit("pinnedContactsUpdated", { pinnedContacts: user.pinnedContacts });

    res.status(200).json({
      pinnedContacts: user.pinnedContacts,
      message: isPinned ? "Contact unpinned" : "Contact pinned",
    });
  } catch (error) {
    console.error("Pin update failed:", error.name);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// Toggle mute chat
export const toggleMuteChat = async (req, res) => {
  try {
    const { chatId } = req.body;
    const userId = req.user._id;

    if (!mongoose.isValidObjectId(chatId)) {
      return res.status(400).json({ message: "Chat ID is required" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (chatId === userId.toString() || !(await User.exists({ _id: chatId }))) return res.status(400).json({ message: "Invalid chat" });
    const isMuted = user.mutedChats.some((id) => id.toString() === chatId);

    if (isMuted) {
      // Unmute
      user.mutedChats = user.mutedChats.filter((id) => id.toString() !== chatId);
    } else {
      // Mute
      user.mutedChats.push(chatId);
    }

    await user.save();

    // Emit socket event to sync across devices
    const io = req.app.get("io");
    io.to(`user:${userId}`).emit("mutedChatsUpdated", { mutedChats: user.mutedChats });

    res.status(200).json({
      mutedChats: user.mutedChats,
      message: isMuted ? "Chat unmuted" : "Chat muted",
    });
  } catch (error) {
    console.error("Mute update failed:", error.name);
    res.status(500).json({ message: "Internal Server Error" });
  }
};
