"use client";
import { useEffect, useRef, useState } from "react";
import { X, Link } from "lucide-react";
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
        onClick={onClose}
      >
        <div
          onClick={handleModalClick}
          className="backdrop-blur-lg bg-base-100/80 rounded-lg w-full max-w-md p-6 relative max-h-[90vh] overflow-y-auto"
        >
          <button
            onClick={onClose}
            className="btn btn-sm btn-circle absolute right-2 top-2 cursor-pointer"
            aria-label="Close"
          >
            <X size={16} />
          </button>

          <div className="space-y-4">
            <div className="flex items-center gap-4 group">
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
                <p className="flex items-center gap-1 text-sm text-base-content/70 hover:text-base-content/90">
                  {user.email || "No email provided"}
                  {user.email && (
                    <button
                      onClick={handleCopyEmail}
                      className="ml-2 rounded-full hidden group-hover:block cursor-pointer"
                      title="Copy email"
                    >
                      <Link size={14} />
                    </button>
                  )}
                </p>
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
        </div>
      </div>
    </>
  );
};

export default ChatProfileOpener;
