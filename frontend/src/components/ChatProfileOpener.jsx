"use client";
import { useEffect, useRef, useState } from "react";
import {
  Link,
  User,
  Search,
  Image,
  Bell,
  Trash2,
  Download,
} from "lucide-react";
import { useAuthStore } from "../store/useAuthStore";
import ImageModel from "./ImageModel";

const formatLastSeen = (date) => {
  if (!date) return "Never";
  const now = new Date();
  const lastSeen = new Date(date);
  const diffMs = now - lastSeen;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return lastSeen.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
};

const ChatProfileOpener = ({ onClose, user }) => {
  const modalRef = useRef();
  const { onlineUsers } = useAuthStore();
  const [imageModal, setImageModal] = useState(null);
  const [activeTab, setActiveTab] = useState("contact"); // 'contact', 'search', 'media', 'export', 'clear'

  useEffect(() => {
    function handleClickOutside(event) {
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        onClose();
      }
    }

    function handleEscape(e) {
      if (e.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, [onClose]);

  const handleModalClick = (e) => {
    e.stopPropagation();
  };

  const handleImageClick = (e) => {
    e.stopPropagation();
    setImageModal(user.profilePic || "/avatar.png");
  };

  const closeImageModal = (e) => {
    e?.stopPropagation();
    setImageModal(null);
  };

  const handleCopyEmail = () => {
    if (user.email) {
      navigator.clipboard.writeText(user.email);
    }
  };

  if (!user) return null;

  return (
    <>
      {imageModal && <ImageModel onClose={closeImageModal} user={user} />}

      <div
        className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
        // onClick={onClose}
      >
        <div
          onClick={handleModalClick}
          className="flex flex-col backdrop-blur-lg bg-base-100/80 rounded-lg w-full max-w-xl relative max-h-[90vh] overflow-hidden"
        >
          {/* top side */}
          <div className="flex h-[50vh]">
            {/* left side */}
            <div className="w-1/3 bg-base-100/40 border-r border-base-300">
              <div className="sticky top-0">
                <ul className="menu w-full p-2">
                  <li className="mb-1">
                    <a
                      className={`flex items-center gap-3 hover:bg-base-300 rounded-lg p-3 ${activeTab === "contact" ? "bg-base-300" : ""}`}
                      onClick={() => setActiveTab("contact")}
                    >
                      <User size={18} />
                      <span>View Contact</span>
                    </a>
                  </li>
                  <li className="mb-1">
                    <a
                      className={`flex items-center gap-3 hover:bg-base-300 rounded-lg p-3 ${activeTab === "search" ? "bg-base-300" : ""}`}
                      onClick={() => setActiveTab("search")}
                    >
                      <Search size={18} />
                      <span>Search</span>
                    </a>
                  </li>
                  <li className="mb-1">
                    <a
                      className={`flex items-center gap-3 hover:bg-base-300 rounded-lg p-3 ${activeTab === "media" ? "bg-base-300" : ""}`}
                      onClick={() => setActiveTab("media")}
                    >
                      <Image size={18} />
                      <span>Media</span>
                    </a>
                  </li>
                  {/* Todo: Mute Notifications */}
                  <li className="mb-1">
                    <a
                      className={`flex items-center gap-3 hover:bg-base-300 rounded-lg p-3 ${activeTab === "export" ? "bg-base-300" : ""}`}
                      onClick={() => setActiveTab("export")}
                    >
                      <Download size={18} />
                      <span>Export Chat</span>
                    </a>
                  </li>
                  <li>
                    <a
                      className={`flex items-center gap-3 text-error hover:bg-error/10 rounded-lg p-3 ${activeTab === "clear" ? "bg-error/10" : ""}`}
                      onClick={() => setActiveTab("clear")}
                    >
                      <Trash2 size={18} />
                      <span>Clear Chat</span>
                    </a>
                  </li>
                </ul>
              </div>
            </div>

            {/* right side */}
            <div className="flex-1 overflow-y-auto p-6">
              {/* Contact Info */}
              {activeTab === "contact" && (
                <div>
                  <div className="flex items-center gap-4 group px-2">
                    <div className="avatar">
                      <div
                        className="w-20 rounded-full hover:opacity-75 cursor-pointer"
                        onClick={handleImageClick}
                      >
                        <img
                          src={user.profilePic || "/avatar.png"}
                          alt={user.fullName}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </div>
                    <div>
                      <h2 className="text-xl font-bold">{user.fullName}</h2>
                      {user.email && (
                        <button
                          onClick={handleCopyEmail}
                          className="rounded-full"
                          title="Copy email"
                        >
                          <p className="flex items-center gap-1 cursor-pointer text-sm text-base-content/70 hover:text-base-content/90">
                            {user.email || "No email provided"}
                            <Link
                              className="rounded-full hidden group-hover:block cursor-pointer"
                              size={14}
                            />
                          </p>
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="divider my-2"></div>

                  <div className="space-y-2">
                    <div>
                      <p className="text-sm font-medium">User ID:</p>
                      <p className="text-sm text-base-content/70">{user._id}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Status:</p>
                      <p className="text-sm text-base-content/70 flex items-center gap-1">
                        {onlineUsers.includes(user._id) ? (
                          <>
                            <span className="inline-block w-2 h-2 rounded-full bg-green-500"></span>
                            <span>Online</span>
                          </>
                        ) : (
                          `Last seen ${formatLastSeen(
                            user.updatedAt || user.lastSeen
                          )}`
                        )}
                      </p>
                    </div>
                    <div className="divider my-2">
                      <p className="text-sm font-medium">Joined:</p>
                      <p className="text-sm text-base-content/70">
                        {user.createdAt
                          ? new Date(user.createdAt).toLocaleDateString()
                          : "Unknown"}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Bio:</p>
                      <p className="text-sm text-base-content/70">
                        {user.bio || "No bio provided"}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Search Tab */}
              {activeTab === "search" && (
                <div>
                  <h2 className="text-xl font-bold">Search in Chat</h2>
                  <input
                    type="text"
                    placeholder="Type to search messages..."
                    className="input input-bordered w-full"
                  />
                  <div className="text-center py-8 text-base-content/50">
                    <p>Search for messages in your conversation</p>
                  </div>
                </div>
              )}

              {/* Media Tab */}
              {activeTab === "media" && (
                <div>
                  <h2 className="text-xl font-bold">Media, Links, and Docs</h2>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="aspect-square rounded-lg overflow-hidden">
                      <img
                        src={user.profilePic || "/avatar.png"}
                        alt={user.fullName}
                        className="w-full h-full object-cover hover:scale-105 transition-transform"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Export Tab */}
              {activeTab === "export" && (
                <div>
                  <h2 className="text-xl font-bold">Export Chat</h2>
                  <div className="space-y-2">
                    <p>Export your chat history with {user.fullName}.</p>
                    <button className="btn btn-sm btn-primary">
                      <Download size={18} className="mr-2" />
                      Export Chat
                    </button>
                  </div>
                </div>
              )}

              {/* Clear Chat Tab */}
              {activeTab === "clear" && (
                <div>
                  <h2 className="text-xl font-bold">Clear Chat</h2>
                  <div className="space-y-4 p-4 bg-error/5 rounded-lg">
                    <p className="text-error">
                      Are you sure you want to clear the chat with{" "}
                      {user.fullName}? This action cannot be undone.
                    </p>
                    <div className="flex gap-2">
                      <button className="btn btn-error btn-sm">
                        <Trash2 size={16} className="mr-2" />
                        Clear Chat
                      </button>
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => setActiveTab("contact")}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* done button */}
          <div className="sticky bottom-0 left-0 right-0 backdrop-blur-lg bg-base-200/50 border-t border-base-300 p-3">
            <div className="flex justify-end">
              <button className="btn btn-xs" onClick={onClose}>
                Done
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ChatProfileOpener;
