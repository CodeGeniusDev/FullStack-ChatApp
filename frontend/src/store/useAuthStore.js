import { create } from "zustand";
import { axiosInstance } from "../lib/axios.js";
import toast from "react-hot-toast";
import { io } from "socket.io-client";

const SOCKET_URL = (import.meta.env.VITE_SOCKET_URL || "http://localhost:5002").replace(/\/+$/, "");
let authCheckPromise = null;

export const useAuthStore = create((set, get) => ({
  authUser: null,
  isSigningUp: false,
  isLoggingIn: false,
  isUpdatingProfile: false,
  isCheckingAuth: true,
  onlineUsers: [],
  socket: null,
  isSocketConnected: false,

  checkAuth: async () => {
    if (authCheckPromise) return authCheckPromise;
    authCheckPromise = (async () => {
    set({ isCheckingAuth: true });
    try {
      const res = await axiosInstance.get("/auth/check");
      if (res.data) {
        set({
          authUser: res.data,
          isCheckingAuth: false,
        });
        
        get().connectSocket();
      }
    } catch {
      set({
        authUser: null,
        isCheckingAuth: false,
      });
    } finally {
      authCheckPromise = null;
    }
    })();
    return authCheckPromise;
  },

  signup: async (data) => {
    set({ isSigningUp: true });
    try {
      const res = await axiosInstance.post("/auth/signup", data);
      set({ authUser: res.data });
      toast.success("Account created successfully");
      get().connectSocket();
    } catch (error) {
      toast.error(error.response?.data?.message || "Signup failed");
    } finally {
      set({ isSigningUp: false });
    }
  },

  login: async (data) => {
    set({ isLoggingIn: true });
    try {
      const res = await axiosInstance.post("/auth/login", data);
      set({ authUser: res.data });
      toast.success("Logged in successfully");
      get().connectSocket();
    } catch (error) {
      toast.error(error.response?.data?.message || "Login failed");
    } finally {
      set({ isLoggingIn: false });
    }
  },

  logOut: async () => {
    try {
      await axiosInstance.post("/auth/logout");
      get().disconnectSocket();
      set({ authUser: null, onlineUsers: [] });
      toast.success("Logged out successfully");
    } catch (error) {
      toast.error(error.response?.data?.message || "Logout failed");
    }
  },

  updateProfile: async (data) => {
    set({ isUpdatingProfile: true });
    try {
      const res = await axiosInstance.put("/auth/update-profile", data);
      set({ authUser: res.data });
      toast.success("Profile updated successfully");
      return res.data;
    } catch (error) {
      console.error("Error in update profile:", error);
      const errorMessage =
        error.response?.data?.message ||
        (error.response?.status === 413
          ? "File is too large. Please upload a smaller file."
          : "Failed to update profile. Please try again.");
      toast.error(errorMessage);
      throw error;
    } finally {
      set({ isUpdatingProfile: false });
    }
  },

  connectSocket: () => {
    const { authUser, socket } = get();
    if (!authUser || socket?.connected) return;

    if (socket) {
      socket.removeAllListeners();
      socket.disconnect();
    }
    const newSocket = io(SOCKET_URL, {
      withCredentials: true,
      // Reconnection settings
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 8,
      // Timeout settings
      timeout: 20000,
      // Enable compression
    });

    newSocket.on("connect", () => {
      set({ socket: newSocket, isSocketConnected: true });
    });

    newSocket.on("disconnect", () => set({ isSocketConnected: false, onlineUsers: [] }));

    newSocket.on("connect_error", (error) => {
      if (error.message === "Authentication required") {
        newSocket.io.opts.reconnection = false;
        newSocket.disconnect();
        set({ socket: null, isSocketConnected: false, onlineUsers: [] });
      } else {
        set({ isSocketConnected: false });
      }
    });

    newSocket.on("getOnlineUsers", (userIds) => {
      set({ onlineUsers: userIds });
    });

    set({ socket: newSocket, isSocketConnected: false });
  },

  disconnectSocket: () => {
    const { socket } = get();
    if (socket) {
      socket.removeAllListeners();
      socket.disconnect();
      set({ socket: null, isSocketConnected: false, onlineUsers: [] });
    }
  },
}));
