"use client";
import React, { useEffect, useState, useRef } from "react";
import { useChatStore } from "../store/useChatStore";
import SidebarSkeleton from "./skeletons/SidebarSkeleton";
import { Users } from "lucide-react";
import { useAuthStore } from "../store/useAuthStore";
import { formatLastSeen, truncateText } from "../lib/utils";

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
  const dropdownRef = useRef(null);

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

  const filteredUsers = showOnlineOnly
    ? users.filter((user) => onlineUsers.includes(user._id))
    : users;

  if (isUsersLoading) {
    return <SidebarSkeleton />;
  }

  return (
    <aside className="h-full w-20 lg:w-72 border-r border-base-300 flex flex-col transition-all duration-200">
      <div className="border-b border-base-300 w-full px-5 py-3">
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
                          onChange={(e) => setShowOnlineOnly(e.target.checked)}
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

      <div className="flex-1 overflow-y-auto py-3">
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
                  hover:bg-base-200 ring-1 ring-base-200/50 transition-colors cursor-pointer
                  ${
                    selectedUser?._id === user._id
                      ? "bg-base-200 ring-1 ring-base-300"
                      : ""
                  }
                `}
              >
                <div className="relative mx-auto lg:mx-0 flex-shrink-0">
                  <img
                    src={user.profilePic || "/avatar.png"}
                    alt={user.fullName || "User"}
                    className="size-12 object-cover rounded-full"
                  />
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
    </aside>
  );
};

export default Sidebar;
