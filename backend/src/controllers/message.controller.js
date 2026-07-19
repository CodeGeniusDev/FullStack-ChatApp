import Message from "../models/message.model.js";
import User from "../models/user.model.js";
import cloudinary from "../lib/cloudinary.js";

export const getUsersForSidebar = async (req, res) => {
  try {
    const loggedInUserId = req.user._id;

    const [allUsers, conversationMetadata] = await Promise.all([
      User.find({ _id: { $ne: loggedInUserId } })
        .select("_id fullName email profilePic bio lastSeen createdAt")
        .lean(),
      Message.aggregate([
      { $match: { $or: [{ senderId: loggedInUserId }, { receiverId: loggedInUserId }], deletedFor: { $ne: loggedInUserId } } },
      { $sort: { createdAt: -1 } },
      { $addFields: { otherUserId: { $cond: [{ $eq: ["$senderId", loggedInUserId] }, "$receiverId", "$senderId"] } } },
      { $group: {
        _id: "$otherUserId",
        lastMessage: { $first: { _id: "$_id", text: "$text", image: "$image", video: "$video", audio: "$audio", createdAt: "$createdAt", senderId: "$senderId", status: "$status" } },
        unreadCount: { $sum: { $cond: [{ $and: [{ $eq: ["$receiverId", loggedInUserId] }, { $ne: ["$status", "read"] }] }, 1, 0] } },
      } },
      ]),
    ]);
    const metadataByUser = new Map(conversationMetadata.map((entry) => [entry._id.toString(), entry]));
    const usersWithLastMessage = allUsers.map((user) => {
      const metadata = metadataByUser.get(user._id.toString());
      return { ...user, lastMessage: metadata?.lastMessage || null, unreadCount: metadata?.unreadCount || 0 };
    });

    // Sort users by last message timestamp (most recent first)
    usersWithLastMessage.sort((a, b) => {
      const aTime = a.lastMessage?.createdAt || a.createdAt;
      const bTime = b.lastMessage?.createdAt || b.createdAt;
      return new Date(bTime) - new Date(aTime);
    });

    res.status(200).json(usersWithLastMessage);
  } catch (error) {
    console.error("Sidebar query failed:", error.name);
    res.status(500).json({ message: "Failed to load users" });
  }
};

export const getMessages = async (req, res) => {
  try {
    const { id: userToChatId } = req.params;
    const senderId = req.user._id;
    
    if (!(await User.exists({ _id: userToChatId }))) return res.status(404).json({ message: "User not found" });
    const limit = Math.min(80, Math.max(1, Number.parseInt(req.query.limit, 10) || 40));
    const before = req.query.before ? new Date(req.query.before) : null;
    if (before && Number.isNaN(before.getTime())) return res.status(400).json({ message: "Invalid message cursor" });

    const conversationFilter = {
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
      ...(before ? { createdAt: { $lt: before } } : {}),
    };

    const messages = await Message.find(conversationFilter)
      .sort({ createdAt: -1, _id: -1 })
      .limit(limit + 1)
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
      .lean();

    const hasMore = messages.length > limit;
    if (hasMore) messages.pop();

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
      io.to(`user:${userToChatId}`).emit("messagesDelivered", { userId: senderId });
    }).catch((error) => console.error("Delivery update failed:", error.name));

    res.status(200).json({
      messages,
      pagination: {
        limit,
        hasMore,
        nextCursor: hasMore ? messages[0]?.createdAt : null,
      },
    });
  } catch (error) {
    console.error("Message query failed:", error.name);
    res.status(500).json({ message: "Failed to load messages" });
  }
};

export const sendMessage = async (req, res) => {
  try {
    const { text, image, video, audio, replyTo } = req.body;
    const { id: receiverId } = req.params;
    const senderId = req.user._id;

    if (receiverId === senderId.toString()) return res.status(400).json({ message: "Cannot message yourself" });
    if (!(await User.exists({ _id: receiverId }))) return res.status(404).json({ message: "Recipient not found" });
    const normalizedText = typeof text === "string" ? text.trim() : "";
    const mediaValues = [image, video, audio].filter(Boolean);
    if (!normalizedText && mediaValues.length === 0) return res.status(400).json({ message: "Message must contain text or media" });
    if (normalizedText.length > 5000) return res.status(400).json({ message: "Message is too long" });
    if (mediaValues.length > 1) return res.status(400).json({ message: "Only one media attachment is allowed" });
    if (mediaValues.some((value) => typeof value !== "string" || value.length > 1_800_000)) return res.status(413).json({ message: "Media payload is too large" });
    if (replyTo) {
      const repliedMessage = await Message.findById(replyTo).lean();
      const belongsToConversation = repliedMessage && [repliedMessage.senderId.toString(), repliedMessage.receiverId.toString()].includes(senderId.toString()) && [repliedMessage.senderId.toString(), repliedMessage.receiverId.toString()].includes(receiverId);
      if (!belongsToConversation) return res.status(400).json({ message: "Invalid reply target" });
    }

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
          console.error("Image upload failed:", uploadError.name);
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
          console.error("Video upload failed:", uploadError.name);
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
          console.error("Audio upload failed:", uploadError.name);
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
      text: normalizedText,
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
    io.to(`user:${senderId}`).emit("messageSent", newMessage.toObject());
    const recipientOnline = req.app.get("userSocketMap")?.has(receiverId);
    if (recipientOnline) {
      io.to(`user:${receiverId}`).emit("newMessage", newMessage.toObject());

      // Update status to delivered if receiver is online (async)
      newMessage.status = "delivered";
      newMessage.save().catch((error) =>
        console.error("Message status update failed:", error.name)
      );
    }

    // Send response immediately without waiting for status update
    res.status(201).json(newMessage);
  } catch (error) {
    console.error("Message send failed:", error.name);
    res.status(500).json({ message: "Failed to send message" });
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
    io.to(`user:${senderId}`).emit("messagesRead", { userId: receiverId });

    res.status(200).json({ message: "Messages marked as read" });
  } catch (error) {
    console.error("Error in markAsRead:", error);
    res.status(500).json({ message: "Failed to update message status" });
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
      return res.status(404).json({ message: "Message not found" });
    }

    if (deleteForEveryone) {
      if (message.senderId.toString() !== userId.toString()) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      if (message.createdAt < oneHourAgo) {
        return res.status(400).json({ message: "Can only delete within 1 hour" });
      }

      await Message.findByIdAndDelete(messageId);

      const io = req.app.get("io");
      io.to(`user:${message.receiverId}`).emit("messageDeleted", {
          messageId,
          deleteForEveryone: true,
      });

      res.status(200).json({ message: "Message deleted for everyone" });
    } else {
      const isParticipant = [message.senderId.toString(), message.receiverId.toString()].includes(userId.toString());
      if (!isParticipant) return res.status(403).json({ message: "Unauthorized" });
      if (!message.deletedFor.some((id) => id.toString() === userId.toString())) message.deletedFor.push(userId);
      await message.save();

      res.status(200).json({ message: "Message deleted for you" });
    }
  } catch (error) {
    console.error("Error in deleteMessage:", error);
    res.status(500).json({ message: "Failed to delete message" });
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
    res.status(500).json({ message: "Internal server error" });
  }
};

// Edit message
export const editMessage = async (req, res) => {
  try {
    const { id: messageId } = req.params;
    const text = typeof req.body.text === "string" ? req.body.text.trim() : "";
    const userId = req.user._id;
    if (!text || text.length > 5000) return res.status(400).json({ message: "Message text must be between 1 and 5000 characters" });

    const message = await Message.findById(messageId);

    if (!message) {
      return res.status(404).json({ message: "Message not found" });
    }

    if (message.senderId.toString() !== userId.toString()) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
    if (message.createdAt < fifteenMinutesAgo) {
      return res.status(400).json({ message: "Can only edit within 15 minutes" });
    }

    message.text = text;
    message.isEdited = true;
    message.editedAt = new Date();
    await message.save();

    await message.populate("senderId", "fullName profilePic");
    await message.populate("receiverId", "fullName profilePic");

    const io = req.app.get("io");
    io.to(`user:${message.receiverId}`).emit("messageEdited", message.toObject());

    res.status(200).json(message);
  } catch (error) {
    console.error("Error in editMessage:", error);
    res.status(500).json({ message: "Failed to edit message" });
  }
};

// Add reaction to message
export const addReaction = async (req, res) => {
  try {
    const { id: messageId } = req.params;
    const { emoji } = req.body;
    const userId = req.user._id;
    if (typeof emoji !== "string" || !emoji.trim() || emoji.length > 16) return res.status(400).json({ message: "Invalid reaction" });

    const message = await Message.findById(messageId);

    if (!message) {
      return res.status(404).json({ message: "Message not found" });
    }

    if (![message.senderId.toString(), message.receiverId.toString()].includes(userId.toString())) return res.status(403).json({ message: "Unauthorized" });

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
    io.to(`user:${otherUserId}`).emit("reactionAdded", {
        messageId,
        reactions: message.reactions,
    });

    res.status(200).json(message);
  } catch (error) {
    console.error("Error in addReaction:", error);
    res.status(500).json({ message: "Failed to update reaction" });
  }
};

// Remove reaction from message
export const removeReaction = async (req, res) => {
  try {
    const { id: messageId } = req.params;
    const { emoji } = req.body;
    const userId = req.user._id;

    const message = await Message.findById(messageId);

    if (!message) {
      return res.status(404).json({ message: "Message not found" });
    }

    if (![message.senderId.toString(), message.receiverId.toString()].includes(userId.toString())) return res.status(403).json({ message: "Unauthorized" });

    // Remove the specific reaction from the user
    message.reactions = message.reactions.filter(
      (r) => !(r.userId.toString() === userId.toString() && r.emoji === emoji)
    );
    
    await message.save();

    await message.populate("reactions.userId", "fullName profilePic");

    const io = req.app.get("io");
    const otherUserId =
      message.senderId.toString() === userId.toString()
        ? message.receiverId
        : message.senderId;
    io.to(`user:${otherUserId}`).emit("reactionRemoved", {
        messageId,
        reactions: message.reactions,
    });

    res.status(200).json(message);
  } catch (error) {
    console.error("Error in removeReaction:", error);
    res.status(500).json({ message: "Failed to update reaction" });
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
    res.status(500).json({ message: "Failed to load unread counts" });
  }
};
