import { create } from "zustand";
import toast from "react-hot-toast";
import { axiosInstance } from "../lib/axios";
import { useAuthStore } from "./useAuthStore";

export const useChatStore = create((set, get) => ({
  messages: [],
  users: [],
  selectedUser: null,
  isUsersLoading: false,
  isMessagesLoading: false,
  unreadCounts: {},
  replyingTo: null,
  typingUsers: {}, // Changed from isTyping to typingUsers object

  getUsers: async () => {
    set({ isUsersLoading: true });
    try {
      const res = await axiosInstance.get("/messages/user");
      set({ users: res.data });
    } catch (error) {
      console.error("Error fetching users:", error);
      toast.error(error.response?.data?.message || "Failed to fetch users");
      set({ users: [] });
    } finally {
      set({ isUsersLoading: false });
    }
  },

  getMessages: async (userId) => {
    set({ isMessagesLoading: true });
    try {
      if (!userId) {
        throw new Error("No user ID provided");
      }
      const res = await axiosInstance.get(`/messages/user/${userId}`);
      set({ messages: res.data || [] });

      // Mark messages as read
      await get().markMessagesAsRead(userId);
    } catch (error) {
      console.error("Error fetching messages:", error);
      toast.error(error.response?.data?.message || "Failed to load messages");
      set({ messages: [] });
    } finally {
      set({ isMessagesLoading: false });
    }
  },

  sendMessage: async (messageData) => {
    const { selectedUser, messages, replyingTo } = get();
    if (!selectedUser) {
      toast.error("No user selected");
      return;
    }

    try {
      const res = await axiosInstance.post(
        `/messages/send/${selectedUser._id}`,
        {
          ...messageData,
          replyTo: replyingTo?._id || null,
        }
      );
      set({ messages: [...messages, res.data], replyingTo: null });
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error(error.response?.data?.message || "Failed to send message");
    }
  },

  // Mark messages as read
  markMessagesAsRead: async (userId) => {
    try {
      await axiosInstance.put(`/messages/read/${userId}`);
      
      // Update unread counts
      const { unreadCounts } = get();
      const newCounts = { ...unreadCounts };
      delete newCounts[userId];
      set({ unreadCounts: newCounts });
    } catch (error) {
      console.error("Error marking messages as read:", error);
    }
  },

  // Delete message
  deleteMessage: async (messageId, deleteForEveryone = false) => {
    try {
      await axiosInstance.delete(`/messages/${messageId}`, {
        data: { deleteForEveryone },
      });

      if (deleteForEveryone) {
        // Remove from local state
        set({
          messages: get().messages.filter((msg) => msg._id !== messageId),
        });
      } else {
        // Just mark as deleted locally
        set({
          messages: get().messages.filter((msg) => msg._id !== messageId),
        });
      }

      toast.success(
        deleteForEveryone
          ? "Message deleted for everyone"
          : "Message deleted for you"
      );
    } catch (error) {
      console.error("Error deleting message:", error);
      toast.error(error.response?.data?.error || "Failed to delete message");
    }
  },

  // Edit message
  editMessage: async (messageId, newText) => {
    try {
      const res = await axiosInstance.put(`/messages/edit/${messageId}`, {
        text: newText,
      });

      // Update in local state
      set({
        messages: get().messages.map((msg) =>
          msg._id === messageId ? res.data : msg
        ),
      });

      toast.success("Message edited");
    } catch (error) {
      console.error("Error editing message:", error);
      toast.error(error.response?.data?.error || "Failed to edit message");
    }
  },

  // Add reaction
  addReaction: async (messageId, emoji) => {
    try {
      const res = await axiosInstance.post(`/messages/reaction/${messageId}`, {
        emoji,
      });

      // Update in local state
      set({
        messages: get().messages.map((msg) =>
          msg._id === messageId ? { ...msg, reactions: res.data.reactions } : msg
        ),
      });
    } catch (error) {
      console.error("Error adding reaction:", error);
      toast.error("Failed to add reaction");
    }
  },

  // Get unread counts
  getUnreadCounts: async () => {
    try {
      const res = await axiosInstance.get("/messages/unread/count");
      const counts = {};
      res.data.forEach((item) => {
        counts[item._id] = item.count;
      });
      set({ unreadCounts: counts });
    } catch (error) {
      console.error("Error fetching unread counts:", error);
    }
  },

  // Set replying to message
  setReplyingTo: (message) => set({ replyingTo: message }),

  // Clear replying to
  clearReplyingTo: () => set({ replyingTo: null }),

  // Typing indicator
  setTyping: (isTyping) => {
    const { selectedUser } = get();
    const socket = useAuthStore.getState().socket;
    
    if (socket && selectedUser) {
      socket.emit("typing", {
        receiverId: selectedUser._id,
        isTyping,
      });
    }
  },

  // Listen to incoming messages via Socket.IO
  subscribeToMessages: () => {
    const { selectedUser } = get();
    if (!selectedUser) return;

    const socket = useAuthStore.getState().socket;
    if (!socket) return;

    // New message
    socket.on("newMessage", (newMessage) => {
      const isMessageFromSelectedUser =
        newMessage.senderId._id === selectedUser._id;
      if (!isMessageFromSelectedUser) {
        // Update unread count
        const { unreadCounts } = get();
        set({
          unreadCounts: {
            ...unreadCounts,
            [newMessage.senderId._id]:
              (unreadCounts[newMessage.senderId._id] || 0) + 1,
          },
        });
        return;
      }

      set({
        messages: [...get().messages, newMessage],
      });

      // Auto mark as read
      get().markMessagesAsRead(selectedUser._id);
    });

    // Message delivered
    socket.on("messagesDelivered", ({ userId }) => {
      set({
        messages: get().messages.map((msg) =>
          msg.receiverId._id === userId && msg.status === "sent"
            ? { ...msg, status: "delivered" }
            : msg
        ),
      });
    });

    // Message read
    socket.on("messagesRead", ({ userId }) => {
      set({
        messages: get().messages.map((msg) =>
          msg.receiverId._id === userId
            ? { ...msg, status: "read" }
            : msg
        ),
      });
    });

    // Message deleted
    socket.on("messageDeleted", ({ messageId, deleteForEveryone }) => {
      if (deleteForEveryone) {
        set({
          messages: get().messages.filter((msg) => msg._id !== messageId),
        });
      }
    });

    // Message edited
    socket.on("messageEdited", (editedMessage) => {
      set({
        messages: get().messages.map((msg) =>
          msg._id === editedMessage._id ? editedMessage : msg
        ),
      });
    });

    // Reaction added
    socket.on("reactionAdded", ({ messageId, reactions }) => {
      set({
        messages: get().messages.map((msg) =>
          msg._id === messageId ? { ...msg, reactions } : msg
        ),
      });
    });

    // Typing indicator - track by userId
    socket.on("userTyping", ({ senderId, isTyping }) => {
      set({
        typingUsers: {
          ...get().typingUsers,
          [senderId]: isTyping,
        },
      });
    });
  },

  unsubscribeFromMessages: () => {
    const socket = useAuthStore.getState().socket;
    if (socket) {
      socket.off("newMessage");
      socket.off("messagesDelivered");
      socket.off("messagesRead");
      socket.off("messageDeleted");
      socket.off("messageEdited");
      socket.off("reactionAdded");
      socket.off("userTyping");
    }
  },

  setSelectedUser: (user) => {
    set({ selectedUser: user, replyingTo: null });
  },
}));
