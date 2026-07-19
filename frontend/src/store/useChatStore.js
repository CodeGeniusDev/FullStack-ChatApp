import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import toast from "react-hot-toast";
import { axiosInstance } from "../lib/axios";
import { useAuthStore } from "./useAuthStore";
import {
  showNotification,
  requestNotificationPermission,
  playNotificationSound,
} from "../lib/notifications";

let messageRequestId = 0;
let messageAbortController = null;
let usersPromise = null;
let unreadPromise = null;
let socketHandlers = null;
const typingClearTimers = new Map();
const entityId = (value) => (typeof value === "object" ? value?._id : value);
const mergeUniqueMessages = (messages) => {
  const seen = new Set();
  return messages.filter((message) => {
    if (!message?._id || seen.has(message._id)) return false;
    seen.add(message._id);
    return true;
  });
};

export const useChatStore = create(persist((set, get) => ({
  messages: [],
  messageCache: {},
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
  messageCursor: null,
  hasMoreMessages: false,
  isLoadingMore: false,
  isSendingMessage: false,
  pendingSendCount: 0,
  isHydrated: false,
  isOffline: typeof navigator !== "undefined" ? !navigator.onLine : false,
  setHydrated: () => set((state) => ({
    isHydrated: true,
    messages: state.selectedUser?._id
      ? (state.messageCache[state.selectedUser._id]?.messages || []).map((message) =>
          message.status === "sending" ? { ...message, status: "failed" } : message,
        )
      : [],
  })),
  setOffline: (isOffline) => set({ isOffline }),
  resetSession: () => {
    const timeout = get().typingTimeout;
    if (timeout) clearTimeout(timeout);
    typingClearTimers.forEach(clearTimeout);
    typingClearTimers.clear();
    messageRequestId += 1;
    set({ messages: [], messageCache: {}, users: [], selectedUser: null, unreadCounts: {}, replyingTo: null, typingUsers: {}, pinnedContacts: [], mutedChats: [], currentPage: 1, messageCursor: null, hasMoreMessages: false, isLoadingMore: false, isSendingMessage: false, pendingSendCount: 0, typingTimeout: null });
  },

  // Initialize notifications
  initNotifications: async () => {
    const granted = await requestNotificationPermission();
    set({ notificationsEnabled: granted });
    return granted;
  },

  getUsers: async () => {
    if (usersPromise) return usersPromise;
    usersPromise = (async () => {
    set({ isUsersLoading: true });
    try {
      const res = await axiosInstance.get("/messages/user");
      const unreadCounts = Object.fromEntries(
        res.data.filter((user) => user.unreadCount > 0).map((user) => [user._id, user.unreadCount]),
      );
      set({ users: res.data, unreadCounts });
    } catch (error) {
      console.error("Error fetching users:", error);
      if (!get().users.length && navigator.onLine) {
        toast.error(error.response?.data?.message || "Failed to fetch users");
      }
    } finally {
      set({ isUsersLoading: false });
      usersPromise = null;
    }
    })();
    return usersPromise;
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
    const requestId = ++messageRequestId;
    messageAbortController?.abort();
    messageAbortController = new AbortController();
    const { signal } = messageAbortController;
    const cachedMessages = get().messageCache[userId]?.messages;
    set({ isMessagesLoading: true, currentPage: 1, ...(cachedMessages?.length ? { messages: cachedMessages } : {}) });
    try {
      if (!userId) {
        throw new Error("No user ID provided");
      }
      const res = await axiosInstance.get(
        `/messages/user/${userId}?limit=40`, { signal },
      );

      if (requestId !== messageRequestId || get().selectedUser?._id !== userId) return;
      set({
        messages: mergeUniqueMessages(res.data.messages || []),
        hasMoreMessages: res.data.pagination?.hasMore || false,
        currentPage: 1,
        messageCursor: res.data.pagination?.nextCursor || null,
      });

      // Mark messages as read
      void get().markMessagesAsRead(userId);
    } catch (error) {
      if (error.code === "ERR_CANCELED") return;
      console.error("Error fetching messages:", error);
      if (!get().messages.length && navigator.onLine) {
        toast.error(error.response?.data?.message || "Failed to load messages");
      }
    } finally {
      if (requestId === messageRequestId) set({ isMessagesLoading: false });
    }
  },

  // Load more messages (pagination)
  loadMoreMessages: async (userId) => {
    const { currentPage, messageCursor, hasMoreMessages, isLoadingMore, selectedUser } = get();

    if (!hasMoreMessages || isLoadingMore || selectedUser?._id !== userId) return;
    const requestId = messageRequestId;

    set({ isLoadingMore: true });
    try {
      const res = await axiosInstance.get(
        `/messages/user/${userId}?limit=40&before=${encodeURIComponent(messageCursor)}`,
      );

      const olderMessages = res.data.messages || [];

      if (requestId !== messageRequestId || get().selectedUser?._id !== userId) return;
      set((state) => ({
        messages: mergeUniqueMessages([...olderMessages, ...state.messages]),
        currentPage: currentPage + 1,
        messageCursor: res.data.pagination?.nextCursor || null,
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
    const { selectedUser, replyingTo } = get();
    if (!selectedUser) {
      toast.error("No user selected");
      return false;
    }
    const authUser = useAuthStore.getState().authUser;

    // Create optimistic message for instant UI update
    const optimisticMessage = {
      _id: `temp-${crypto.randomUUID()}`,
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
      status: "sending",
      pendingPayload: messageData,
      createdAt: new Date().toISOString(),
      reactions: [],
      isEdited: false,
    };

    // Instantly add to UI and update sidebar
    set((state) => ({ messages: [...state.messages, optimisticMessage], replyingTo: null, pendingSendCount: state.pendingSendCount + 1, isSendingMessage: true }));

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
      if (
        !messageData.text &&
        !messageData.image &&
        !messageData.video &&
        !messageData.audio
      ) {
        throw new Error("Message must contain text or media");
      }

      const res = await axiosInstance.post(
        `/messages/send/${selectedUser._id}`,
        {
          ...messageData,
          replyTo: replyingTo?._id || null,
        },
      );

      // Replace optimistic message with real one
      set((state) => ({ messages: mergeUniqueMessages(state.messages.map((msg) => msg._id === optimisticMessage._id ? res.data : msg)) }));

      // Update sidebar with real message data
      get().updateUserLastMessage(selectedUser._id, {
        text: res.data.text,
        image: res.data.image,
        video: res.data.video,
        audio: res.data.audio,
        createdAt: res.data.createdAt,
        senderId: res.data.senderId._id,
      });
      return true;
    } catch (error) {
      console.error("Error sending message:", error);

      set((state) => ({
        messages: state.messages.map((msg) => msg._id === optimisticMessage._id ? { ...msg, status: "failed" } : msg),
      }));

      toast.error(error.response?.data?.message || "Failed to send message");
      return false;
    } finally {
      set((state) => {
        const pendingSendCount = Math.max(0, state.pendingSendCount - 1);
        return { pendingSendCount, isSendingMessage: pendingSendCount > 0 };
      });
    }
  },

  retryMessage: async (messageId) => {
    const failed = get().messages.find((message) => message._id === messageId && message.status === "failed");
    if (!failed?.pendingPayload) return false;
    set((state) => ({ messages: state.messages.filter((message) => message._id !== messageId) }));
    return get().sendMessage(failed.pendingPayload);
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
          : "Message deleted for you",
      );

      // Refresh user list only for deletions
      get().getUsers();
    } catch (error) {
      console.error("Error deleting message:", error);
      toast.error(error.response?.data?.message || "Failed to delete message");
    }
  },

  clearChat: async (userId) => {
    try {
      await axiosInstance.delete(`/messages/clear/${userId}`);
      set({ messages: [], replyingTo: null });
      await get().getUsers();
      return true;
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to clear chat");
      return false;
    }
  },

  editMessage: async (messageId, newText) => {
    try {
      const res = await axiosInstance.put(`/messages/edit/${messageId}`, {
        text: newText,
      });

      set({
        messages: get().messages.map((msg) =>
          msg._id === messageId ? res.data : msg,
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
      toast.error(error.response?.data?.message || "Failed to edit message");
    }
  },

  addReaction: async (messageId, emoji) => {
    try {
      const { authUser } = useAuthStore.getState();
      const res = await axiosInstance.post(`/messages/reaction/${messageId}`, {
        emoji,
      });

      // Update the reactions with the current user's profile picture
      const updatedReactions = res.data.reactions.map((reaction) => {
        if (reaction.userId._id === authUser._id) {
          return {
            ...reaction,
            userId: {
              ...reaction.userId,
              profilePic: authUser.profilePic,
              fullName: authUser.fullName,
            },
          };
        }
        return reaction;
      });

      set({
        messages: get().messages.map((msg) =>
          msg._id === messageId ? { ...msg, reactions: updatedReactions } : msg,
        ),
      });
    } catch (error) {
      console.error("Error adding reaction:", error);
      toast.error("Failed to add reaction");
    }
  },

  removeReaction: async (messageId, emoji) => {
    try {
      const res = await axiosInstance.delete(
        `/messages/reaction/${messageId}`,
        {
          data: { emoji },
        },
      );

      // Update the reactions in the local state
      set({
        messages: get().messages.map((msg) =>
          msg._id === messageId
            ? { ...msg, reactions: res.data.reactions }
            : msg,
        ),
      });
    } catch (error) {
      console.error("Error removing reaction:", error);
      toast.error("Failed to remove reaction");
    }
  },

  getUnreadCounts: async () => {
    if (unreadPromise) return unreadPromise;
    unreadPromise = (async () => {
    try {
      const res = await axiosInstance.get("/messages/unread/count");
      const counts = {};
      res.data.forEach((item) => {
        counts[item._id] = item.count;
      });
      set({ unreadCounts: counts });
    } catch (error) {
      console.error("Error fetching unread counts:", error);
    } finally {
      unreadPromise = null;
    }
    })();
    return unreadPromise;
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
    const socket = useAuthStore.getState().socket;
    if (!socket) return;

    get().unsubscribeFromMessages();

    // New message
    const handleNewMessage = (newMessage) => {
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
            },
          );
        }

        return;
      }

      // Add message to chat if it's from the selected user
      set((state) => ({ messages: mergeUniqueMessages([...state.messages, newMessage]) }));

      // Auto mark as read
      get().markMessagesAsRead(currentSelectedUser._id);
    };

    const handleMessageSent = (sentMessage) => {
      const receiverId = entityId(sentMessage.receiverId);
      get().updateUserLastMessage(receiverId, sentMessage);
      if (get().selectedUser?._id === receiverId) {
        set((state) => ({ messages: mergeUniqueMessages([...state.messages, sentMessage]) }));
      }
    };

    // Message delivered
    const handleMessagesDelivered = ({ userId }) => {
      set({
        messages: get().messages.map((msg) =>
          entityId(msg.receiverId) === userId && msg.status === "sent"
            ? { ...msg, status: "delivered" }
            : msg,
        ),
      });
    };

    // Message read
    const handleMessagesRead = ({ userId }) => {
      set({
        messages: get().messages.map((msg) =>
          entityId(msg.receiverId) === userId ? { ...msg, status: "read" } : msg,
        ),
      });
    };

    // Message deleted
    const handleMessageDeleted = ({ messageId, deleteForEveryone }) => {
      if (deleteForEveryone) {
        set({
          messages: get().messages.filter((msg) => msg._id !== messageId),
        });
        get().getUsers();
      }
    };

    // Message edited
    const handleMessageEdited = (editedMessage) => {
      set({
        messages: get().messages.map((msg) =>
          msg._id === editedMessage._id ? editedMessage : msg,
        ),
      });
    };

    // Reaction added
    const handleReactionAdded = ({ messageId, reactions }) => {
      const { authUser } = useAuthStore.getState();

      // Update reactions with the current user's profile picture if it's their reaction
      const updatedReactions = reactions.map((reaction) => {
        if (reaction.userId._id === authUser._id) {
          return {
            ...reaction,
            userId: {
              ...reaction.userId,
              profilePic: authUser.profilePic,
              fullName: authUser.fullName,
            },
          };
        }
        return reaction;
      });

      set({
        messages: get().messages.map((msg) =>
          msg._id === messageId ? { ...msg, reactions: updatedReactions } : msg,
        ),
      });
    };

    // Reaction removed
    const handleReactionRemoved = ({ messageId, reactions }) => {
      set({
        messages: get().messages.map((msg) =>
          msg._id === messageId ? { ...msg, reactions: reactions } : msg,
        ),
      });
    };

    // Typing indicator
    const handleUserTyping = ({ senderId, isTyping }) => {
      set({
        typingUsers: {
          ...get().typingUsers,
          [senderId]: isTyping,
        },
      });
      
      // Auto-clear typing indicator after 3.5 seconds
      if (isTyping) {
        clearTimeout(typingClearTimers.get(senderId));
        const timer = setTimeout(() => {
          set({
            typingUsers: {
              ...get().typingUsers,
              [senderId]: false,
            },
          });
          typingClearTimers.delete(senderId);
        }, 3500);
        typingClearTimers.set(senderId, timer);
      }
    };

    // Pinned contacts updated (sync across devices)
    const handlePinnedContactsUpdated = ({ pinnedContacts }) => {
      set({ pinnedContacts });
    };

    // Muted chats updated (sync across devices)
    const handleMutedChatsUpdated = ({ mutedChats }) => {
      set({ mutedChats });
    };
    socketHandlers = { newMessage: handleNewMessage, messageSent: handleMessageSent, messagesDelivered: handleMessagesDelivered, messagesRead: handleMessagesRead, messageDeleted: handleMessageDeleted, messageEdited: handleMessageEdited, reactionAdded: handleReactionAdded, reactionRemoved: handleReactionRemoved, userTyping: handleUserTyping, pinnedContactsUpdated: handlePinnedContactsUpdated, mutedChatsUpdated: handleMutedChatsUpdated };
    Object.entries(socketHandlers).forEach(([event, handler]) => socket.on(event, handler));
  },

  unsubscribeFromMessages: () => {
    const socket = useAuthStore.getState().socket;
    if (socket && socketHandlers) Object.entries(socketHandlers).forEach(([event, handler]) => socket.off(event, handler));
    socketHandlers = null;
  },

  setSelectedUser: (user) => {
    messageRequestId += 1;
    messageAbortController?.abort();
    const cachedMessages = user?._id ? get().messageCache[user._id]?.messages || [] : [];
    set({ selectedUser: user, messages: cachedMessages, replyingTo: null, currentPage: 1, messageCursor: null, hasMoreMessages: false, isMessagesLoading: false });
  },

  // Pin/unpin contacts
  togglePinContact: async (userId) => {
    const previous = get().pinnedContacts;
    try {
      // Optimistically update UI
      set((state) => {
        const isPinned = state.pinnedContacts.includes(userId);
        const newPinned = isPinned
          ? state.pinnedContacts.filter((id) => id !== userId)
          : [...state.pinnedContacts, userId];
        return { pinnedContacts: newPinned };
      });

      // Send to backend to sync across devices
      const res = await axiosInstance.post("/auth/toggle-pin", {
        contactId: userId,
      });

      // Update with server response to ensure consistency
      set({ pinnedContacts: res.data.pinnedContacts });
    } catch (error) {
      console.error("Error toggling pin:", error);
      toast.error("Failed to update pin status");
      // Revert on error
      set({ pinnedContacts: previous });
    }
  },

  // Mute/unmute chats
  toggleMuteChat: async (userId) => {
    const previous = get().mutedChats;
    try {
      // Optimistically update UI
      set((state) => {
        const isMuted = state.mutedChats.includes(userId);
        const newMuted = isMuted
          ? state.mutedChats.filter((id) => id !== userId)
          : [...state.mutedChats, userId];
        return { mutedChats: newMuted };
      });

      // Send to backend to sync across devices
      const res = await axiosInstance.post("/auth/toggle-mute", {
        chatId: userId,
      });

      // Update with server response to ensure consistency
      set({ mutedChats: res.data.mutedChats });
    } catch (error) {
      console.error("Error toggling mute:", error);
      toast.error("Failed to update mute status");
      // Revert on error
      set({ mutedChats: previous });
    }
  },

}), {
  name: "chatgeniusx-chat-cache-v1",
  storage: createJSONStorage(() => localStorage),
  partialize: (state) => ({
    users: state.users,
    selectedUser: state.selectedUser,
    messageCache: state.messageCache,
    unreadCounts: state.unreadCounts,
    pinnedContacts: state.pinnedContacts,
    mutedChats: state.mutedChats,
  }),
  onRehydrateStorage: () => (state) => {
    state?.setHydrated?.();
  },
}));

useChatStore.subscribe((state, previousState) => {
  const userId = state.selectedUser?._id;
  if (!userId || state.messages === previousState.messages) return;
  const nextCache = {
    ...state.messageCache,
    [userId]: {
      messages: state.messages
        .slice(-50)
        .filter((message) => !message._id.startsWith("temp-") || message.pendingPayload?.text)
        .map((message) => ({
          ...message,
          ...(message.pendingPayload
            ? { pendingPayload: { text: message.pendingPayload.text } }
            : {}),
        })),
      cachedAt: Date.now(),
    },
  };
  const boundedCache = Object.fromEntries(
    Object.entries(nextCache)
      .sort(([, a], [, b]) => b.cachedAt - a.cachedAt)
      .slice(0, 8),
  );
  useChatStore.setState({ messageCache: boundedCache });
});
