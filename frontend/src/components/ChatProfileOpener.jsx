"use client";
import { useEffect, useRef } from "react";
import { X, Link } from "lucide-react";

const ChatProfileOpener = ({ onClose, user }) => {
  const modalRef = useRef();

  // Close modal when clicking outside or pressing Escape
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

    // Add event listeners
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    // Prevent body scroll when modal is open
    document.body.style.overflow = "hidden";

    return () => {
      // Cleanup
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, [onClose]);

  // Prevent clicks inside the modal from closing it
  const handleModalClick = (e) => {
    e.stopPropagation();
  };

  if (!user) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <div
        ref={modalRef}
        onClick={handleModalClick}
        className="backdrop-blur-lg bg-base-100/90 rounded-lg w-full max-w-md p-6 relative max-h-[90vh] overflow-y-auto"
      >
        <button
          onClick={onClose}
          className="btn btn-sm btn-circle absolute right-2 top-2"
          aria-label="Close"
        >
          <X size={16} />
        </button>

        <div className="space-y-4">
          <div className="flex items-center gap-4 group">
            <div className="avatar">
              <div className="w-20 rounded-full">
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
                {/* copy email button */}
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(user.email);
                  }}
                  className="ml-2 rounded-full hidden group-hover:block cursor-pointer"
                >
                  <Link size={14} />
                </button>
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
              <p className="text-sm text-base-content/70">
                {user.isOnline ? "Online" : "Offline"}
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
            {/* TODO: Add bio field to user schema and display it here */}
            {/* <div>
              <p className="text-sm font-medium">Bio:</p>
              <p className="text-sm text-base-content/70">{user.bio || "No bio provided"}</p>
            </div> */}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatProfileOpener;
