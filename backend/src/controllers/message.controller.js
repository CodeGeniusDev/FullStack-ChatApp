import Message from "../models/message.model.js";
import User from "../models/user.model.js";
import cloudinary from "../lib/cloudinary.js";

export const getUsersForSidebar = async (req, res) => {
  try {
    const loggedInUserId = req.user._id;

    const filteredUsers = await User.find({ _id: { $ne: loggedInUserId } })
      .select("-password")
      .sort({ createdAt: -1 });

    res.status(200).json(filteredUsers);
  } catch (error) {
    console.error("Error in getUsersForSidebar:", error);
    res.status(500).json({ error: error.message });
  }
};

export const getMessages = async (req, res) => {
  try {
    const { id: userToChatId } = req.params;
    const senderId = req.user._id;

    const messages = await Message.find({
      $or: [
        { senderId: senderId, receiverId: userToChatId },
        { senderId: userToChatId, receiverId: senderId },
      ],
      deletedFor: { $ne: senderId }, // Exclude messages deleted by current user
    })
      .sort({ createdAt: 1 })
      .populate("senderId", "fullName profilePic")
      .populate("receiverId", "fullName profilePic")
      .populate({
        path: "replyTo",
        populate: {
          path: "senderId",
          select: "fullName profilePic",
        },
      })
      .populate("reactions.userId", "fullName");

    // Mark messages as delivered when fetched
    await Message.updateMany(
      {
        receiverId: senderId,
        senderId: userToChatId,
        status: "sent",
      },
      { status: "delivered" }
    );

    // Emit delivery status update to sender
    const io = req.app.get("io");
    const senderSocketId = req.app.get("userSocketMap")?.[userToChatId];
    if (senderSocketId) {
      io.to(senderSocketId).emit("messagesDelivered", { userId: senderId });
    }

    res.status(200).json(messages);
  } catch (error) {
    console.error("Error in getMessages:", error);
    res.status(500).json({ error: error.message });
  }
};

export const sendMessage = async (req, res) => {
  try {
    const { text, image, replyTo } = req.body;
    const { id: receiverId } = req.params;
    const senderId = req.user._id;

    let imageUrl;

    if (image) {
      const uploadResponse = await cloudinary.uploader.upload(image);
      imageUrl = uploadResponse.secure_url;
    }

    const newMessage = new Message({
      senderId,
      receiverId,
      text,
      image: imageUrl,
      replyTo: replyTo || null,
      status: "sent",
    });

    await newMessage.save();

    await newMessage.populate("senderId", "fullName profilePic");
    await newMessage.populate("receiverId", "fullName profilePic");
    if (replyTo) {
      await newMessage.populate({
        path: "replyTo",
        populate: { path: "senderId", select: "fullName profilePic" },
      });
    }

    const io = req.app.get("io");
    const receiverSocketId = req.app.get("userSocketMap")?.[receiverId];

    if (receiverSocketId) {
      io.to(receiverSocketId).emit("newMessage", newMessage);
    }

    res.status(201).json(newMessage);
  } catch (error) {
    console.error("Error in sendMessage:", error);
    res.status(500).json({ error: error.message });
  }
};

// Mark messages as read
export const markAsRead = async (req, res) => {
  try {
    const { id: senderId } = req.params;
    const receiverId = req.user._id;

    await Message.updateMany(
      {
        senderId: senderId,
        receiverId: receiverId,
        status: { $ne: "read" },
      },
      { status: "read" }
    );

    // Emit read status to sender
    const io = req.app.get("io");
    const senderSocketId = req.app.get("userSocketMap")?.[senderId];
    if (senderSocketId) {
      io.to(senderSocketId).emit("messagesRead", { userId: receiverId });
    }

    res.status(200).json({ message: "Messages marked as read" });
  } catch (error) {
    console.error("Error in markAsRead:", error);
    res.status(500).json({ error: error.message });
  }
};

// Delete message
export const deleteMessage = async (req, res) => {
  try {
    const { id: messageId } = req.params;
    const { deleteForEveryone } = req.body;
    const userId = req.user._id;

    const message = await Message.findById(messageId);

    if (!message) {
      return res.status(404).json({ error: "Message not found" });
    }

    if (deleteForEveryone) {
      // Only sender can delete for everyone (within 1 hour)
      if (message.senderId.toString() !== userId.toString()) {
        return res.status(403).json({ error: "Unauthorized" });
      }

      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      if (message.createdAt < oneHourAgo) {
        return res
          .status(400)
          .json({ error: "Can only delete within 1 hour" });
      }

      await Message.findByIdAndDelete(messageId);

      // Emit deletion to receiver
      const io = req.app.get("io");
      const receiverSocketId =
        req.app.get("userSocketMap")?.[message.receiverId];
      if (receiverSocketId) {
        io.to(receiverSocketId).emit("messageDeleted", {
          messageId,
          deleteForEveryone: true,
        });
      }

      res.status(200).json({ message: "Message deleted for everyone" });
    } else {
      // Delete for self
      message.deletedFor.push(userId);
      await message.save();

      res.status(200).json({ message: "Message deleted for you" });
    }
  } catch (error) {
    console.error("Error in deleteMessage:", error);
    res.status(500).json({ error: error.message });
  }
};

// Edit message
export const editMessage = async (req, res) => {
  try {
    const { id: messageId } = req.params;
    const { text } = req.body;
    const userId = req.user._id;

    const message = await Message.findById(messageId);

    if (!message) {
      return res.status(404).json({ error: "Message not found" });
    }

    if (message.senderId.toString() !== userId.toString()) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    // Can only edit within 15 minutes
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
    if (message.createdAt < fifteenMinutesAgo) {
      return res
        .status(400)
        .json({ error: "Can only edit within 15 minutes" });
    }

    message.text = text;
    message.isEdited = true;
    message.editedAt = new Date();
    await message.save();

    await message.populate("senderId", "fullName profilePic");
    await message.populate("receiverId", "fullName profilePic");

    // Emit edit to receiver
    const io = req.app.get("io");
    const receiverSocketId = req.app.get("userSocketMap")?.[message.receiverId];
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("messageEdited", message);
    }

    res.status(200).json(message);
  } catch (error) {
    console.error("Error in editMessage:", error);
    res.status(500).json({ error: error.message });
  }
};

// Add reaction to message
export const addReaction = async (req, res) => {
  try {
    const { id: messageId } = req.params;
    const { emoji } = req.body;
    const userId = req.user._id;

    const message = await Message.findById(messageId);

    if (!message) {
      return res.status(404).json({ error: "Message not found" });
    }

    // Remove previous reaction from this user
    message.reactions = message.reactions.filter(
      (r) => r.userId.toString() !== userId.toString()
    );

    // Add new reaction
    message.reactions.push({ userId, emoji });
    await message.save();

    await message.populate("reactions.userId", "fullName");

    // Emit reaction update
    const io = req.app.get("io");
    const otherUserId =
      message.senderId.toString() === userId.toString()
        ? message.receiverId
        : message.senderId;
    const otherUserSocketId = req.app.get("userSocketMap")?.[otherUserId];

    if (otherUserSocketId) {
      io.to(otherUserSocketId).emit("reactionAdded", {
        messageId,
        reactions: message.reactions,
      });
    }

    res.status(200).json(message);
  } catch (error) {
    console.error("Error in addReaction:", error);
    res.status(500).json({ error: error.message });
  }
};

// Get unread message count
export const getUnreadCount = async (req, res) => {
  try {
    const userId = req.user._id;

    const unreadCounts = await Message.aggregate([
      {
        $match: {
          receiverId: userId,
          status: { $ne: "read" },
          deletedFor: { $ne: userId },
        },
      },
      {
        $group: {
          _id: "$senderId",
          count: { $sum: 1 },
        },
      },
    ]);

    res.status(200).json(unreadCounts);
  } catch (error) {
    console.error("Error in getUnreadCount:", error);
    res.status(500).json({ error: error.message });
  }
};
