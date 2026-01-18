import { create } from "zustand";
import toast from "react-hot-toast";
import { axiosInstance } from "../lib/axios";
import { useAuthStore } from "./useAuthStore";
import {
  showNotification,
  requestNotificationPermission,
  playNotificationSound,
} from "../lib/notifications";

export const useChatStore = create((set, get) => ({
  messages: [],
  users: [],
  selectedUser: null,
  isUsersLoading: false,
  isMessagesLoading: false,
  unreadCounts: {},
  replyingTo: null,
  typingUsers: {},
  notificationsEnabled: false,

  // Initialize notifications
  initNotifications: async () => {
    const granted = await requestNotificationPermission();
    set({ notificationsEnabled: granted });
    return granted;
  },

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

  // Update user's last message locally without full reload
  updateUserLastMessage: (userId, message) => {
    set((state) => {
      const updatedUsers = state.users.map((user) => {
        if (user._id === userId) {
          return {
            ...user,
            lastMessage: {
              text: message.text,
              image: message.image,
              createdAt: message.createdAt,
              senderId: message.senderId,
            },
          };
        }
        return user;
      });

      // Sort users by last message time
      const sortedUsers = [...updatedUsers].sort((a, b) => {
        const aTime = a.lastMessage?.createdAt || a.createdAt;
        const bTime = b.lastMessage?.createdAt || b.createdAt;
        return new Date(bTime) - new Date(aTime);
      });

      return { users: sortedUsers };
    });
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

    const authUser = useAuthStore.getState().authUser;

    // Create optimistic message for instant UI update
    const optimisticMessage = {
      _id: `temp-${Date.now()}`,
      text: messageData.text,
      image: messageData.image,
      senderId: {
        _id: authUser._id,
        fullName: authUser.fullName,
        profilePic: authUser.profilePic,
      },
      receiverId: {
        _id: selectedUser._id,
        fullName: selectedUser.fullName,
        profilePic: selectedUser.profilePic,
      },
      replyTo: replyingTo || null,
      status: "sent",
      createdAt: new Date().toISOString(),
      reactions: [],
      isEdited: false,
    };

    // Instantly add to UI and update sidebar
    set({ messages: [...messages, optimisticMessage], replyingTo: null });

    // Immediately update sidebar with optimistic message
    get().updateUserLastMessage(selectedUser._id, {
      text: optimisticMessage.text,
      image: optimisticMessage.image,
      createdAt: optimisticMessage.createdAt,
      senderId: authUser._id,
    });

    try {
      // Add validation if needed
      if (!messageData.text && !messageData.image) {
        throw new Error("Message must contain text or an image");
      }
      const res = await axiosInstance.post(
        `/messages/send/${selectedUser._id}`,
        {
          ...messageData,
          replyTo: replyingTo?._id || null,
        }
      );
      // return res.data;

      // Replace optimistic message with real one
      set({
        messages: get().messages.map((msg) =>
          msg._id === optimisticMessage._id ? res.data : msg
        ),
      });

      // Update sidebar with real message data
      get().updateUserLastMessage(selectedUser._id, {
        text: res.data.text,
        image: res.data.image,
        createdAt: res.data.createdAt,
        senderId: res.data.senderId._id,
      });
    } catch (error) {
      console.error("Error sending message:", error);

      // Remove optimistic message on error
      set({
        messages: get().messages.filter(
          (msg) => msg._id !== optimisticMessage._id
        ),
      });

      // Revert sidebar update on error
      const previousMessage = messages[messages.length - 1];
      if (previousMessage) {
        get().updateUserLastMessage(selectedUser._id, {
          text: previousMessage.text,
          image: previousMessage.image,
          createdAt: previousMessage.createdAt,
          senderId: previousMessage.senderId._id || previousMessage.senderId,
        });
      }

      toast.error(error.response?.data?.message || "Failed to send message");
    }
  },

  markMessagesAsRead: async (userId) => {
    try {
      await axiosInstance.put(`/messages/read/${userId}`);

      const { unreadCounts } = get();
      const newCounts = { ...unreadCounts };
      delete newCounts[userId];
      set({ unreadCounts: newCounts });
    } catch (error) {
      console.error("Error marking messages as read:", error);
    }
  },

  deleteMessage: async (messageId, deleteForEveryone = false) => {
    try {
      await axiosInstance.delete(`/messages/${messageId}`, {
        data: { deleteForEveryone },
      });

      set({
        messages: get().messages.filter((msg) => msg._id !== messageId),
      });

      toast.success(
        deleteForEveryone
          ? "Message deleted for everyone"
          : "Message deleted for you"
      );

      // Refresh user list only for deletions
      get().getUsers();
    } catch (error) {
      console.error("Error deleting message:", error);
      toast.error(error.response?.data?.error || "Failed to delete message");
    }
  },

  editMessage: async (messageId, newText) => {
    try {
      const res = await axiosInstance.put(`/messages/edit/${messageId}`, {
        text: newText,
      });

      set({
        messages: get().messages.map((msg) =>
          msg._id === messageId ? res.data : msg
        ),
      });

      toast.success("Message edited");

      // Update sidebar last message if it's the edited one
      const { selectedUser } = get();
      if (selectedUser) {
        const lastMsg = get().messages[get().messages.length - 1];
        if (lastMsg._id === messageId) {
          get().updateUserLastMessage(selectedUser._id, {
            text: res.data.text,
            image: res.data.image,
            createdAt: res.data.createdAt,
            senderId: res.data.senderId._id,
          });
        }
      }
    } catch (error) {
      console.error("Error editing message:", error);
      toast.error(error.response?.data?.error || "Failed to edit message");
    }
  },

  addReaction: async (messageId, emoji) => {
    try {
      const res = await axiosInstance.post(`/messages/reaction/${messageId}`, {
        emoji,
      });

      set({
        messages: get().messages.map((msg) =>
          msg._id === messageId
            ? { ...msg, reactions: res.data.reactions }
            : msg
        ),
      });
    } catch (error) {
      console.error("Error adding reaction:", error);
      toast.error("Failed to add reaction");
    }
  },

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

  setReplyingTo: (message) => set({ replyingTo: message }),

  clearReplyingTo: () => set({ replyingTo: null }),

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

  subscribeToMessages: () => {
    const { selectedUser } = get();
    if (!selectedUser) return;

    const socket = useAuthStore.getState().socket;
    if (!socket) return;

    // New message
    socket.on("newMessage", (newMessage) => {
      const { selectedUser: currentSelectedUser, notificationsEnabled } = get();
      const isMessageFromSelectedUser =
        newMessage.senderId._id === currentSelectedUser?._id;

      // ALWAYS update sidebar for any new message
      get().updateUserLastMessage(newMessage.senderId._id, {
        text: newMessage.text,
        image: newMessage.image,
        createdAt: newMessage.createdAt,
        senderId: newMessage.senderId._id,
      });

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

        // Show browser/PWA notification
        if (notificationsEnabled && document.hidden) {
          showNotification(newMessage.senderId.fullName || "New Message", {
            body: newMessage.text || "📷 Sent you a photo",
            icon: newMessage.senderId.profilePic || "/icons/icon-192x192.png",
            badge: "/icons/icon-96x96.png",
            tag: `message-${newMessage._id}`,
            url: "/",
          });

          // Play notification sound
          playNotificationSound();
        }

        // Show toast notification
        toast.success(
          `New message from ${newMessage.senderId.fullName || "User"}`,
          {
            duration: 3000,
          }
        );

        return;
      }

      // Add message to chat if it's from the selected user
      set({
        messages: [...get().messages, newMessage],
      });

      // Auto mark as read
      get().markMessagesAsRead(currentSelectedUser._id);
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
          msg.receiverId._id === userId ? { ...msg, status: "read" } : msg
        ),
      });
    });

    // Message deleted
    socket.on("messageDeleted", ({ messageId, deleteForEveryone }) => {
      if (deleteForEveryone) {
        set({
          messages: get().messages.filter((msg) => msg._id !== messageId),
        });
        get().getUsers();
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

    // Typing indicator
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
