"use client";
import React, { useEffect, useState, useRef, useCallback } from "react";
import { useChatStore } from "../store/useChatStore";
import SidebarSkeleton from "./skeletons/SidebarSkeleton";
import { Users, GripVertical, Menu, X } from "lucide-react";
import { useAuthStore } from "../store/useAuthStore";
import { formatLastSeen, truncateText } from "../lib/utils";

// Default and constraints for sidebar width
const SIDEBAR = {
  MIN_WIDTH: 240,
  MAX_WIDTH: 500,
  DEFAULT_WIDTH: 280,
  STORAGE_KEY: "chat-sidebar-width",
};

const Sidebar = () => {
  const {
    users = [],
    getUsers,
    selectedUser,
    setSelectedUser,
    isUsersLoading,
    unreadCounts,
    getUnreadCounts,
  } = useChatStore();

  const { onlineUsers } = useAuthStore();
  const [showOnlineOnly, setShowOnlineOnly] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isResizing, setIsResizing] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    // Get width from localStorage or use default
    if (typeof window !== "undefined") {
      const savedWidth = localStorage.getItem(SIDEBAR.STORAGE_KEY);
      return savedWidth
        ? Math.max(SIDEBAR.MIN_WIDTH, parseInt(savedWidth, 10))
        : SIDEBAR.DEFAULT_WIDTH;
    }
    return SIDEBAR.DEFAULT_WIDTH;
  });

  // Close mobile menu when a user is selected
  useEffect(() => {
    if (selectedUser && window.innerWidth < 1024) {
      setIsMobileOpen(false);
    }
  }, [selectedUser]);

  // Close sidebar when clicking outside on mobile
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        isMobileOpen &&
        sidebarRef.current &&
        !sidebarRef.current.contains(e.target) &&
        !e.target.closest(".mobile-menu-button")
      ) {
        setIsMobileOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isMobileOpen]);
  const dropdownRef = useRef(null);
  const sidebarRef = useRef(null);

  // Save width to localStorage when it changes
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(SIDEBAR.STORAGE_KEY, sidebarWidth.toString());
    }
  }, [sidebarWidth]);

  const startResizing = useCallback(() => {
    setIsResizing(true);
  }, []);

  const stopResizing = useCallback(() => {
    setIsResizing(false);
  }, []);

  const resize = useCallback(
    (e) => {
      if (isResizing && sidebarRef.current) {
        const newWidth =
          e.clientX - sidebarRef.current.getBoundingClientRect().left;
        if (newWidth >= SIDEBAR.MIN_WIDTH && newWidth <= SIDEBAR.MAX_WIDTH) {
          setSidebarWidth(newWidth);
        }
      }
    },
    [isResizing]
  );

  useEffect(() => {
    window.addEventListener("mousemove", resize);
    window.addEventListener("mouseup", stopResizing);
    return () => {
      window.removeEventListener("mousemove", resize);
      window.removeEventListener("mouseup", stopResizing);
    };
  }, [resize, stopResizing]);

  useEffect(() => {
    getUsers();
    getUnreadCounts();
  }, [getUsers, getUnreadCounts]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Refresh unread counts every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      getUnreadCounts();
    }, 30000);

    return () => clearInterval(interval);
  }, [getUnreadCounts]);

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchQuery.toLowerCase());
    const isOnline = onlineUsers.includes(user._id);

    if (showOnlineOnly && searchQuery) {
      return isOnline && matchesSearch;
    } else if (showOnlineOnly) {
      return isOnline;
    } else if (searchQuery) {
      return matchesSearch;
    }
    return true;
  });

  if (isUsersLoading) {
    return (
      <div className="hidden md:block">
        <SidebarSkeleton />
      </div>
    );
  }

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsMobileOpen(!isMobileOpen)}
        className="fixed bottom-4 right-4 lg:hidden z-50 p-3 bg-primary text-primary-content rounded-full shadow-lg border-2 border-primary cursor-pointer"
        aria-label="Toggle sidebar"
      >
        {isMobileOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      <aside
        ref={sidebarRef}
        className={`fixed lg:sticky top-0 left-0 h-screen lg:h-full border-r border-base-300 flex flex-col transition-all duration-300 bg-base-100 z-40 
          ${
            isMobileOpen
              ? "translate-x-0"
              : "-translate-x-full lg:translate-x-0"
          }
           w-[85vw] sm:w-[320px] lg:w-[${sidebarWidth}px] min-w-[240px] max-w-[500px]`}
        style={{
          "--sidebar-width": `${sidebarWidth}px`,
          width: isMobileOpen ? "80vw" : "var(--sidebar-width)",
          minWidth: "240px",
          maxWidth: "500px",
        }}
      >
        {/* Header */}
        <div className="border-b border-base-300 w-full px-5 py-3 sticky top-0 bg-base-100 z-10">
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-center lg:justify-start gap-2">
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="bg-base-200 p-2 rounded-full hover:bg-base-300 transition-colors cursor-pointer"
                >
                  <Users className="w-6 h-6" />
                </button>

                {isDropdownOpen && (
                  <div className="absolute left-full ml-2 mt-1 w-48 backdrop-blur-lg bg-base-100/90 rounded-lg shadow-xl z-50 border border-base-300 lg:hidden">
                    <div className="p-3 space-y-2">
                      <div className="font-medium text-sm">Contacts</div>
                      <div className="text-xs text-zinc-500">
                        {users.length} total users
                      </div>
                      <div className="text-xs text-zinc-500">
                        {Math.max(0, onlineUsers.length - 1)} online
                      </div>
                      <div className="pt-2 border-t border-base-300">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={showOnlineOnly}
                            onChange={(e) =>
                              setShowOnlineOnly(e.target.checked)
                            }
                            className="checkbox checkbox-xs"
                          />
                          <span className="text-xs">Show online only</span>
                        </label>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <span className="font-medium hidden lg:block">Contacts</span>
              <span className="text-sm text-zinc-500 hidden lg:block">
                ({users.length} users)
              </span>
            </div>

            <div className="hidden lg:flex items-center justify-between">
              <label className="cursor-pointer flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={showOnlineOnly}
                  onChange={(e) => setShowOnlineOnly(e.target.checked)}
                  className="checkbox checkbox-xs"
                />
                <span className="text-xs">Show online only</span>
              </label>
              <span className="text-xs text-zinc-500">
                {Math.max(0, onlineUsers.length - 1)} online
              </span>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="px-3 py-2 border-b border-base-300">
          <div className="relative">
            <input
              type="text"
              placeholder="Search contacts..."
              className="w-full bg-base-200 rounded-lg px-4 py-2 pl-10 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <svg
              className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
        </div>

        {/* User List */}
        <div className="flex-1 overflow-y-auto">
          {users.length === 0 ? (
            <div className="text-center text-zinc-500 py-8">No users found</div>
          ) : (
            filteredUsers.map((user) => {
              const unreadCount = unreadCounts[user._id] || 0;
              const isOnline = onlineUsers.includes(user._id);
              const lastMessage = user.lastMessage;

              return (
                <button
                  key={user._id}
                  onClick={() => setSelectedUser(user)}
                  className={`
                  w-full p-3 flex items-center gap-3
                  hover:bg-base-200 ring-1 border-l-4 border-base-100 ring-base-200 transition-colors cursor-pointer
                  ${
                    selectedUser?._id === user._id
                      ? "bg-base-200 border-l-4 border-l-primary"
                      : "border-l-4 border-l-transparent"
                  }
                `}
                >
                  <div className="relative mx-auto lg:mx-0 flex-shrink-0">
                    <div className="size-12 rounded-full overflow-hidden bg-base-200">
                      <img
                        src={user.profilePic || "/avatar.png"}
                        alt={user.fullName || "User"}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    </div>
                    {isOnline && (
                      <span
                        className="absolute bottom-0 right-0 size-3 bg-green-500 
                      rounded-full ring-2 ring-base-100"
                      />
                    )}
                    {unreadCount > 0 && (
                      <span
                        className="absolute -top-1 -right-1 bg-primary text-primary-content 
                      text-xs font-bold rounded-full h-5 min-w-[20px] flex items-center 
                      justify-center px-1"
                      >
                        {unreadCount > 99 ? "99+" : unreadCount}
                      </span>
                    )}
                  </div>

                  <div className="hidden lg:block text-left min-w-0 flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <div className="font-medium truncate">
                        {user.fullName || "Unknown User"}
                      </div>
                      {lastMessage && (
                        <span className="text-xs text-zinc-400 flex-shrink-0 ml-2">
                          {formatLastSeen(lastMessage.createdAt)}
                        </span>
                      )}
                    </div>

                    {/* Last message preview */}
                    {lastMessage ? (
                      <div className="flex items-center gap-1">
                        <p
                          className={`text-sm truncate ${
                            unreadCount > 0
                              ? "text-primary font-semibold"
                              : "text-zinc-400"
                          }`}
                        >
                          {lastMessage.senderId === user._id ? "" : "You: "}
                          {lastMessage.text
                            ? truncateText(lastMessage.text, 25)
                            : lastMessage.image
                            ? "📷 Photo"
                            : "Message"}
                        </p>
                        {unreadCount > 0 && (
                          <span className="flex-shrink-0 bg-primary text-primary-content text-xs font-bold rounded-full px-1.5 py-0.5">
                            {unreadCount}
                          </span>
                        )}
                      </div>
                    ) : (
                      <div className="text-sm text-zinc-400">
                        {isOnline ? "Online" : formatLastSeen(user.lastSeen)}
                      </div>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Resize handle */}
        <div
          className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-primary/50 active:bg-primary/70 transition-colors duration-200 z-20"
          onMouseDown={startResizing}
          title="Drag to resize"
        >
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-1 h-8 bg-base-300 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </aside>

      {/* Resize overlay when dragging */}
      {isResizing && (
        <div
          className="fixed inset-0 bg-transparent z-50 cursor-col-resize"
          style={{ cursor: "col-resize" }}
        />
      )}
    </>
  );
};

export default Sidebar;
