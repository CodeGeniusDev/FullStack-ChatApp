"use client";
import React, { useEffect, useRef, useState, useCallback } from "react";
import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";
import MessageSkeleton from "./skeletons/MessageSkeleton";
import ChatHeader from "./ChatHeader";
import MessagesInput from "./MessagesInput";
import { formatMessageTime } from "../lib/utils";
import {
  Check,
  CheckCheck,
  Reply,
  Trash2,
  Edit,
  Copy,
  X,
  Plus,
  ChevronLeft,
} from "lucide-react";
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
  const contextMenuRef = useRef(null);
  const [contextMenu, setContextMenu] = useState(null);
  const [editingMessage, setEditingMessage] = useState(null);
  const [hoveredMessage, setHoveredMessage] = useState(null);
  const [showEmojiSet2, setShowEmojiSet2] = useState(false);
  const [mobileShowEmojiSet2, setMobileShowEmojiSet2] = useState(false);
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
  const [reactionDetailsModal, setReactionDetailsModal] = useState(null);
  const [touchStartY, setTouchStartY] = useState(0);
  const [touchY, setTouchY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [velocity, setVelocity] = useState(0);
  const lastTouchTime = useRef(0);
  const lastTouchY = useRef(0);
  const menuRef = useRef(null);
  const animationFrameId = useRef(null);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const dragCounter = useRef(0);

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

  // CRITICAL FIX: Load messages when user changes
  // DO NOT include function references in dependencies - they cause infinite loops!
  useEffect(() => {
    if (selectedUser?._id) {
      console.log(
        "📨 Loading messages for user:",
        selectedUser.fullName,
        "and ID:",
        selectedUser._id,
      );
      isInitialLoad.current = true;
      getMessages(selectedUser._id);
      subscribeToMessages();
    }

    return () => {
      console.log("🔌 Unsubscribing from messages");
      unsubscribeFromMessages();
    };
  }, [selectedUser?._id]); // ONLY depend on user ID - functions are stable in Zustand

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
  }, [messages.length, isMessagesLoading]); // ONLY depend on message count, not functions

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
  }, []); // Empty array - event listener doesn't need dependencies

  // Add touch event listeners with passive: false and velocity calculation
  useEffect(() => {
    const menu = menuRef.current;
    if (!menu) return;

    const handleTouchMove = (e) => {
      if (isDragging) {
        const touch = e.touches[0];
        const now = performance.now();
        const deltaY = touch.clientY - lastTouchY.current;
        const deltaTime = now - lastTouchTime.current;

        if (deltaTime > 0) {
          const newVelocity = deltaY / deltaTime;
          setVelocity(newVelocity);
        }

        lastTouchY.current = touch.clientY;
        lastTouchTime.current = now;
        setTouchY(touch.clientY);
        e.preventDefault();
      }
    };

    const handleTouchEnd = () => {
      if (isDragging) {
        const dragDistance = touchY - touchStartY;
        const shouldClose =
          dragDistance > 100 || (dragDistance > 50 && velocity > 0.3);

        if (shouldClose) {
          setLongPressMessage(null);
        } else {
          // Animate back to position with easing
          const startTime = performance.now();
          const startY = touchY - touchStartY;

          const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / 200, 1); // 200ms animation
            const easing = 1 - Math.pow(1 - progress, 3); // Cubic ease-out
            const currentY = startY * (1 - easing);

            if (menuRef.current) {
              menuRef.current.style.transform = `translateY(${currentY}px)`;
            }

            if (progress < 1) {
              animationFrameId.current = requestAnimationFrame(animate);
            } else if (menuRef.current) {
              menuRef.current.style.transform = "";
            }
          };

          animationFrameId.current = requestAnimationFrame(animate);
        }

        setIsDragging(false);
        setVelocity(0);
      }
    };

    menu.addEventListener("touchmove", handleTouchMove, { passive: false });
    menu.addEventListener("touchend", handleTouchEnd, { passive: true });

    return () => {
      menu.removeEventListener("touchmove", handleTouchMove);
      menu.removeEventListener("touchend", handleTouchEnd);
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, [isDragging, touchStartY, touchY, velocity]); // Empty array - event listener doesn't need dependencies

  // Adjust context menu position after render to use actual dimensions
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

      // Check if menu goes beyond right edge
      if (rect.right > viewportWidth - padding) {
        newX = viewportWidth - rect.width - padding;
        needsUpdate = true;
      }

      // Check if menu goes beyond left edge
      if (rect.left < padding) {
        newX = padding;
        needsUpdate = true;
      }

      // Check if menu goes beyond bottom edge
      if (rect.bottom > viewportHeight - padding) {
        newY = viewportHeight - rect.height - padding;
        needsUpdate = true;
      }

      // Check if menu goes beyond top edge
      if (rect.top < padding) {
        newY = padding;
        needsUpdate = true;
      }

      // Update position if needed
      if (needsUpdate) {
        setContextMenu({
          ...contextMenu,
          x: Math.max(padding, newX),
          y: Math.max(padding, newY),
        });
      }
    }
  }, [contextMenu]);

  const handleContextMenu = (e, message) => {
    e.preventDefault();

    // Don't show context menu on mobile (use long press instead)
    if (isMobile) return;

    const menuWidth = 200;
    const menuHeight = 250; // Approximate height with all options
    const padding = 16;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let x = e.clientX;
    let y = e.clientY;

    // Horizontal positioning - smart detection
    const spaceOnRight = viewportWidth - x;
    const spaceOnLeft = x;

    if (spaceOnRight < menuWidth + padding) {
      // Not enough space on right
      if (spaceOnLeft >= menuWidth + padding) {
        // Position to the left of cursor
        x = x - menuWidth;
      } else {
        // Not enough space on either side, position at right edge with padding
        x = viewportWidth - menuWidth - padding;
      }
    }

    // Ensure menu doesn't go beyond left edge
    x = Math.max(padding, x);

    // Ensure menu doesn't go beyond right edge
    if (x + menuWidth > viewportWidth - padding) {
      x = viewportWidth - menuWidth - padding;
    }

    // Vertical positioning - smart detection
    const spaceBelow = viewportHeight - y;
    const spaceAbove = y;

    if (spaceBelow < menuHeight + padding) {
      // Not enough space below
      if (spaceAbove >= menuHeight + padding) {
        // Position above cursor
        y = y - menuHeight;
      } else {
        // Not enough space above or below
        // Position at the edge that has more space
        if (spaceAbove > spaceBelow) {
          y = padding; // Top of screen
        } else {
          y = viewportHeight - menuHeight - padding; // Bottom of screen
        }
      }
    }

    // Ensure menu doesn't go beyond top edge
    y = Math.max(padding, y);

    // Ensure menu doesn't go beyond bottom edge
    if (y + menuHeight > viewportHeight - padding) {
      y = viewportHeight - menuHeight - padding;
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
    [addReaction, isMobile],
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
    [isMobile],
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

  // Drag and drop handlers for entire chat area
  const handleDragEnter = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current++;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDraggingFile(true);
    }
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current--;
    if (dragCounter.current === 0) {
      setIsDraggingFile(false);
    }
  }, []);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingFile(false);
    dragCounter.current = 0;

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      // Trigger file input in MessagesInput component
      const fileEvent = new Event("dropFiles", { bubbles: true });
      fileEvent.files = files;
      window.dispatchEvent(fileEvent);
    }
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

    // Match URLs (http, https, ftp, etc.) - using non-capturing groups
    const urlPattern = /(?:https?:\/\/|www\.|ftp:\/\/)[^\s]+/gi;
    // Match email addresses - using non-capturing group
    const emailPattern = /[a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+/gi;
    // Combined pattern
    const combinedPattern = new RegExp(
      `(${urlPattern.source}|${emailPattern.source})`,
      "gi",
    );

    // Split text by both URL and email patterns
    const parts = text.split(combinedPattern);
    return parts.map((part, index) => {
      if (!part) return null;

      // Check if part is a URL
      if (part.match(urlPattern)) {
        // Add https:// if it's a www link without protocol
        const href = part.startsWith("www.") ? `https://${part}` : part;
        return (
          <a
            key={index}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400/95 underline hover:text-blue-400/60 break-words"
            onClick={(e) => e.stopPropagation()}
            style={{ wordBreak: "break-all" }}
          >
            {part}
          </a>
        );
      }
      // Check if part is an email
      else if (part.match(emailPattern)) {
        return (
          <a
            key={index}
            href={`mailto:${part}`}
            className="text-blue-400/95 underline hover:text-blue-400/60 break-words"
            onClick={(e) => e.stopPropagation()}
            style={{ wordBreak: "break-all" }}
          >
            {part}
          </a>
        );
      }

      return (
        <span
          key={index}
          className="break-words"
          style={{ wordBreak: "break-word" }}
        >
          {part}
        </span>
      );
    });
  };

  const closeImageModal = (e) => {
    e?.stopPropagation();
    setImageModal(null);
  };

  // Reset emoji set when closing the long press menu
  useEffect(() => {
    if (!longPressMessage) {
      setMobileShowEmojiSet2(false);
    }
  }, [longPressMessage]);

  const reactionEmojisSet1 = ["👍", "❤️", "😂", "😮", "😢", "🙏"];
  const reactionEmojisSet2 = ["😊", "😍", "🔥", "🎉", "👏", "🤔"];
  const [activeEmojiSet, setActiveEmojiSet] = useState(reactionEmojisSet1);

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
      <div
        className="flex-1 flex flex-col overflow-hidden relative"
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* Drag and Drop Overlay */}
        {isDraggingFile && (
          <div className="absolute inset-0 bg-primary/20 backdrop-blur-sm border-4 border-dashed border-primary rounded-lg z-[60] flex items-center justify-center pointer-events-none">
            <div className="text-center bg-base-100/90 p-8 rounded-lg shadow-xl">
              <div className="text-6xl mb-4">📁</div>
              <p className="text-2xl font-bold mb-2">Drop files here</p>
              <p className="text-base-content/70">
                Images, videos, or audio files
              </p>
            </div>
          </div>
        )}

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
                              <p className="truncate  opacity-70">
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

                          {message.video && (
                            <video
                              src={message.video}
                              controls
                              className="sm:max-w-[300px] rounded-md mb-2"
                              preload="metadata"
                            >
                              Your browser does not support video playback.
                            </video>
                          )}

                          {message.audio && (
                            <audio
                              src={message.audio}
                              controls
                              className="w-full max-w-[280px] mb-2"
                              preload="metadata"
                            >
                              Your browser does not support audio playback.
                            </audio>
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
                                {/* Group reactions by emoji */}
                                {Object.entries(
                                  message.reactions.reduce((acc, reaction) => {
                                    if (!acc[reaction.emoji]) {
                                      acc[reaction.emoji] = [];
                                    }
                                    acc[reaction.emoji].push(reaction);
                                    return acc;
                                  }, {}),
                                ).map(([emoji, reactions]) => (
                                  <button
                                    key={emoji}
                                    onClick={() =>
                                      setReactionDetailsModal({
                                        emoji,
                                        reactions,
                                        message,
                                      })
                                    }
                                    className="text-sm bg-base-200 border border-base-300 px-1.5 py-0.5 rounded-full hover:bg-base-300 cursor-pointer transition-colors flex items-center gap-1"
                                  >
                                    <span>{emoji}</span>
                                    {reactions.length > 1 && (
                                      <span className="text-xs">
                                        {reactions.length}
                                      </span>
                                    )}
                                  </button>
                                ))}
                              </div>
                            )}
                        </div>

                        {/* Quick reactions - Desktop hover ONLY */}
                        {hoveredMessage === message._id && !isMobile && (
                          <div
                            className={`absolute ${
                              isOwnMessage ? "right-0" : "left-0"
                            } top-0 -translate-y-8 backdrop-blur-lg bg-amber-100 rounded-full px-2 py-1 flex gap-2 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity z-100`}
                          >
                            {!showEmojiSet2 ? (
                              <>
                                {reactionEmojisSet1.map((emoji) => (
                                  <button
                                    key={`set1-${emoji}`}
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
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setShowEmojiSet2(true);
                                    setActiveEmojiSet(reactionEmojisSet2);
                                  }}
                                  className="text-xl text-center items-center justify-center border border-base-300 transition-transform cursor-pointer p-1 hover:bg-base-300 rounded-full"
                                >
                                  <Plus className="w-5 h-5" />
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setShowEmojiSet2(false);
                                    setActiveEmojiSet(reactionEmojisSet1);
                                  }}
                                  className="text-xl text-center items-center justify-center border border-base-300 transition-transform cursor-pointer p-1 hover:bg-base-300 rounded-full"
                                >
                                  <ChevronLeft className="w-5 h-5" />
                                </button>
                                {reactionEmojisSet2.map((emoji) => (
                                  <button
                                    key={`set2-${emoji}`}
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
                              </>
                            )}
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
            ref={contextMenuRef}
            className="fixed z-50 bg-base-200 rounded-lg shadow-xl py-2 min-w-[160px] max-w-[240px]"
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
          <div
            ref={menuRef}
            className={`fixed z-50 left-0 right-0 backdrop-blur-xl bg-base-300/80 dark:bg-base-300/60 shadow-2xl pb-safe will-change-transform ${isDragging ? "transition-none" : "transition-transform duration-300 ease-[cubic-bezier(0.2,0,0.1,1)]"}`}
            style={{
              bottom: "0",
              transform: isDragging
                ? `translateY(${Math.max(0, (touchY - touchStartY) * 0.6)}px)`
                : "translateY(0)",
              touchAction: "pan-y",
              // Add a slight scale effect when dragging down
              transformOrigin: "bottom center",
              ...(isDragging && {
                transition: "none",
                transform: `translateY(${Math.max(0, (touchY - touchStartY) * 0.6)}px) scale(${1 - Math.min(0.02, (touchY - touchStartY) * 0.0005)})`,
              }),
            }}
            onTouchStart={(e) => {
              // Only start drag from the top of the menu
              if (e.touches[0].clientY < 100) {
                const touch = e.touches[0];
                setTouchStartY(touch.clientY);
                setTouchY(touch.clientY);
                lastTouchY.current = touch.clientY;
                lastTouchTime.current = performance.now();
                setIsDragging(true);

                // Cancel any ongoing animations
                if (animationFrameId.current) {
                  cancelAnimationFrame(animationFrameId.current);
                  animationFrameId.current = null;
                }
              }
            }}
          >
            {/* iPhone-style handle bar with touch target */}
            <div
              className="w-full py-3 flex justify-center touch-none"
              onTouchStart={(e) => {
                setTouchStartY(e.touches[0].clientY);
                setTouchY(e.touches[0].clientY);
                setIsDragging(true);
                // Prevent any parent touch events from interfering
                e.stopPropagation();
              }}
            >
              <div className="w-12 h-1.5 bg-base-content/30 dark:bg-base-content/20 rounded-full"></div>
            </div>
            <div className="px-4 pb-4 space-y-3">
              {/* Quick Reactions at Top */}
              <div className="py-3 border-b border-base-300">
                <div className="flex justify-center gap-4 mb-6">
                  {!mobileShowEmojiSet2 ? (
                    <div className="flex justify-center items-center gap-6">
                      {reactionEmojisSet1.map((emoji) => (
                        <button
                          key={`mobile-set1-${emoji}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleReaction(longPressMessage._id, emoji);
                            setLongPressMessage(null);
                          }}
                          className="text-2xl active:scale-110 transition-transform cursor-pointer hover:bg-base-300 rounded-full"
                        >
                          {emoji}
                        </button>
                      ))}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setMobileShowEmojiSet2(true);
                        }}
                        className="text-2xl p-1 active:bg-base-300 active:scale-110 border border-base-300 transition-transform cursor-pointer hover:bg-base-300 rounded-full flex items-center justify-center"
                      >
                        <Plus className="w-6 h-6" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex justify-center items-center gap-6">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setMobileShowEmojiSet2(false);
                        }}
                        className="text-2xl p-1 active:bg-base-300 active:scale-110 border border-base-300 transition-transform cursor-pointer hover:bg-base-300 rounded-full flex items-center justify-center"
                      >
                        <ChevronLeft className="w-6 h-6" />
                      </button>
                      {reactionEmojisSet2.map((emoji) => (
                        <button
                          key={`mobile-set2-${emoji}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleReaction(longPressMessage._id, emoji);
                            setLongPressMessage(null);
                          }}
                          className="text-2xl active:scale-110 transition-transform cursor-pointer hover:bg-base-300 rounded-full"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex justify-center mt-1">
                  <div className="flex gap-1">
                    <div
                      className={`w-1.5 h-1.5 rounded-full ${!mobileShowEmojiSet2 ? "bg-primary" : "bg-base-300"}`}
                    ></div>
                    <div
                      className={`w-1.5 h-1.5 rounded-full ${mobileShowEmojiSet2 ? "bg-primary" : "bg-base-300"}`}
                    ></div>
                  </div>
                </div>
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
          allMessages={messages}
        />
      )}

      {/* Reaction Details Modal */}
      {reactionDetailsModal && (
        <>
          <div
            className="fixed inset-0 z-[90] bg-black/50"
            onClick={() => setReactionDetailsModal(null)}
          />
          <div className="fixed z-[95] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-base-200 rounded-lg shadow-xl p-4 min-w-[280px] max-w-[90vw] max-h-[80vh] overflow-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <span className="text-2xl">{reactionDetailsModal.emoji}</span>
                <span>Reactions</span>
              </h3>
              <button
                onClick={() => setReactionDetailsModal(null)}
                className="btn btn-ghost btn-sm btn-circle"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-2">
              {reactionDetailsModal.reactions.map((reaction, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-3 p-2 hover:bg-base-300 rounded-lg"
                >
                  <img
                    src={reaction.userId.profilePic || "/avatar.png"}
                    alt={reaction.userId.fullName}
                    className="w-10 h-10 rounded-full"
                  />
                  <div className="flex-1">
                    <p className="font-medium">{reaction.userId.fullName}</p>
                    <p className="text-xs text-base-content/70">
                      {reaction.userId._id === authUser._id
                        ? "You"
                        : reaction.userId._id ===
                            reactionDetailsModal.message.senderId._id
                          ? "Sender"
                          : "Receiver"}
                    </p>
                  </div>
                  <span className="text-xl">{reaction.emoji}</span>
                </div>
              ))}
            </div>
          </div>
        </>
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
