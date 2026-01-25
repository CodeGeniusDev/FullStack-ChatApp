import Message from "../models/message.model.js";
import User from "../models/user.model.js";
import cloudinary from "../lib/cloudinary.js";

export const getUsersForSidebar = async (req, res) => {
  try {
    const loggedInUserId = req.user._id;

    // Get all users except the logged-in user - optimized with lean()
    const allUsers = await User.find({ _id: { $ne: loggedInUserId } })
      .select("-password")
      .lean();

    // Get the last message for each conversation with parallel processing
    const usersWithLastMessage = await Promise.all(
      allUsers.map(async (user) => {
        const lastMessage = await Message.findOne({
          $or: [
            { senderId: loggedInUserId, receiverId: user._id },
            { senderId: user._id, receiverId: loggedInUserId },
          ],
          deletedFor: { $ne: loggedInUserId },
        })
          .sort({ createdAt: -1 })
          .select("text image video audio createdAt senderId")
          .lean()
          .hint({ senderId: 1, receiverId: 1, createdAt: -1 }); // Use index

        return {
          ...user,
          lastMessage: lastMessage || null,
        };
      })
    );

    // Sort users by last message timestamp (most recent first)
    usersWithLastMessage.sort((a, b) => {
      const aTime = a.lastMessage?.createdAt || a.createdAt;
      const bTime = b.lastMessage?.createdAt || b.createdAt;
      return new Date(bTime) - new Date(aTime);
    });

    res.status(200).json(usersWithLastMessage);
  } catch (error) {
    console.error("Error in getUsersForSidebar:", error);
    res.status(500).json({ error: error.message });
  }
};

export const getMessages = async (req, res) => {
  try {
    const { id: userToChatId } = req.params;
    const senderId = req.user._id;
    
    // Pagination parameters
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    // Get total count for pagination info
    const totalMessages = await Message.countDocuments({
      $or: [
        {
          senderId: senderId,
          receiverId: userToChatId,
          deletedFor: { $ne: senderId },
        },
        {
          senderId: userToChatId,
          receiverId: senderId,
          deletedFor: { $ne: senderId },
        },
      ],
    });

    const messages = await Message.find({
      $or: [
        {
          senderId: senderId,
          receiverId: userToChatId,
          deletedFor: { $ne: senderId },
        },
        {
          senderId: userToChatId,
          receiverId: senderId,
          deletedFor: { $ne: senderId },
        },
      ],
    })
      .sort({ createdAt: -1 }) // Get newest first
      .skip(skip)
      .limit(limit)
      .populate("senderId", "fullName profilePic")
      .populate("receiverId", "fullName profilePic")
      .populate({
        path: "replyTo",
        populate: {
          path: "senderId",
          select: "fullName profilePic",
        },
      })
      .populate("reactions.userId", "fullName profilePic")
      .lean()
      .hint({ senderId: 1, receiverId: 1, createdAt: -1 }); // Use compound index

    // Reverse to show oldest first in UI
    messages.reverse();

    // Mark messages as delivered when fetched (async, don't await)
    Message.updateMany(
      {
        receiverId: senderId,
        senderId: userToChatId,
        status: "sent",
      },
      { status: "delivered" }
    ).then(() => {
      // Emit delivery status update to sender
      const io = req.app.get("io");
      const senderSocketId = req.app.get("userSocketMap")?.[userToChatId];
      if (senderSocketId) {
        io.to(senderSocketId).emit("messagesDelivered", { userId: senderId });
      }
    }).catch(err => console.error("Error updating delivery status:", err));

    res.status(200).json({
      messages,
      pagination: {
        page,
        limit,
        total: totalMessages,
        hasMore: skip + messages.length < totalMessages,
      },
    });
  } catch (error) {
    console.error("Error in getMessages:", error);
    res.status(500).json({ error: error.message });
  }
};

export const sendMessage = async (req, res) => {
  try {
    const { text, image, video, audio, replyTo } = req.body;
    const { id: receiverId } = req.params;
    const senderId = req.user._id;

    let imageUrl, videoUrl, audioUrl, mediaType;

    // Upload media asynchronously in parallel if multiple media types
    const uploadPromises = [];

    if (image) {
      uploadPromises.push(
        cloudinary.uploader.upload(image, {
          resource_type: "auto",
          folder: "chat_images",
          transformation: [
            { width: 1200, height: 1200, crop: "limit" }, // Limit max size
            { quality: "auto:good" }, // Auto quality optimization
            { fetch_format: "auto" }, // Auto format (WebP when supported)
          ],
        }).then(uploadResponse => {
          imageUrl = uploadResponse.secure_url;
          mediaType = "image";
        }).catch(uploadError => {
          console.error("Image upload error:", uploadError);
          throw new Error("Failed to upload image");
        })
      );
    }

    if (video) {
      uploadPromises.push(
        cloudinary.uploader.upload(video, {
          resource_type: "video",
          folder: "chat_videos",
          chunk_size: 6000000, // 6MB chunks
          transformation: [
            { width: 1280, crop: "limit" },
            { quality: "auto" },
          ],
        }).then(uploadResponse => {
          videoUrl = uploadResponse.secure_url;
          mediaType = "video";
        }).catch(uploadError => {
          console.error("Video upload error:", uploadError);
          throw new Error("Failed to upload video");
        })
      );
    }

    if (audio) {
      uploadPromises.push(
        cloudinary.uploader.upload(audio, {
          resource_type: "video", // Cloudinary uses 'video' for audio
          folder: "chat_audio",
        }).then(uploadResponse => {
          audioUrl = uploadResponse.secure_url;
          mediaType = "audio";
        }).catch(uploadError => {
          console.error("Audio upload error:", uploadError);
          throw new Error("Failed to upload audio");
        })
      );
    }

    // Wait for all uploads to complete
    if (uploadPromises.length > 0) {
      await Promise.all(uploadPromises);
    }

    const newMessage = new Message({
      senderId,
      receiverId,
      text: text || "",
      image: imageUrl,
      video: videoUrl,
      audio: audioUrl,
      mediaType,
      replyTo: replyTo || null,
      status: "sent",
    });

    await newMessage.save();

    // Populate message data
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

    // Send to receiver immediately if online
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("newMessage", newMessage.toObject());

      // Update status to delivered if receiver is online (async)
      newMessage.status = "delivered";
      newMessage.save().catch(err => 
        console.error("Error updating message status:", err)
      );
    }

    // Send response immediately without waiting for status update
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

    // Emit read status to sender (async, don't block response)
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
      if (message.senderId.toString() !== userId.toString()) {
        return res.status(403).json({ error: "Unauthorized" });
      }

      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      if (message.createdAt < oneHourAgo) {
        return res.status(400).json({ error: "Can only delete within 1 hour" });
      }

      await Message.findByIdAndDelete(messageId);

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
      message.deletedFor.push(userId);
      await message.save();

      res.status(200).json({ message: "Message deleted for you" });
    }
  } catch (error) {
    console.error("Error in deleteMessage:", error);
    res.status(500).json({ error: error.message });
  }
};

// Clear chat for current user only
export const clearChat = async (req, res) => {
  try {
    const { id: otherUserId } = req.params;
    const userId = req.user._id;

    // Mark messages as deleted for the current user only
    await Message.updateMany(
      {
        $or: [
          {
            senderId: userId,
            receiverId: otherUserId,
            deletedFor: { $ne: userId },
          },
          {
            senderId: otherUserId,
            receiverId: userId,
            deletedFor: { $ne: userId },
          },
        ],
      },
      { $addToSet: { deletedFor: userId } }
    );

    res.status(200).json({
      success: true,
      message: "Chat cleared for you",
    });
  } catch (error) {
    console.error("Error in clearChat:", error);
    res.status(500).json({ error: "Internal server error" });
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

    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
    if (message.createdAt < fifteenMinutesAgo) {
      return res.status(400).json({ error: "Can only edit within 15 minutes" });
    }

    message.text = text;
    message.isEdited = true;
    message.editedAt = new Date();
    await message.save();

    await message.populate("senderId", "fullName profilePic");
    await message.populate("receiverId", "fullName profilePic");

    const io = req.app.get("io");
    const receiverSocketId = req.app.get("userSocketMap")?.[message.receiverId];
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("messageEdited", message.toObject());
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

    message.reactions = message.reactions.filter(
      (r) => r.userId.toString() !== userId.toString()
    );

    message.reactions.push({ userId, emoji });
    await message.save();

    await message.populate("reactions.userId", "fullName profilePic");

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
