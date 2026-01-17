"use client";
import { useState } from "react";
import { X, User } from "lucide-react";
import { useAuthStore } from "../store/useAuthStore";
import { useChatStore } from "../store/useChatStore";
import ChatProfileOpener from "./ChatProfileOpener";
import { formatLastSeen } from "../lib/utils";

const ChatHeader = () => {
  const { selectedUser, setSelectedUser } = useChatStore();
  const { onlineUsers } = useAuthStore();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
   const [imageModal, setImageModal] = useState(null);

  const handleProfileClick = (e) => {
    e.stopPropagation();
    console.log("Opening profile...");
    setIsProfileOpen(true);
    // Close the dropdown
    document.activeElement?.blur();
  };

  return (
    <div className="p-2.5 border-b border-base-300 bg-base-200/50">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Avatar */}
          <div className="dropdown dropdown-bottom">
            <div
              tabIndex={0}
              role="button"
              className="avatar cursor-pointer hover:opacity-75"
            >
              <div className="size-10 rounded-full relative">
                <img
                  src={selectedUser.profilePic || "/avatar.png"}
                  alt={selectedUser.fullName}
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
            <div className="dropdown-content z-1 menu p-2 shadow backdrop-blur-lg bg-base-100/90 border border-base-300 rounded-box w-52 mt-2">
              <div className="px-4 py-2">
                <h3 className="font-medium">{selectedUser.fullName}</h3>
                <p className="text-sm text-base-content/70 flex items-center gap-1">
                  {onlineUsers.includes(selectedUser._id) ? (
                    <>
                      <span className="inline-block w-2 h-2 rounded-full bg-green-500"></span>
                      <span>Online</span>
                    </>
                  ) : (
                    `Last seen ${formatLastSeen(
                      selectedUser.updatedAt || selectedUser.lastSeen
                    )}`
                  )}
                </p>
              </div>
              <div className="divider my-0"></div>
              <ul>
                <li className="w-full">
                  <button
                    className="flex items-center gap-2 w-full text-left p-2 rounded-md hover:bg-base-200/50"
                    onClick={handleProfileClick}
                  >
                    <User size={16} />
                    <span>View Profile</span>
                  </button>
                </li>
              </ul>
            </div>
          </div>

          {/* User info - Clickable area */}
          <div
            className="cursor-pointer hover:bg-base-200/50 py-1.5 rounded-lg transition-colors hover:opacity-75"
            onClick={handleProfileClick}
            tabIndex={0}
            role="button"
            onKeyDown={(e) => e.key === "Enter" && handleProfileClick(e)}
          >
            <h3 className="font-medium">{selectedUser.fullName}</h3>
            <p className="text-sm text-base-content/70 flex items-center gap-1">
              {onlineUsers.includes(selectedUser._id) ? (
                <>
                  <span className="inline-block w-2 h-2 rounded-full bg-green-500"></span>
                  <span>Online</span>
                </>
              ) : (
                `Last seen ${formatLastSeen(
                  selectedUser.updatedAt || selectedUser.lastSeen
                )}`
              )}
            </p>
          </div>
        </div>

        {/* Close button */}
        <button
          className="btn btn-circle btn-sm"
          onClick={() => setSelectedUser(null)}
        >
          <X size={16} />
        </button>
      </div>
      {isProfileOpen && (
        <ChatProfileOpener
          onClose={() => {
            setIsProfileOpen(false);
          }}
          user={selectedUser}
        />
      )}
    </div>
  );
};
export default ChatHeader;
