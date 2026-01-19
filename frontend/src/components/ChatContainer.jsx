"use client";
import React, { useEffect, useRef, useState, useCallback } from "react";
import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";
import MessageSkeleton from "./skeletons/MessageSkeleton";
import ChatHeader from "./ChatHeader";
import MessagesInput from "./MessagesInput";
import { formatMessageTime } from "../lib/utils";
import { Check, CheckCheck, Reply, Trash2, Edit, Copy } from "lucide-react";
import ChatProfileOpener from "./ChatProfileOpener";
import ImageModel from "./ImageModel";

const ChatContainer = ({ onClose, user, message }) => {
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
  const [longPressMessage, setLongPressMessage] = useState(null);
  const longPressTimer = useRef(null);
  const [isMobile, setIsMobile] = useState(false);

  // Check if the selected user is typing (not yourself!)
  const isOtherUserTyping = typingUsers[selectedUser?._id] || false;

  // Detect mobile device
  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth <= 768 || "ontouchstart" in window);
    };

    checkIfMobile();
    window.addEventListener("resize", checkIfMobile);

    return () => window.removeEventListener("resize", checkIfMobile);
  }, []);

  // Check if user is near bottom of chat
  const checkIfNearBottom = useCallback(() => {
    if (!messagesContainerRef.current) return true;

    const { scrollTop, scrollHeight, clientHeight } =
      messagesContainerRef.current;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;

    // Consider "near bottom" if within 100px of the bottom
    return distanceFromBottom < 100;
  }, []);

  // Scroll to bottom function
  const scrollToBottom = useCallback((behavior = "smooth") => {
    if (messageEndRef.current) {
      messageEndRef.current.scrollIntoView({ behavior, block: "end" });
    }
  }, []);

  // Load messages when user changes
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

  // Handle scrolling ONLY when appropriate
  useEffect(() => {
    // Don't scroll if loading
    if (isMessagesLoading) return;

    const messagesLength = messages.length;
    const hasNewMessages = messagesLength > previousMessagesLength.current;

    // Initial load - scroll instantly to bottom
    if (isInitialLoad.current && messagesLength > 0) {
      setTimeout(() => {
        scrollToBottom("auto");
        isInitialLoad.current = false;
        previousMessagesLength.current = messagesLength;
      }, 0);
      return;
    }

    // New message arrived
    if (hasNewMessages) {
      const wasNearBottom = checkIfNearBottom();

      // Only auto-scroll if user was already near the bottom
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

  // Track scroll position to determine auto-scroll behavior
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

  const handleContextMenu = (e, message) => {
    e.preventDefault();

    // Don't show context menu on mobile (use long press instead)
    if (isMobile) return;

    const menuWidth = 160;
    const menuHeight = 200; // Approximate height
    const padding = 10;

    let x = e.clientX;
    let y = e.clientY;

    // Adjust X position if menu would go off screen
    if (x + menuWidth > window.innerWidth - padding) {
      x = window.innerWidth - menuWidth - padding;
    }
    if (x < padding) {
      x = padding;
    }

    // Adjust Y position if menu would go off screen
    if (y + menuHeight > window.innerHeight - padding) {
      y = window.innerHeight - menuHeight - padding;
    }
    if (y < padding) {
      y = padding;
    }

    setContextMenu({
      x,
      y,
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

  // FIXED: Prevent auto-scroll on reaction
  const handleReaction = useCallback(
    async (messageId, emoji) => {
      // Store current scroll position
      const container = messagesContainerRef.current;
      const scrollTop = container?.scrollTop || 0;

      await addReaction(messageId, emoji);

      // Restore scroll position after reaction
      if (container) {
        container.scrollTop = scrollTop;
      }

      // Close long press menu on mobile after reaction
      if (isMobile) {
        setLongPressMessage(null);
      }
    },
    [addReaction, isMobile]
  );

  // Handle long press for mobile
  const handleTouchStart = useCallback(
    (e, message) => {
      if (!isMobile) return;

      longPressTimer.current = setTimeout(() => {
        setLongPressMessage(message);
        // Trigger haptic feedback if available
        if (navigator.vibrate) {
          navigator.vibrate(50);
        }
      }, 500); // 500ms long press
    },
    [isMobile]
  );

  const handleTouchEnd = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  const handleTouchMove = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  // Cleanup long press timer
  useEffect(() => {
    return () => {
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current);
      }
    };
  }, []);

  const handleImageClick = (message) => {
    setImageModal(message);
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

  const closeImageModal = (e) => {
    e?.stopPropagation();
    setImageModal(null);
  };

  const reactionEmojis = ["👍", "❤️", "😂", "😮", "😢", "🙏"];

  if (isMessagesLoading) {
    return (
      <div className="flex-1 flex flex-col overflow-auto">
        <ChatHeader />
        <MessageSkeleton />
        <MessagesInput />
      </div>
    );
  }

  return (
    <>
      <div className="flex-1 flex flex-col overflow-hidden">
        <ChatHeader />

        {/* Messages - FIXED: Added ref to track scroll */}
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
                    onMouseEnter={() =>
                      !isMobile && setHoveredMessage(message._id)
                    }
                    onMouseLeave={() => !isMobile && setHoveredMessage(null)}
                    onContextMenu={(e) => handleContextMenu(e, message)}
                    onTouchStart={(e) => handleTouchStart(e, message)}
                    onTouchEnd={handleTouchEnd}
                    onTouchMove={handleTouchMove}
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

                    <div className="">
                      <div className="relative group">
                        <div className="chat-bubble bg-base-200 flex flex-col max-w-lg">
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
                              onClick={() => handleImageClick(message)}
                            />
                          )}

                          {message.text && (
                            <p className="wrap-break whitespace-pre-wrap">
                              {renderMessageText(message.text)}
                            </p>
                          )}

                          <div className="flex items-center justify-between gap-2 w-full pt-1">
                            <div className="flex-1 flex items-center">
                              {message.isEdited && (
                                <span className="text-xs opacity-50">
                                  (edited)
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-2">
                              <time className="text-xs opacity-50">
                                {formatMessageTime(message.createdAt)}
                              </time>
                              {isOwnMessage && getStatusIcon(message.status)}
                            </div>
                          </div>
                        </div>

                        <div className="absolute -bottom-4 right-0">
                          {message.reactions &&
                            message.reactions.length > 0 && (
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

                        {/* Quick reactions - Desktop hover ONLY */}
                        {hoveredMessage === message._id && !isMobile && (
                          <div
                            className={`absolute ${
                              isOwnMessage ? "right-0" : "left-0"
                            } top-0 -translate-y-8 backdrop-blur-lg bg-base-200 rounded-full px-2 py-1 flex gap-2 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity z-100`}
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
                      </div>
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

      {/* Mobile Long Press Menu */}
      {longPressMessage && isMobile && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/50"
            onClick={() => setLongPressMessage(null)}
          />
          <div className="fixed z-50 bottom-0 left-0 right-0 bg-base-200 rounded-t-2xl shadow-xl pb-safe">
            <div className="p-4 space-y-3">
              {/* Quick Reactions at Top */}
              <div className="flex justify-center gap-3 py-3 border-b border-base-300">
                {reactionEmojis.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleReaction(longPressMessage._id, emoji);
                    }}
                    className="text-2xl hover:scale-125 active:scale-110 transition-transform cursor-pointer p-2 hover:bg-base-300 rounded-full"
                  >
                    {emoji}
                  </button>
                ))}
              </div>

              {/* Menu Options */}
              <button
                onClick={() => {
                  handleReply(longPressMessage);
                  setLongPressMessage(null);
                }}
                className="w-full px-4 py-3 bg-base-300 hover:bg-base-100 rounded-lg flex items-center gap-3 text-left cursor-pointer"
              >
                <Reply className="w-5 h-5" />
                <span>Reply</span>
              </button>

              {longPressMessage.text && (
                <button
                  onClick={() => {
                    handleCopy(longPressMessage.text);
                    setLongPressMessage(null);
                  }}
                  className="w-full px-4 py-3 bg-base-300 hover:bg-base-100 rounded-lg flex items-center gap-3 text-left cursor-pointer"
                >
                  <Copy className="w-5 h-5" />
                  <span>Copy</span>
                </button>
              )}

              {longPressMessage.senderId._id === authUser._id && (
                <>
                  {longPressMessage.text && (
                    <button
                      onClick={() => {
                        setEditingMessage(longPressMessage);
                        setLongPressMessage(null);
                      }}
                      className="w-full px-4 py-3 bg-base-300 hover:bg-base-100 rounded-lg flex items-center gap-3 text-left cursor-pointer"
                    >
                      <Edit className="w-5 h-5" />
                      <span>Edit</span>
                    </button>
                  )}

                  <button
                    onClick={() => {
                      handleDelete(longPressMessage, false);
                      setLongPressMessage(null);
                    }}
                    className="w-full px-4 py-3 bg-base-300 hover:bg-base-100 rounded-lg flex items-center gap-3 text-left cursor-pointer"
                  >
                    <Trash2 className="w-5 h-5" />
                    <span>Delete for me</span>
                  </button>

                  <button
                    onClick={() => {
                      handleDelete(longPressMessage, true);
                      setLongPressMessage(null);
                    }}
                    className="w-full px-4 py-3 bg-base-300 hover:bg-base-100 rounded-lg flex items-center gap-3 text-left text-red-500 cursor-pointer"
                  >
                    <Trash2 className="w-5 h-5" />
                    <span>Delete for everyone</span>
                  </button>
                </>
              )}

              <button
                onClick={() => setLongPressMessage(null)}
                className="w-full px-4 py-3 bg-base-100 hover:bg-base-300 rounded-lg text-center cursor-pointer font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        </>
      )}

      {/* Image Modal */}
      {imageModal && (
        <ImageModel
          onClose={closeImageModal}
          user={selectedUser}
          message={imageModal}
        />
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
