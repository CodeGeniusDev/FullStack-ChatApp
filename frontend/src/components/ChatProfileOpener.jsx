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
  X,
  FileText,
  Video,
  File,
} from "lucide-react";
import { useAuthStore } from "../store/useAuthStore";
import { useChatStore } from "../store/useChatStore";
import ImageModel from "./ImageModel";
import toast from "react-hot-toast";
import { axiosInstance } from "../lib/axios";

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
  const { messages, deleteMessage } = useChatStore();
  const [imageModal, setImageModal] = useState(null);
  const [activeTab, setActiveTab] = useState("contact");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [mediaFiles, setMediaFiles] = useState({
    images: [],
    videos: [],
    docs: [],
  });
  const [isLoadingMedia, setIsLoadingMedia] = useState(false);
  const [activeMediaTab, setActiveMediaTab] = useState("images");
  const [isExporting, setIsExporting] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

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
      toast.success("Email copied to clipboard!");
    }
  };

  // Search functionality
  const handleSearch = (query) => {
    setSearchQuery(query);
    setIsSearching(true);

    if (!query.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    // Filter messages based on search query
    const results = messages.filter((msg) => {
      const searchLower = query.toLowerCase();
      const textMatch = msg.text?.toLowerCase().includes(searchLower);
      const senderMatch = msg.senderId?.fullName
        ?.toLowerCase()
        .includes(searchLower);
      return textMatch || senderMatch;
    });

    setSearchResults(results);
    setIsSearching(false);
  };

  // Load media files
  useEffect(() => {
    if (activeTab === "media") {
      loadMediaFiles();
    }
  }, [activeTab, messages]);

  const loadMediaFiles = () => {
    setIsLoadingMedia(true);

    const images = [];
    const videos = [];
    const docs = [];

    messages.forEach((msg) => {
      if (msg.image) {
        // Check if it's a video or image
        const extension = msg.image.split(".").pop().toLowerCase();
        if (["mp4", "webm", "ogg", "mov"].includes(extension)) {
          videos.push({ ...msg, url: msg.image });
        } else {
          images.push({ ...msg, url: msg.image });
        }
      }
      // You can add document detection here if needed
    });

    setMediaFiles({ images, videos, docs });
    setIsLoadingMedia(false);
  };

  // Export chat functionality
  const handleExportChat = async () => {
    setIsExporting(true);

    try {
      // Create chat export data
      const chatData = messages.map((msg) => ({
        from: msg.senderId.fullName,
        message: msg.text || (msg.image ? "[Image]" : ""),
        timestamp: new Date(msg.createdAt).toLocaleString(),
        hasImage: !!msg.image,
      }));

      const exportText = chatData
        .map((msg) => `[${msg.timestamp}] ${msg.from}: ${msg.message}`)
        .join("\n");

      // Create downloadable file
      const blob = new Blob([exportText], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `chat-${user.fullName}-${new Date().toISOString().split("T")[0]}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success("Chat exported successfully!");
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Failed to export chat");
    } finally {
      setIsExporting(false);
    }
  };

  // Clear chat functionality
  const handleClearChat = async () => {
    setIsClearing(true);

    try {
      // Delete all messages for this user
      const deletePromises = messages
        .filter(
          (msg) =>
            msg.senderId._id === user._id || msg.receiverId?._id === user._id
        )
        .map((msg) => deleteMessage(msg._id, false));

      await Promise.all(deletePromises);

      toast.success("Chat cleared successfully!");
      setShowClearConfirm(false);
      setActiveTab("contact");
    } catch (error) {
      console.error("Clear chat error:", error);
      toast.error("Failed to clear chat");
    } finally {
      setIsClearing(false);
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
          // ref={modalRef}
          onClick={handleModalClick}
          className="flex flex-col backdrop-blur-lg bg-base-100/80 rounded-lg w-full max-w-xl relative max-h-[90vh] overflow-hidden"
        >
          {/* top side */}
          <div className="flex flex-col md:flex-row h-[60vh] md:h-[50vh]">
            {/* left side - Mobile: Horizontal scroll, Desktop: Vertical */}
            <div className="w-full md:w-1/3 bg-base-100/40 border-b md:border-b-0 md:border-r border-base-300">
              <div className="sticky top-0 backdrop-blur-lg bg-base-200/20">
                {/* Mobile: Horizontal scrollable tabs */}
                <div className="md:hidden overflow-x-auto">
                  <div className="flex p-2 gap-2 min-w-max">
                    <button
                      className={`btn btn-sm ${activeTab === "contact" ? "btn-primary" : "btn-ghost"}`}
                      onClick={() => setActiveTab("contact")}
                    >
                      <User size={16} />
                      <span className="hidden sm:inline">Contact</span>
                    </button>
                    <button
                      className={`btn btn-sm ${activeTab === "search" ? "btn-primary" : "btn-ghost"}`}
                      onClick={() => setActiveTab("search")}
                    >
                      <Search size={16} />
                      <span className="hidden sm:inline">Search</span>
                    </button>
                    <button
                      className={`btn btn-sm ${activeTab === "media" ? "btn-primary" : "btn-ghost"}`}
                      onClick={() => setActiveTab("media")}
                    >
                      <Image size={16} />
                      <span className="hidden sm:inline">Media</span>
                    </button>
                    <button
                      className={`btn btn-sm ${activeTab === "export" ? "btn-primary" : "btn-ghost"}`}
                      onClick={() => setActiveTab("export")}
                    >
                      <Download size={16} />
                      <span className="hidden sm:inline">Export</span>
                    </button>
                    <button
                      className={`btn btn-sm ${activeTab === "clear" ? "btn-error" : "btn-ghost"}`}
                      onClick={() => setActiveTab("clear")}
                    >
                      <Trash2 size={16} />
                      <span className="hidden sm:inline">Clear</span>
                    </button>
                  </div>
                </div>

                {/* Desktop: Vertical menu */}
                <ul className="menu w-full p-2 hidden md:block bg-base-200/40">
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
            <div className="flex-1 overflow-y-auto p-4 md:p-6 max-h-[60vh]">
              {/* Contact Info */}
              {activeTab === "contact" && (
                <div>
                  <div className="flex flex-col sm:flex-row items-center gap-4 group px-2">
                    <div className="avatar">
                      <div
                        className="w-20 sm:w-24 rounded-full hover:opacity-75 cursor-pointer"
                        onClick={handleImageClick}
                      >
                        <img
                          src={user.profilePic || "/avatar.png"}
                          alt={user.fullName}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </div>
                    <div className="text-center sm:text-left">
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
                      <p className="text-sm text-base-content/70 truncate">
                        {user._id}
                      </p>
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
                    <div className="divider my-2"></div>
                    <div>
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
                  <h2 className="text-xl font-bold mb-4">Search in Chat</h2>
                  <div className="relative mb-4">
                    <input
                      type="text"
                      placeholder="Type to search messages..."
                      value={searchQuery}
                      onChange={(e) => handleSearch(e.target.value)}
                      className="input input-bordered w-full pr-10"
                    />
                    {searchQuery && (
                      <button
                        onClick={() => handleSearch("")}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-base-content/50 hover:text-base-content"
                      >
                        <X size={18} />
                      </button>
                    )}
                  </div>

                  {isSearching ? (
                    <div className="text-center py-8">
                      <span className="loading loading-spinner loading-md"></span>
                    </div>
                  ) : searchQuery ? (
                    searchResults.length > 0 ? (
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {searchResults.map((msg) => (
                          <div
                            key={msg._id}
                            className="p-3 bg-base-200 rounded-lg hover:bg-base-300 cursor-pointer"
                          >
                            <div className="flex items-start gap-2">
                              <img
                                src={msg.senderId.profilePic || "/avatar.png"}
                                alt={msg.senderId.fullName}
                                className="w-8 h-8 rounded-full"
                              />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium">
                                  {msg.senderId.fullName}
                                </p>
                                <p className="text-sm text-base-content/70 truncate">
                                  {msg.text || "[Image]"}
                                </p>
                                <p className="text-xs text-base-content/50 mt-1">
                                  {new Date(msg.createdAt).toLocaleString()}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-base-content/50">
                        <p>No messages found for "{searchQuery}"</p>
                      </div>
                    )
                  ) : (
                    <div className="text-center py-8 text-base-content/50">
                      <Search size={48} className="mx-auto mb-2 opacity-50" />
                      <p>Search for messages in your conversation</p>
                    </div>
                  )}
                </div>
              )}

              {/* Media Tab */}
              {activeTab === "media" && (
                <div>
                  <h2 className="text-xl font-bold mb-4">
                    Media, Links, and Docs
                  </h2>

                  {/* Media Type Tabs */}
                  <div className="tabs tabs-boxed mb-4 flex-nowrap overflow-x-auto">
                    <button
                      className={`tab ${activeMediaTab === "images" ? "tab-active" : ""}`}
                      onClick={() => setActiveMediaTab("images")}
                    >
                      <Image size={16} className="mr-1" />
                      Images ({mediaFiles.images.length})
                    </button>
                    <button
                      className={`tab ${activeMediaTab === "videos" ? "tab-active" : ""}`}
                      onClick={() => setActiveMediaTab("videos")}
                    >
                      <Video size={16} className="mr-1" />
                      Videos ({mediaFiles.videos.length})
                    </button>
                    <button
                      className={`tab ${activeMediaTab === "docs" ? "tab-active" : ""}`}
                      onClick={() => setActiveMediaTab("docs")}
                    >
                      <FileText size={16} className="mr-1" />
                      Docs ({mediaFiles.docs.length})
                    </button>
                  </div>

                  {isLoadingMedia ? (
                    <div className="text-center py-8">
                      <span className="loading loading-spinner loading-md"></span>
                    </div>
                  ) : (
                    <>
                      {/* Images Grid */}
                      {activeMediaTab === "images" && (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {mediaFiles.images.length > 0 ? (
                            mediaFiles.images.map((media) => (
                              <div
                                key={media._id}
                                className="aspect-square rounded-lg overflow-hidden cursor-pointer group relative"
                                onClick={() => setImageModal(media.url)}
                              >
                                <img
                                  src={media.url}
                                  alt="Media"
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                />
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                              </div>
                            ))
                          ) : (
                            <div className="col-span-2 sm:col-span-3 text-center py-8 text-base-content/50">
                              <Image
                                size={48}
                                className="mx-auto mb-2 opacity-50"
                              />
                              <p>No images shared yet</p>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Videos Grid */}
                      {activeMediaTab === "videos" && (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {mediaFiles.videos.length > 0 ? (
                            mediaFiles.videos.map((media) => (
                              <div
                                key={media._id}
                                className="aspect-square rounded-lg overflow-hidden cursor-pointer group relative"
                              >
                                <video
                                  src={media.url}
                                  className="w-full h-full object-cover"
                                  controls
                                />
                              </div>
                            ))
                          ) : (
                            <div className="col-span-2 sm:col-span-3 text-center py-8 text-base-content/50">
                              <Video
                                size={48}
                                className="mx-auto mb-2 opacity-50"
                              />
                              <p>No videos shared yet</p>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Documents List */}
                      {activeMediaTab === "docs" && (
                        <div className="space-y-2">
                          {mediaFiles.docs.length > 0 ? (
                            mediaFiles.docs.map((media) => (
                              <div
                                key={media._id}
                                className="p-3 bg-base-200 rounded-lg hover:bg-base-300 cursor-pointer flex items-center gap-3"
                              >
                                <File size={24} className="text-primary" />
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium truncate">
                                    Document
                                  </p>
                                  <p className="text-xs text-base-content/50">
                                    {new Date(
                                      media.createdAt
                                    ).toLocaleDateString()}
                                  </p>
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="text-center py-8 text-base-content/50">
                              <FileText
                                size={48}
                                className="mx-auto mb-2 opacity-50"
                              />
                              <p>No documents shared yet</p>
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* Export Tab */}
              {activeTab === "export" && (
                <div>
                  <h2 className="text-xl font-bold mb-4">Export Chat</h2>
                  <div className="space-y-4">
                    <div className="bg-base-200 p-4 rounded-lg">
                      <p className="text-sm text-base-content/70 mb-2">
                        Export your chat history with {user.fullName} as a text
                        file.
                      </p>
                      <div className="text-sm text-base-content/50">
                        <p>• Total messages: {messages.length}</p>
                        <p>• Format: Plain text (.txt)</p>
                        <p>• Includes timestamps and sender names</p>
                      </div>
                    </div>

                    <button
                      className="btn btn-sm btn-primary w-full sm:w-auto"
                      onClick={handleExportChat}
                      disabled={isExporting || messages.length === 0}
                    >
                      {isExporting ? (
                        <>
                          <span className="loading loading-spinner loading-sm"></span>
                          Exporting...
                        </>
                      ) : (
                        <>
                          <Download size={18} />
                          Export Chat ({messages.length} messages)
                        </>
                      )}
                    </button>

                    {messages.length === 0 && (
                      <p className="text-sm text-base-content/50">
                        No messages to export yet.
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Clear Chat Tab */}
              {activeTab === "clear" && (
                <div>
                  <h2 className="text-xl font-bold mb-4">Clear Chat</h2>

                  {!showClearConfirm ? (
                    <div className="space-y-4">
                      <div className="bg-base-200 p-4 rounded-lg">
                        <p className="text-sm text-base-content/70 mb-2">
                          This will delete all messages in this conversation for
                          you only.
                        </p>
                        <div className="text-sm text-base-content/50">
                          <p>• {user.fullName} will still see the messages</p>
                          <p>• This action cannot be undone</p>
                          <p>• Total messages: {messages.length}</p>
                        </div>
                      </div>

                      <button
                        className="btn btn-error btn-sm w-full sm:w-auto"
                        onClick={() => setShowClearConfirm(true)}
                        disabled={messages.length === 0}
                      >
                        <Trash2 size={16} />
                        Clear Chat
                      </button>

                      {messages.length === 0 && (
                        <p className="text-sm text-base-content/50">
                          No messages to clear.
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-4 p-4 bg-error/5 rounded-lg border border-error/20">
                      <div className="flex items-start gap-3">
                        <Trash2
                          size={24}
                          className="text-error flex-shrink-0 mt-1"
                        />
                        <div>
                          <p className="text-error font-medium mb-2">
                            Are you absolutely sure?
                          </p>
                          <p className="text-sm text-base-content/70">
                            This will permanently delete all {messages.length}{" "}
                            messages with {user.fullName} from your device. This
                            action cannot be undone.
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row gap-2">
                        <button
                          className="btn btn-error btn-sm flex-1 sm:flex-initial"
                          onClick={handleClearChat}
                          disabled={isClearing}
                        >
                          {isClearing ? (
                            <>
                              <span className="loading loading-spinner loading-sm"></span>
                              Clearing...
                            </>
                          ) : (
                            <>
                              <Trash2 size={16} />
                              Yes, Clear Chat
                            </>
                          )}
                        </button>
                        <button
                          className="btn btn-ghost btn-sm flex-1 sm:flex-initial"
                          onClick={() => setShowClearConfirm(false)}
                          disabled={isClearing}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* done button */}
          <div className="sticky bottom-0 left-0 right-0 backdrop-blur-lg bg-base-200/50 border-t border-base-300 p-3">
            <div className="flex justify-between sm:justify-end items-center gap-2">
              <span className="text-sm text-base-content/70 sm:hidden">
                {activeTab === "contact" && "Contact Info"}
                {activeTab === "search" && "Search Messages"}
                {activeTab === "media" && "Media Files"}
                {activeTab === "export" && "Export Chat"}
                {activeTab === "clear" && "Clear Chat"}
              </span>
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
