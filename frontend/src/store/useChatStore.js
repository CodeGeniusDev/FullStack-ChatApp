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
  pinnedContacts: [],
  mutedChats: [],
  // Pagination state
  currentPage: 1,
  hasMoreMessages: false,
  isLoadingMore: false,

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
              video: message.video,
              audio: message.audio,
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
    set({ isMessagesLoading: true, currentPage: 1 });
    try {
      if (!userId) {
        throw new Error("No user ID provided");
      }
      const res = await axiosInstance.get(`/messages/user/${userId}?page=1&limit=50`);
      
      set({ 
        messages: res.data.messages || [],
        hasMoreMessages: res.data.pagination?.hasMore || false,
        currentPage: 1,
      });

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

  // Load more messages (pagination)
  loadMoreMessages: async (userId) => {
    const { currentPage, hasMoreMessages, isLoadingMore } = get();
    
    if (!hasMoreMessages || isLoadingMore) return;
    
    set({ isLoadingMore: true });
    try {
      const nextPage = currentPage + 1;
      const res = await axiosInstance.get(
        `/messages/user/${userId}?page=${nextPage}&limit=50`
      );
      
      const olderMessages = res.data.messages || [];
      
      set((state) => ({
        messages: [...olderMessages, ...state.messages],
        currentPage: nextPage,
        hasMoreMessages: res.data.pagination?.hasMore || false,
        isLoadingMore: false,
      }));
    } catch (error) {
      console.error("Error loading more messages:", error);
      toast.error("Failed to load more messages");
      set({ isLoadingMore: false });
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
      video: messageData.video,
      audio: messageData.audio,
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
      video: optimisticMessage.video,
      audio: optimisticMessage.audio,
      createdAt: optimisticMessage.createdAt,
      senderId: authUser._id,
    });

    try {
      if (!messageData.text && !messageData.image && !messageData.video && !messageData.audio) {
        throw new Error("Message must contain text or media");
      }
      
      const res = await axiosInstance.post(
        `/messages/send/${selectedUser._id}`,
        {
          ...messageData,
          replyTo: replyingTo?._id || null,
        }
      );

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
        video: res.data.video,
        audio: res.data.audio,
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
      const { authUser } = useAuthStore.getState();
      const res = await axiosInstance.post(`/messages/reaction/${messageId}`, {
        emoji,
      });

      // Update the reactions with the current user's profile picture
      const updatedReactions = res.data.reactions.map(reaction => {
        if (reaction.userId._id === authUser._id) {
          return {
            ...reaction,
            userId: {
              ...reaction.userId,
              profilePic: authUser.profilePic,
              fullName: authUser.fullName
            }
          };
        }
        return reaction;
      });

      set({
        messages: get().messages.map((msg) =>
          msg._id === messageId
            ? { ...msg, reactions: updatedReactions }
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

  // Debounced typing indicator
  typingTimeout: null,
  setTyping: (isTyping) => {
    const { selectedUser, typingTimeout } = get();
    const socket = useAuthStore.getState().socket;

    if (socket && selectedUser) {
      // Clear previous timeout
      if (typingTimeout) {
        clearTimeout(typingTimeout);
      }

      socket.emit("typing", {
        receiverId: selectedUser._id,
        isTyping,
      });

      // Auto-stop typing after 3 seconds
      if (isTyping) {
        const newTimeout = setTimeout(() => {
          socket.emit("typing", {
            receiverId: selectedUser._id,
            isTyping: false,
          });
        }, 3000);
        set({ typingTimeout: newTimeout });
      }
    }
  },

  subscribeToMessages: () => {
    const { selectedUser } = get();
    if (!selectedUser) return;

    const socket = useAuthStore.getState().socket;
    if (!socket) return;

    // Remove any existing listeners first
    socket.off("newMessage");
    socket.off("messagesDelivered");
    socket.off("messagesRead");
    socket.off("messageDeleted");
    socket.off("messageEdited");
    socket.off("reactionAdded");
    socket.off("userTyping");

    // New message
    socket.on("newMessage", (newMessage) => {
      const { selectedUser: currentSelectedUser, notificationsEnabled } = get();
      const isMessageFromSelectedUser =
        newMessage.senderId._id === currentSelectedUser?._id;

      // ALWAYS update sidebar for any new message
      get().updateUserLastMessage(newMessage.senderId._id, {
        text: newMessage.text,
        image: newMessage.image,
        video: newMessage.video,
        audio: newMessage.audio,
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

        // Show toast notification (only if not on the page)
        if (document.hidden) {
          toast.success(
            `New message from ${newMessage.senderId.fullName || "User"}`,
            {
              duration: 3000,
            }
          );
        }

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
      const { authUser } = useAuthStore.getState();
      
      // Update reactions with the current user's profile picture if it's their reaction
      const updatedReactions = reactions.map(reaction => {
        if (reaction.userId._id === authUser._id) {
          return {
            ...reaction,
            userId: {
              ...reaction.userId,
              profilePic: authUser.profilePic,
              fullName: authUser.fullName
            }
          };
        }
        return reaction;
      });

      set({
        messages: get().messages.map((msg) =>
          msg._id === messageId ? { ...msg, reactions: updatedReactions } : msg
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
      
      // Auto-clear typing indicator after 3.5 seconds
      if (isTyping) {
        setTimeout(() => {
          set({
            typingUsers: {
              ...get().typingUsers,
              [senderId]: false,
            },
          });
        }, 3500);
      }
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
    set({ selectedUser: user, replyingTo: null, currentPage: 1 });
  },

  // Pin/unpin contacts
  togglePinContact: (userId) => {
    set((state) => {
      const isPinned = state.pinnedContacts.includes(userId);
      const newPinned = isPinned
        ? state.pinnedContacts.filter((id) => id !== userId)
        : [...state.pinnedContacts, userId];
      
      // Save to localStorage
      if (typeof window !== "undefined") {
        localStorage.setItem("pinnedContacts", JSON.stringify(newPinned));
      }
      
      return { pinnedContacts: newPinned };
    });
  },

  loadPinnedContacts: () => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("pinnedContacts");
      if (saved) {
        set({ pinnedContacts: JSON.parse(saved) });
      }
    }
  },

  // Mute/unmute chats
  toggleMuteChat: (userId) => {
    set((state) => {
      const isMuted = state.mutedChats.includes(userId);
      const newMuted = isMuted
        ? state.mutedChats.filter((id) => id !== userId)
        : [...state.mutedChats, userId];
      
      // Save to localStorage
      if (typeof window !== "undefined") {
        localStorage.setItem("mutedChats", JSON.stringify(newMuted));
      }
      
      return { mutedChats: newMuted };
    });
  },

  loadMutedChats: () => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("mutedChats");
      if (saved) {
        set({ mutedChats: JSON.parse(saved) });
      }
    }
  },
}));
