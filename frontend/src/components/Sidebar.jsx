"use client";
import React, { useEffect, useState, useRef, useCallback } from "react";
import { useChatStore } from "../store/useChatStore";
import SidebarSkeleton from "./skeletons/SidebarSkeleton";
import { Users, User, Search, X, Pin, Bell, BellOff } from "lucide-react";
import { useAuthStore } from "../store/useAuthStore";
import { formatLastSeen, truncateText } from "../lib/utils";
import ChatProfileOpener from "./ChatProfileOpener";

// Default and constraints for sidebar width
const SIDEBAR = {
  MIN_WIDTH: 280,
  MAX_WIDTH: 500,
  DEFAULT_WIDTH: 340,
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
    pinnedContacts,
    mutedChats,
    togglePinContact,
    toggleMuteChat,
    loadPinnedContacts,
    loadMutedChats,
  } = useChatStore();

  const { onlineUsers } = useAuthStore();
  const [showOnlineOnly, setShowOnlineOnly] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    if (typeof window !== "undefined") {
      const savedWidth = localStorage.getItem(SIDEBAR.STORAGE_KEY);
      return savedWidth
        ? Math.max(SIDEBAR.MIN_WIDTH, parseInt(savedWidth, 10))
        : SIDEBAR.DEFAULT_WIDTH;
    }
    return SIDEBAR.DEFAULT_WIDTH;
  });

  const dropdownRef = useRef(null);
  const sidebarRef = useRef(null);
  const [contextMenu, setContextMenu] = useState(null);
  const contextMenuRef = useRef(null);

  const handleProfileClick = (e) => {
    e.stopPropagation();
    if (contextMenu?.user) {
      // Set the selected user from context menu
      setSelectedUser(contextMenu.user);
      // Open the profile
      setIsProfileOpen(true);
      // Close the context menu
      setContextMenu(null);
      // Close any open dropdowns
      document.activeElement?.blur();
    }
  };

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
        const rect = sidebarRef.current.getBoundingClientRect();
        const newWidth = e.clientX - rect.left;

        if (newWidth >= SIDEBAR.MIN_WIDTH && newWidth <= SIDEBAR.MAX_WIDTH) {
          setSidebarWidth(newWidth);
        }
      }
    },
    [isResizing],
  );

  // Handle mouse move and up events during resize
  useEffect(() => {
    if (isResizing) {
      const handleMouseMove = (e) => {
        e.preventDefault();
        resize(e);
      };

      const handleMouseUp = () => {
        setIsResizing(false);
      };

      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);

      return () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [isResizing, resize]);

  // Check if mobile device
  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth <= 768 || "ontouchstart" in window);
    };

    checkIfMobile();
    window.addEventListener("resize", checkIfMobile);

    return () => window.removeEventListener("resize", checkIfMobile);
  }, []);

  useEffect(() => {
    getUsers();
    getUnreadCounts();
    loadPinnedContacts();
    loadMutedChats();
  }, []); // Empty array - only fetch once on mount

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
      if (
        contextMenu &&
        contextMenuRef.current &&
        !contextMenuRef.current.contains(event.target)
      ) {
        setContextMenu(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [contextMenu]);

  // Refresh unread counts every 30 seconds (was 10 seconds - reduced frequency)
  useEffect(() => {
    const interval = setInterval(() => {
      getUnreadCounts();
    }, 10000); // Changed from 10000 to 30000 (30 seconds)

    return () => clearInterval(interval);
  }, []); // Empty array - no dependencies needed

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

  // Sort users: pinned first, then by last message time
  const sortedUsers = [...filteredUsers].sort((a, b) => {
    const aIsPinned = pinnedContacts.includes(a._id);
    const bIsPinned = pinnedContacts.includes(b._id);

    if (aIsPinned && !bIsPinned) return -1;
    if (!aIsPinned && bIsPinned) return 1;

    const aTime = a.lastMessage?.createdAt || a.createdAt;
    const bTime = b.lastMessage?.createdAt || b.createdAt;
    return new Date(bTime) - new Date(aTime);
  });

  const handleContextMenu = useCallback((e, user) => {
    e.preventDefault();
    e.stopPropagation();

    const menuWidth = 200;
    const menuHeight = 120; // Approximate height
    const padding = 16;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let x = e.clientX;
    let y = e.clientY;

    // Horizontal positioning
    const spaceOnRight = viewportWidth - x;
    const spaceOnLeft = x;

    if (spaceOnRight < menuWidth + padding) {
      if (spaceOnLeft >= menuWidth + padding) {
        x = x - menuWidth;
      } else {
        x = viewportWidth - menuWidth - padding;
      }
    }

    x = Math.max(padding, Math.min(x, viewportWidth - menuWidth - padding));

    // Vertical positioning
    const spaceBelow = viewportHeight - y;
    const spaceAbove = y;

    if (spaceBelow < menuHeight + padding) {
      if (spaceAbove >= menuHeight + padding) {
        y = y - menuHeight;
      } else {
        y = viewportHeight - menuHeight - padding;
      }
    }

    y = Math.max(padding, Math.min(y, viewportHeight - menuHeight - padding));

    setContextMenu({ x, y, user });
  }, []);

  // Adjust context menu position after render
  useEffect(() => {
    if (contextMenu && contextMenuRef.current) {
      const menuElement = contextMenuRef.current;
      const rect = menuElement.getBoundingClientRect();
      const padding = 16;
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      let newX = contextMenu.x;
      let newY = contextMenu.y;
      let needsUpdate = false;

      if (rect.right > viewportWidth - padding) {
        newX = viewportWidth - rect.width - padding;
        needsUpdate = true;
      }
      if (rect.left < padding) {
        newX = padding;
        needsUpdate = true;
      }
      if (rect.bottom > viewportHeight - padding) {
        newY = viewportHeight - rect.height - padding;
        needsUpdate = true;
      }
      if (rect.top < padding) {
        newY = padding;
        needsUpdate = true;
      }

      if (needsUpdate) {
        setContextMenu({
          ...contextMenu,
          x: Math.max(padding, newX),
          y: Math.max(padding, newY),
        });
      }
    }
  }, [contextMenu]);

  if (isUsersLoading) {
    return (
      <div className="hidden lg:block">
        <SidebarSkeleton />
      </div>
    );
  }

  return (
    <>
      <aside
        ref={sidebarRef}
        className="w-full lg:w-auto lg:min-w-[280px] lg:max-w-[500px] border-r border-base-300 flex flex-col bg-base-100 h-full relative"
        style={{
          width: `100%`,
          maxWidth: "100%",
          ...(window.innerWidth >= 1024 && {
            // Only apply custom width on lg screens and up
            width: `${sidebarWidth}px`,
            maxWidth: "500px",
          }),
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
                  <div className="fixed left-1/2 transform -translate-x-1/2 mt-1 w-48 backdrop-blur-lg bg-base-100/10 rounded-lg shadow-xl z-50 border border-base-300 lg:hidden">
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
              <span className="font-medium lg:hidden block">Chats</span>

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
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              placeholder="Search contacts..."
              className="w-full bg-base-200 rounded-lg px-10 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* User List */}
        <div className="flex-1 overflow-y-auto p-3">
          {users.length === 0 ? (
            <div className="text-center text-zinc-500 py-8">No users found</div>
          ) : (
            sortedUsers.map((user) => {
              const unreadCount = unreadCounts[user._id] || 0;
              const isOnline = onlineUsers.includes(user._id);
              const lastMessage = user.lastMessage;
              const isSelected = selectedUser?._id === user._id;
              const isPinned = pinnedContacts.includes(user._id);
              const isMuted = mutedChats.includes(user._id);

              return (
                <button
                  key={user._id}
                  onClick={(e) => {
                    if (isMobile) {
                      e.stopPropagation();
                      setSelectedUser(user);
                      setIsProfileOpen(true);
                    } else {
                      setSelectedUser(user);
                    }
                  }}
                  onContextMenu={(e) => handleContextMenu(e, user)}
                  className={`w-full p-3 flex items-center gap-3 rounded-sm transition-colors cursor-pointer ${isSelected ? "bg-base-200" : "hover:bg-base-200/50"}`}
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
                    {!isMuted && unreadCount > 0 && (
                      <span
                        className="absolute -top-1 -right-1 bg-primary text-primary-content 
                      text-xs font-bold rounded-full h-5 min-w-[20px] flex items-center 
                      justify-center px-1"
                      >
                        {unreadCount > 99 ? "99+" : unreadCount}
                      </span>
                    )}
                  </div>

                  <div className="block text-left min-w-0 flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5 flex-1 min-w-0">
                        <div className="font-medium truncate">
                          {user.fullName || "Unknown User"}
                        </div>
                        {isPinned && (
                          <Pin
                            className="w-3.5 h-3.5 text-gray-400 rotate-45 shrink-0"
                            fill="currentColor"
                          />
                        )}
                        {isMuted && (
                          <BellOff className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                        )}

                        {/* <Verified className="w-3.5 h-3.5 text-primary shrink-0" /> */}
                      </div>
                      {lastMessage && (
                        <span className="text-xs text-zinc-400 shrink-0 ml-2">
                          {formatLastSeen(lastMessage.createdAt)}
                        </span>
                      )}
                      {/* Todo: Add dropdown menu */}
                      {/* <button className="bg-base-300 rounded-sm">
                        <ChevronDown className="w-4 h-4 text-white"/>
                      </button> */}
                    </div>

                    {/* Last message preview */}
                    {lastMessage ? (
                      <div className="flex items-center gap-1">
                        <p
                          className={`text-sm truncate ${
                            !isMuted && unreadCount > 0
                              ? "text-primary font-semibold"
                              : "text-zinc-400"
                          }`}
                        >
                          {lastMessage.senderId === user._id ? "" : "You: "}
                          {lastMessage.text
                            ? truncateText(lastMessage.text, 30)
                            : lastMessage.image
                              ? "📷 Photo"
                              : lastMessage.video
                                ? "🎥 Video"
                                : lastMessage.audio
                                  ? "🎵 Audio"
                                  : lastMessage.emoji
                                    ? "😊 Emoji"
                                    : "Message"}
                        </p>
                        {!isMuted && unreadCount > 0 && (
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

        {/* Resize handle - Desktop only */}
        <div
          className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-primary/50 active:bg-primary/70 transition-colors duration-200 z-20 hidden lg:flex items-center justify-center"
          onMouseDown={(e) => {
            e.preventDefault();
            startResizing();
          }}
          title="Drag to resize"
        >
          <div className="w-1 h-12 bg-base-300/50 rounded-full hover:bg-primary transition-colors duration-200" />
        </div>
      </aside>

      {/* Resize overlay when dragging */}
      {isResizing && (
        <div
          className="fixed inset-0 bg-transparent z-50 cursor-col-resize"
          style={{ cursor: "col-resize" }}
        />
      )}

      {/* Context Menu */}
      {contextMenu && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setContextMenu(null)}
          />
          <div
            ref={contextMenuRef}
            className="fixed z-50 bg-base-200 rounded-lg shadow-xl py-2 min-w-[180px]"
            style={{
              top: `${contextMenu.y}px`,
              left: `${contextMenu.x}px`,
            }}
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                togglePinContact(contextMenu.user._id);
                setContextMenu(null);
              }}
              className="w-full px-4 py-2 hover:bg-base-300 flex items-center gap-2 text-left cursor-pointer"
            >
              <Pin className="w-4 h-4" />
              {pinnedContacts.includes(contextMenu.user._id) ? "Unpin" : "Pin"}
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleMuteChat(contextMenu.user._id);
                setContextMenu(null);
              }}
              className="w-full px-4 py-2 hover:bg-base-300 flex items-center gap-2 text-left cursor-pointer"
            >
              {mutedChats.includes(contextMenu.user._id) ? (
                <>
                  <Bell className="w-4 h-4" />
                  Unmute
                </>
              ) : (
                <>
                  <BellOff className="w-4 h-4" />
                  Mute
                </>
              )}
            </button>

            {/* User Profile Info */}
            <button
              onClick={handleProfileClick}
              className="w-full px-4 py-2 hover:bg-base-300 flex items-center gap-2 text-left cursor-pointer"
            >
              <User className="w-4 h-4" />
              View Profile
            </button>
          </div>
        </>
      )}
      {isProfileOpen && selectedUser && (
        <ChatProfileOpener
          onClose={() => {
            setIsProfileOpen(false);
          }}
          user={selectedUser}
        />
      )}
    </>
  );
};

export default Sidebar;
