"use client";
import { useState } from "react";
import { ArrowLeft, MoreVertical, User } from "lucide-react";
import { useAuthStore } from "../store/useAuthStore";
import { useChatStore } from "../store/useChatStore";
import ChatProfileOpener from "./ChatProfileOpener";
import { formatLastSeen } from "../lib/utils";

const ChatHeader = () => {
  const { selectedUser, setSelectedUser } = useChatStore();
  const { onlineUsers } = useAuthStore();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("contact");

  const handleProfileClick = (e) => {
    // Ensure the profile tab is active when opening
    setActiveTab("contact");
    e.stopPropagation();
    console.log("Opening profile...");
    setIsProfileOpen(true);
    // Close the dropdown
    document.activeElement?.blur();
  };

  return (
    <div className="p-2.5 border-b border-base-300 bg-base-200/20">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Back arrow */}
          <button
            className="btn btn-circle btn-sm"
            onClick={() => setSelectedUser(null)}
          >
            <ArrowLeft size={16} />
          </button>

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
            <div className="dropdown-content z-1 menu p-2 shadow backdrop-blur-lg bg-base-100/80 border border-base-300 rounded-box w-52 mt-2">
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
                      selectedUser.updatedAt || selectedUser.lastSeen,
                    )}`
                  )}
                </p>
              </div>
              <div className="divider my-0"></div>
              <ul>
                <li className="w-full">
                  <button
                    className="flex items-center gap-2 w-full text-left p-2 rounded-md"
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
            className="cursor-pointer py-1.5 rounded-lg transition-colors hover:opacity-75"
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
                  selectedUser.updatedAt || selectedUser.lastSeen,
                )}`
              )}
            </p>
          </div>
        </div>

        {/* More options dropdown */}
        <div className="dropdown dropdown-end">
          <label
            tabIndex={0}
            data-tip="More options"
            className="btn btn-circle btn-sm flex lg:tooltip lg:tooltip-left"
          >
            <MoreVertical size={16} />
          </label>
          <ul
            tabIndex={0}
            className="dropdown-content z-1 menu p-2 shadow backdrop-blur-lg bg-base-100/80 border border-base-300 rounded-box w-52 mt-2"
          >
            <li>
              <a onClick={handleProfileClick}>View contact</a>
            </li>
            <li>
              <a
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveTab("search");
                  setIsProfileOpen(true);
                  document.activeElement?.blur();
                }}
              >
                Search
              </a>
            </li>
            <li>
              <a
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveTab("media");
                  setIsProfileOpen(true);
                  document.activeElement?.blur();
                }}
              >
                Media, links, and docs
              </a>
            </li>
            {/* line */}
            <div className="divider my-0"></div>
            <li>
              <details>
                <summary>View more</summary>
                <ul>
                  <li>
                    <a
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveTab("clear");
                        setIsProfileOpen(true);
                        document.activeElement
                          ?.closest("details")
                          ?.removeAttribute("open");
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <span>Clear chat</span>
                      </div>
                    </a>
                  </li>
                  <li>
                    <a
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveTab("export");
                        setIsProfileOpen(true);
                        document.activeElement
                          ?.closest("details")
                          ?.removeAttribute("open");
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <span>Export chat</span>
                      </div>
                    </a>
                  </li>
                </ul>
              </details>
            </li>
          </ul>
        </div>
      </div>
      {isProfileOpen && (
        <ChatProfileOpener
          onClose={() => {
            setIsProfileOpen(false);
          }}
          user={selectedUser}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
        />
      )}
    </div>
  );
};
export default ChatHeader;
