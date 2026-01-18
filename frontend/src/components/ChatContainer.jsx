"use client";
import React, { useEffect, useRef, useState, useCallback } from "react";
import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";
import ChatHeader from "./ChatHeader";
import MessagesInput from "./MessagesInput";
import { formatMessageTime } from "../lib/utils";
import { Check, CheckCheck, Reply, Trash2, Edit, Copy, X } from "lucide-react";
import {
  Star,
  Share2,
  Download,
  MoreVertical,
  ZoomIn,
  ZoomOut,
  RotateCw,
} from "lucide-react";
import ChatProfileOpener from "./ChatProfileOpener";

const ChatContainer = () => {
  const {
    messages,
    getMessages,
    isMessagesLoading,
    selectedUser,
    subscribeToMessages,
    unsubscribeFromMessages,
    setReplyingTo,
    deleteMessage,
    addReaction,
    typingUsers,
  } = useChatStore();

  const { authUser } = useAuthStore();
  const messageEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const [contextMenu, setContextMenu] = useState(null);
  const [editingMessage, setEditingMessage] = useState(null);
  const [hoveredMessage, setHoveredMessage] = useState(null);
  const [imageModal, setImageModal] = useState(null);
  const [imageZoom, setImageZoom] = useState(1);
  const [imageRotation, setImageRotation] = useState(0);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);
  const previousMessagesLength = useRef(0);
  const isInitialLoad = useRef(true);

  // Mobile long-press state
  const [longPressMessage, setLongPressMessage] = useState(null);
  const longPressTimerRef = useRef(null);
  const touchStartPos = useRef(null);

  const isOtherUserTyping = typingUsers[selectedUser?._id] || false;

  const checkIfNearBottom = useCallback(() => {
    if (!messagesContainerRef.current) return true;

    const { scrollTop, scrollHeight, clientHeight } =
      messagesContainerRef.current;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;

    return distanceFromBottom < 100;
  }, []);

  const scrollToBottom = useCallback((behavior = "smooth") => {
    if (messageEndRef.current) {
      messageEndRef.current.scrollIntoView({ behavior, block: "end" });
    }
  }, []);

  useEffect(() => {
    if (selectedUser?._id) {
      isInitialLoad.current = true;
      getMessages(selectedUser._id);
      subscribeToMessages();
    }

    return () => unsubscribeFromMessages();
  }, [
    selectedUser?._id,
    getMessages,
    subscribeToMessages,
    unsubscribeFromMessages,
  ]);

  useEffect(() => {
    if (isMessagesLoading) return;

    const messagesLength = messages.length;
    const hasNewMessages = messagesLength > previousMessagesLength.current;

    if (isInitialLoad.current && messagesLength > 0) {
      setTimeout(() => {
        scrollToBottom("auto");
        isInitialLoad.current = false;
        previousMessagesLength.current = messagesLength;
      }, 0);
      return;
    }

    if (hasNewMessages) {
      const wasNearBottom = checkIfNearBottom();

      if (wasNearBottom || shouldAutoScroll) {
        setTimeout(() => scrollToBottom("smooth"), 50);
      }

      previousMessagesLength.current = messagesLength;
    }
  }, [
    messages,
    isMessagesLoading,
    scrollToBottom,
    checkIfNearBottom,
    shouldAutoScroll,
  ]);

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const isNearBottom = checkIfNearBottom();
      setShouldAutoScroll(isNearBottom);
    };

    container.addEventListener("scroll", handleScroll);
    return () => container.removeEventListener("scroll", handleScroll);
  }, [checkIfNearBottom]);

  // Mobile long-press handlers
  const handleTouchStart = useCallback((e, message) => {
    touchStartPos.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
    };

    longPressTimerRef.current = setTimeout(() => {
      // Vibrate on long press
      if (navigator.vibrate) {
        navigator.vibrate(50);
      }
      setLongPressMessage(message._id);
    }, 500);
  }, []);

  const handleTouchMove = useCallback((e) => {
    if (!touchStartPos.current) return;

    const moveX = Math.abs(e.touches[0].clientX - touchStartPos.current.x);
    const moveY = Math.abs(e.touches[0].clientY - touchStartPos.current.y);

    // Cancel if moved more than 10px
    if (moveX > 10 || moveY > 10) {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    touchStartPos.current = null;
  }, []);

  const handleContextMenu = (e, message) => {
    e.preventDefault();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      message,
    });
  };

  const handleReply = (message) => {
    setReplyingTo(message);
    setContextMenu(null);
  };

  const handleDelete = async (message, deleteForEveryone = false) => {
    await deleteMessage(message._id, deleteForEveryone);
    setContextMenu(null);
  };

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    setContextMenu(null);
  };

  const handleReaction = useCallback(
    async (messageId, emoji) => {
      const container = messagesContainerRef.current;
      const scrollTop = container?.scrollTop || 0;

      await addReaction(messageId, emoji);

      if (container) {
        container.scrollTop = scrollTop;
      }

      // Close mobile reaction menu
      setLongPressMessage(null);
    },
    [addReaction]
  );

  const handleImageClick = (imageUrl) => {
    setImageModal(imageUrl);
    setImageZoom(1);
    setImageRotation(0);
  };

  const handleDownload = () => {
    if (!imageModal) return;

    const link = document.createElement("a");
    link.href = imageModal;
    link.download = `image_${Date.now()}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleShare = async () => {
    if (!imageModal) return;

    if (navigator.share) {
      try {
        await navigator.share({
          title: "Shared Image",
          url: imageModal,
        });
      } catch (error) {
        console.error("Error sharing:", error);
      }
    } else {
      navigator.clipboard.writeText(imageModal);
      alert("Image URL copied to clipboard!");
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "sent":
        return <Check className="w-4 h-4 text-gray-400" />;
      case "delivered":
        return <CheckCheck className="w-4 h-4 text-gray-400" />;
      case "read":
        return <CheckCheck className="w-4 h-4 text-blue-500" />;
      default:
        return null;
    }
  };

  const renderMessageText = (text) => {
    if (!text) return null;

    const urlRegex = /(https?:\/\/[^\s]+)/gi;
    const parts = text.split(urlRegex);

    return parts.map((part, index) => {
      if (!part) return null;

      if (part.match(urlRegex)) {
        return (
          <a
            key={index}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400/95 underline hover:text-blue-400/60"
            onClick={(e) => e.stopPropagation()}
          >
            {part}
          </a>
        );
      }

      return <span key={index}>{part}</span>;
    });
  };

  const reactionEmojis = ["👍", "❤️", "😂", "😮", "😢", "🙏"];

  // Don't show skeleton, just return empty or messages immediately
  if (isMessagesLoading && messages.length === 0) {
    return (
      <div className="flex-1 flex flex-col overflow-hidden">
        <ChatHeader />
        <div className="flex-1 flex items-center justify-center">
          <p className="text-zinc-500 text-sm">Loading messages...</p>
        </div>
        <MessagesInput />
      </div>
    );
  }

  return (
    <>
      <div className="flex-1 flex flex-col overflow-hidden">
        <ChatHeader />

        <div
          ref={messagesContainerRef}
          className="flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-4"
        >
          {messages.length === 0 ? (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-zinc-500">
                No messages yet. Start the conversation!
              </p>
            </div>
          ) : (
            <>
              {messages.map((message) => {
                const isOwnMessage = message.senderId._id === authUser._id;

                const handleProfileClick = (e) => {
                  e.stopPropagation();
                  setIsProfileOpen(true);
                  document.activeElement?.blur();
                };

                return (
                  <div
                    key={message._id}
                    className={`chat ${
                      isOwnMessage ? "chat-end" : "chat-start"
                    }`}
                    onMouseEnter={() => setHoveredMessage(message._id)}
                    onMouseLeave={() => setHoveredMessage(null)}
                    onContextMenu={(e) => handleContextMenu(e, message)}
                    onTouchStart={(e) => handleTouchStart(e, message)}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                  >
                    {!isOwnMessage && (
                      <div className="chat-image avatar">
                        <div
                          className="size-10 rounded-full cursor-pointer"
                          tabIndex={0}
                          role="button"
                          onClick={handleProfileClick}
                        >
                          <img
                            src={message.senderId.profilePic || "/avatar.png"}
                            alt="profile pic"
                          />
                        </div>
                      </div>
                    )}

                    <div className="chat-header mb-1 flex items-center gap-2">
                      <time className="text-xs opacity-50">
                        {formatMessageTime(message.createdAt)}
                      </time>
                      {message.isEdited && (
                        <span className="text-xs opacity-50">(edited)</span>
                      )}
                    </div>

                    <div className="relative group">
                      <div className="chat-bubble flex flex-col max-w-xs lg:max-w-md">
                        {message.replyTo && (
                          <div className="bg-black/20 rounded p-2 mb-2 text-sm border-l-2 border-primary">
                            <p className="font-semibold text-xs">
                              {message.replyTo.senderId.fullName}
                            </p>
                            <p className="truncate opacity-70">
                              {message.replyTo.text || "Image"}
                            </p>
                          </div>
                        )}

                        {message.image && (
                          <img
                            src={message.image}
                            alt="Attachment"
                            className="sm:max-w-[200px] rounded-md mb-2 cursor-pointer hover:opacity-90 transition-opacity"
                            onClick={() => handleImageClick(message.image)}
                          />
                        )}

                        {message.text && (
                          <p className="wrap-break whitespace-pre-wrap">
                            {renderMessageText(message.text)}
                          </p>
                        )}

                        {isOwnMessage && (
                          <div className="flex items-center justify-end gap-1 mt-1">
                            {getStatusIcon(message.status)}
                          </div>
                        )}
                      </div>

                      <div className="absolute -bottom-4 right-0">
                        {message.reactions && message.reactions.length > 0 && (
                          <div className="flex gap-1 mt-1 flex-wrap">
                            {message.reactions.map((reaction, idx) => (
                              <span
                                key={idx}
                                className="text-sm bg-base-200 border border-base-300 px-1.5 py-0.5 rounded-full"
                                title={reaction.userId.fullName}
                              >
                                {reaction.emoji}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Desktop hover reactions */}
                      {hoveredMessage === message._id && (
                        <div
                          className={`absolute ${
                            isOwnMessage ? "right-0" : "left-0"
                          } top-0 -translate-y-8 bg-base-300 rounded-full px-2 py-1 flex gap-2 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity z-10 hidden md:flex`}
                        >
                          {reactionEmojis.map((emoji) => (
                            <button
                              key={emoji}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleReaction(message._id, emoji);
                              }}
                              onMouseEnter={() =>
                                setHoveredMessage(message._id)
                              }
                              className="hover:scale-125 transition-transform cursor-pointer text-lg"
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Mobile long-press reactions */}
                      {longPressMessage === message._id && (
                        <div
                          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center md:hidden"
                          onClick={() => setLongPressMessage(null)}
                        >
                          <div
                            className="bg-base-200 rounded-2xl p-6 m-4 max-w-sm"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="flex justify-between items-center mb-4">
                              <h3 className="font-semibold">
                                React to message
                              </h3>
                              <button
                                onClick={() => setLongPressMessage(null)}
                                className="btn btn-ghost btn-sm btn-circle"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                            <div className="grid grid-cols-6 gap-3">
                              {reactionEmojis.map((emoji) => (
                                <button
                                  key={emoji}
                                  onClick={() =>
                                    handleReaction(message._id, emoji)
                                  }
                                  className="text-3xl hover:scale-125 transition-transform p-2"
                                >
                                  {emoji}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {isOtherUserTyping && (
                <div className="chat chat-start">
                  <div className="chat-image avatar">
                    <div className="size-10 rounded-full border">
                      <img
                        src={selectedUser.profilePic || "/avatar.png"}
                        alt="profile pic"
                      />
                    </div>
                  </div>
                  <div className="chat-bubble">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 bg-current rounded-full animate-bounce" />
                      <span
                        className="w-2 h-2 bg-current rounded-full animate-bounce"
                        style={{ animationDelay: "0.2s" }}
                      />
                      <span
                        className="w-2 h-2 bg-current rounded-full animate-bounce"
                        style={{ animationDelay: "0.4s" }}
                      />
                    </div>
                  </div>
                </div>
              )}

              <div ref={messageEndRef} />
            </>
          )}
        </div>

        <MessagesInput
          editingMessage={editingMessage}
          setEditingMessage={setEditingMessage}
        />
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setContextMenu(null)}
          />
          <div
            className="fixed z-50 bg-base-200 rounded-lg shadow-xl py-2 min-w-[160px]"
            style={{
              top: `${contextMenu.y}px`,
              left: `${contextMenu.x}px`,
            }}
          >
            <button
              onClick={() => handleReply(contextMenu.message)}
              className="w-full px-4 py-2 hover:bg-base-300 flex items-center gap-2 text-left cursor-pointer"
            >
              <Reply className="w-4 h-4" />
              Reply
            </button>

            {contextMenu.message.text && (
              <button
                onClick={() => handleCopy(contextMenu.message.text)}
                className="w-full px-4 py-2 hover:bg-base-300 flex items-center gap-2 text-left cursor-pointer"
              >
                <Copy className="w-4 h-4" />
                Copy
              </button>
            )}

            {contextMenu.message.senderId._id === authUser._id && (
              <>
                {contextMenu.message.text && (
                  <button
                    onClick={() => {
                      setEditingMessage(contextMenu.message);
                      setContextMenu(null);
                    }}
                    className="w-full px-4 py-2 hover:bg-base-300 flex items-center gap-2 text-left cursor-pointer"
                  >
                    <Edit className="w-4 h-4" />
                    Edit
                  </button>
                )}

                <button
                  onClick={() => handleDelete(contextMenu.message, false)}
                  className="w-full px-4 py-2 hover:bg-base-300 flex items-center gap-2 text-left cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete for me
                </button>

                <button
                  onClick={() => handleDelete(contextMenu.message, true)}
                  className="w-full px-4 py-2 hover:bg-base-300 flex items-center gap-2 text-left text-red-500 cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete for everyone
                </button>
              </>
            )}
          </div>
        </>
      )}

      {/* Image Modal */}
      {imageModal && (
        <div className="fixed inset-0 z-50 bg-black/90">
          <div className="absolute top-0 left-0 right-0 h-14 flex items-center justify-between px-4 text-white backdrop-blur-lg bg-black/20">
            <div className="flex items-center gap-3">
              <button
                className="btn btn-circle btn-ghost text-white bg-black/50 hover:bg-gray-800 outline-none border-0 hover:shadow-none"
                onClick={() => setImageModal(null)}
              >
                <X className="w-6 h-6" />
              </button>

              <div className="flex flex-col leading-tight">
                <span className="text-sm font-medium">Image</span>
                <span className="text-xs text-gray-300">Preview</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                className="btn btn-circle btn-ghost text-white bg-black/50 hover:bg-gray-800 outline-none border-0 hover:shadow-none"
                title="Star"
              >
                <Star className="w-5 h-5" />
              </button>

              <button
                className="btn btn-circle btn-ghost text-white bg-black/50 hover:bg-gray-800 outline-none border-0 hover:shadow-none"
                onClick={handleShare}
                title="Share"
              >
                <Share2 className="w-5 h-5" />
              </button>

              <button
                className="btn btn-circle btn-ghost text-white bg-black/50 hover:bg-gray-800 outline-none border-0 hover:shadow-none"
                onClick={handleDownload}
                title="Download"
              >
                <Download className="w-5 h-5" />
              </button>

              <button
                className="btn btn-circle btn-ghost text-white bg-black/50 hover:bg-gray-800 outline-none border-0 hover:shadow-none"
                title="More options"
              >
                <MoreVertical className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="flex items-center justify-center h-full pt-16 pb-20 px-4">
            <img
              src={imageModal}
              alt="Full size"
              className="max-w-full max-h-full object-contain rounded-lg transition-transform duration-200"
              style={{
                transform: `scale(${imageZoom}) rotate(${imageRotation}deg)`,
              }}
              onClick={(e) => e.stopPropagation()}
            />
          </div>

          <div className="absolute bottom-0 left-0 right-0 h-16 flex items-center justify-center gap-4 bg-gradient-to-t from-black/80 to-transparent">
            <button
              className="p-3 hover:bg-white/10 rounded-full transition-colors text-white"
              onClick={() => setImageZoom(Math.max(0.5, imageZoom - 0.25))}
              title="Zoom out"
            >
              <ZoomOut className="w-5 h-5" />
            </button>

            <span className="text-white text-sm min-w-[60px] text-center">
              {Math.round(imageZoom * 100)}%
            </span>

            <button
              className="p-3 hover:bg-white/10 rounded-full transition-colors text-white"
              onClick={() => setImageZoom(Math.min(3, imageZoom + 0.25))}
              title="Zoom in"
            >
              <ZoomIn className="w-5 h-5" />
            </button>

            <div className="w-px h-8 bg-white/20 mx-2" />

            <button
              className="p-3 hover:bg-white/10 rounded-full transition-colors text-white"
              onClick={() => setImageRotation((imageRotation + 90) % 360)}
              title="Rotate"
            >
              <RotateCw className="w-5 h-5" />
            </button>

            <button
              className="px-4 py-2 hover:bg-white/10 rounded-lg transition-colors text-white text-sm"
              onClick={() => {
                setImageZoom(1);
                setImageRotation(0);
              }}
              title="Reset"
            >
              Reset
            </button>
          </div>
        </div>
      )}

      {isProfileOpen && selectedUser && (
        <ChatProfileOpener
          onClose={() => setIsProfileOpen(false)}
          user={selectedUser}
        />
      )}
    </>
  );
};

export default ChatContainer;
