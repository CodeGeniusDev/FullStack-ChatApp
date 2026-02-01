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
  ArrowDown,
  ChevronsDown,
  Loader2,
  Play,
  Pause,
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
    removeReaction,
    typingUsers,
    loadMoreMessages,
    hasMoreMessages,
    isLoadingMore,
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
  const [showScrollButton, setShowScrollButton] = useState(false);

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

    return distanceFromBottom < 100;
  }, []);

  // Scroll to bottom function - INSTANT on initial load
  const scrollToBottom = useCallback((behavior = "auto") => {
    if (messageEndRef.current) {
      messageEndRef.current.scrollIntoView({ behavior, block: "end" });
    }
  }, []);

  // ✅ FIXED: Load messages when user changes
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
  }, [selectedUser?._id]);

  // ✅ CRITICAL FIX: Scroll to bottom INSTANTLY on initial load - MULTIPLE APPROACHES
  useEffect(() => {
    if (!isMessagesLoading && messages.length > 0 && isInitialLoad.current) {
      // Method 1: Immediate scroll before render
      if (messagesContainerRef.current) {
        messagesContainerRef.current.scrollTop =
          messagesContainerRef.current.scrollHeight;
      }

      // Method 2: Use requestAnimationFrame for after-render scroll
      requestAnimationFrame(() => {
        if (messagesContainerRef.current && messageEndRef.current) {
          messagesContainerRef.current.scrollTop =
            messagesContainerRef.current.scrollHeight;
        }
      });

      // Method 3: Double RAF for guaranteed execution after paint
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (messagesContainerRef.current && messageEndRef.current) {
            messagesContainerRef.current.scrollTop =
              messagesContainerRef.current.scrollHeight;
          }
        });
      });

      isInitialLoad.current = false;
      previousMessagesLength.current = messages.length;
    }
  }, [isMessagesLoading, messages.length]);

  // Handle new messages after initial load
  useEffect(() => {
    if (isInitialLoad.current || isMessagesLoading) return;

    const messagesLength = messages.length;
    const hasNewMessages = messagesLength > previousMessagesLength.current;

    if (hasNewMessages) {
      const wasNearBottom = checkIfNearBottom();

      if (wasNearBottom || shouldAutoScroll) {
        setTimeout(() => scrollToBottom("auto"), 50);
      }

      previousMessagesLength.current = messagesLength;
    }
  }, [
    messages.length,
    isMessagesLoading,
    checkIfNearBottom,
    shouldAutoScroll,
    scrollToBottom,
  ]);

  // ✅ FIXED: Track scroll position and show/hide scroll button
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const isNearBottom = checkIfNearBottom();
      setShouldAutoScroll(isNearBottom);

      const { scrollTop, scrollHeight, clientHeight } = container;
      const distanceFromBottom = scrollHeight - scrollTop - clientHeight;

      setShowScrollButton(distanceFromBottom > 300);
    };

    container.addEventListener("scroll", handleScroll);
    handleScroll();

    return () => container.removeEventListener("scroll", handleScroll);
  }, [checkIfNearBottom]);

  useEffect(() => {
    if (isOtherUserTyping) {
      const wasNearBottom = checkIfNearBottom();

      if (wasNearBottom || shouldAutoScroll) {
        setTimeout(() => scrollToBottom("auto"), 100);
      }
    }
  }, [isOtherUserTyping, checkIfNearBottom, shouldAutoScroll, scrollToBottom]);

  // Touch event listeners
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
          const startTime = performance.now();
          const startY = touchY - touchStartY;

          const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / 200, 1);
            const easing = 1 - Math.pow(1 - progress, 3);
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
  }, [isDragging, touchStartY, touchY, velocity]);

  // Context menu position adjustment
  useEffect(() => {
    if (!contextMenu || !contextMenuRef.current || contextMenu.positionLocked)
      return;

    const menuElement = contextMenuRef.current;
    const rect = menuElement.getBoundingClientRect();
    const padding = 16;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let newX = contextMenu.x;
    let newY = contextMenu.y;
    let needsAdjustment = false;

    // Horizontal adjustment
    const spaceOnRight = viewportWidth - newX;
    const spaceOnLeft = newX;

    if (spaceOnRight < rect.width + padding) {
      if (spaceOnLeft >= rect.width + padding) {
        newX = newX - rect.width;
      } else {
        newX = Math.max(
          padding,
          Math.min(newX, viewportWidth - rect.width - padding),
        );
      }
      needsAdjustment = true;
    }

    if (newX < padding) {
      newX = padding;
      needsAdjustment = true;
    }

    if (newX + rect.width > viewportWidth - padding) {
      newX = viewportWidth - rect.width - padding;
      needsAdjustment = true;
    }

    // Vertical adjustment
    const spaceBelow = viewportHeight - newY;
    const spaceAbove = newY;

    if (spaceBelow < rect.height + padding) {
      if (spaceAbove >= rect.height + padding) {
        newY = newY - rect.height;
      } else {
        newY = Math.max(
          padding,
          Math.min(newY, viewportHeight - rect.height - padding),
        );
      }
      needsAdjustment = true;
    }

    if (newY < padding) {
      newY = padding;
      needsAdjustment = true;
    }

    if (newY + rect.height > viewportHeight - padding) {
      newY = viewportHeight - rect.height - padding;
      needsAdjustment = true;
    }

    if (needsAdjustment) {
      const rafId = requestAnimationFrame(() => {
        if (menuElement) {
          menuElement.style.left = `${newX}px`;
          menuElement.style.top = `${newY}px`;
        }

        setContextMenu((prev) => ({
          ...prev,
          x: newX,
          y: newY,
          positionLocked: true,
        }));
      });

      return () => cancelAnimationFrame(rafId);
    }
  }, [contextMenu?.message?._id, contextMenu?.positionLocked]);

  const handleContextMenu = (e, message) => {
    e.preventDefault();
    e.stopPropagation();

    if (isMobile) return;

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

      if (isMobile) {
        setLongPressMessage(null);
      }
    },
    [addReaction, isMobile],
  );

  const handleTouchStart = useCallback(
    (e, message) => {
      if (!isMobile) return;

      longPressTimer.current = setTimeout(() => {
        setLongPressMessage(message);
        if (navigator.vibrate) {
          navigator.vibrate(50);
        }
      }, 500);
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

  useEffect(() => {
    return () => {
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current);
      }
    };
  }, []);

  // Drag and drop handlers
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

  const handleVideoClick = (message) => {
    setImageModal(message);
    setImageZoom(1);
    setImageRotation(0);
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

  const handleRemoveReaction = (messageId, emoji) => {
    removeReaction(messageId, emoji);
    setReactionDetailsModal(null);
  };

  const renderMessageText = (text) => {
    if (!text) return null;

    const urlPattern = /(?:https?:\/\/|www\.|ftp:\/\/)[^\s]+/gi;
    const emailPattern = /[a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+/gi;
    const combinedPattern = new RegExp(
      `(${urlPattern.source}|${emailPattern.source})`,
      "gi",
    );

    const parts = text.split(combinedPattern);
    return parts.map((part, index) => {
      if (!part) return null;

      if (part.match(urlPattern)) {
        const href = part.startsWith("www.") ? `https://${part}` : part;
        return (
          <a
            key={index}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400/95 underline hover:text-blue-400/60 break-words transition-colors duration-200"
            onClick={(e) => e.stopPropagation()}
            style={{ wordBreak: "break-all" }}
          >
            {part}
          </a>
        );
      } else if (part.match(emailPattern)) {
        return (
          <a
            key={index}
            href={`mailto:${part}`}
            className="text-blue-400/95 underline hover:text-blue-400/60 break-words transition-colors duration-200"
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

  const handleProfileClick = (e) => {
    e.stopPropagation();
    setIsProfileOpen(true);
    document.activeElement?.blur();
  };

  useEffect(() => {
    if (!longPressMessage) {
      setMobileShowEmojiSet2(false);
    }
  }, [longPressMessage]);

  const reactionEmojisSet1 = ["👍", "❤️", "😂", "😮", "😢", "🙏"];
  const reactionEmojisSet2 = ["😊", "😍", "🔥", "🎉", "👏", "🤔"];

  // Audio Player
  const AudioPlayer = ({ audioUrl, messageId }) => {
    const audioRef = useRef(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
      const audio = audioRef.current;
      if (!audio) return;

      const handleLoadedMetadata = () => {
        setDuration(audio.duration);
        setIsLoading(false);
      };

      const handleTimeUpdate = () => {
        setCurrentTime(audio.currentTime);
      };

      const handleEnded = () => {
        setIsPlaying(false);
        setCurrentTime(0);
      };

      const handleCanPlay = () => {
        setIsLoading(false);
      };

      audio.addEventListener("loadedmetadata", handleLoadedMetadata);
      audio.addEventListener("timeupdate", handleTimeUpdate);
      audio.addEventListener("ended", handleEnded);
      audio.addEventListener("canplay", handleCanPlay);

      return () => {
        audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
        audio.removeEventListener("timeupdate", handleTimeUpdate);
        audio.removeEventListener("ended", handleEnded);
        audio.removeEventListener("canplay", handleCanPlay);
      };
    }, []);

    const togglePlayPause = () => {
      const audio = audioRef.current;
      if (!audio) return;

      if (isPlaying) {
        audio.pause();
      } else {
        audio.play();
      }
      setIsPlaying(!isPlaying);
    };

    const handleSeek = (e) => {
      const audio = audioRef.current;
      if (!audio) return;

      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const percentage = x / rect.width;
      const newTime = percentage * duration;

      audio.currentTime = newTime;
      setCurrentTime(newTime);
    };

    const formatTime = (seconds) => {
      if (!seconds || isNaN(seconds)) return "0:00";
      const mins = Math.floor(seconds / 60);
      const secs = Math.floor(seconds % 60);
      return `${mins}:${secs.toString().padStart(2, "0")}`;
    };

    const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

    return (
      <div className="flex items-center gap-2 bg-base-200/50 rounded-lg p-2 min-w-[200px] max-w-[300px] transition-all duration-200 hover:bg-base-200/70">
        <audio ref={audioRef} src={audioUrl} preload="metadata" />

        <button
          onClick={togglePlayPause}
          disabled={isLoading}
          className="btn btn-circle btn-sm bg-primary hover:bg-primary-focus text-white border-none transition-all duration-200 hover:scale-110 active:scale-95"
        >
          {isLoading ? (
            <span className="loading loading-spinner loading-xs"></span>
          ) : isPlaying ? (
            <Pause size={16} fill="currentColor" />
          ) : (
            <Play size={16} fill="currentColor" className="ml-0.5" />
          )}
        </button>

        <div className="flex-1 flex flex-col gap-1">
          <div
            className="relative h-1 bg-base-300 rounded-full cursor-pointer overflow-hidden group"
            onClick={handleSeek}
          >
            <div
              className="absolute left-0 top-0 h-full bg-primary rounded-full transition-all duration-100"
              style={{ width: `${progress}%` }}
            />
            <div
              className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-primary rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200"
              style={{
                left: `${progress}%`,
                transform: "translate(-50%, -50%)",
              }}
            />
          </div>

          <div className="flex justify-between text-xs opacity-70">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      <div
        className="flex-1 flex flex-col overflow-hidden relative"
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* Drag and Drop Overlay with animation */}
        {isDraggingFile && (
          <div className="absolute inset-0 bg-primary/20 backdrop-blur-lg border-4 border-dashed border-primary rounded-lg z-[60] flex items-center justify-center pointer-events-none animate-fade-in">
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

        {/* Messages */}
        <div
          ref={messagesContainerRef}
          className="flex-1 overflow-y-auto overflow-x-hidden px-1 sm:px-4 pt-6 space-y-4"
          style={{ scrollBehavior: "auto" }}
        >
          {messages.length === 0 ? (
            <div className="flex-1 flex items-center justify-center animate-fade-in">
              <p className="text-zinc-500">
                No messages yet. Start the conversation!
              </p>
            </div>
          ) : (
            <>
              {hasMoreMessages && (
                <div className="text-center py-2 mb-4 animate-fade-in">
                  {isLoadingMore ? (
                    <div className="flex items-center justify-center gap-2 text-primary">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span className="text-sm">Loading older messages...</span>
                    </div>
                  ) : (
                    <button
                      onClick={() => loadMoreMessages(selectedUser._id)}
                      className="text-primary hover:underline text-sm font-medium px-4 py-2 rounded-lg hover:bg-base-200 transition-all duration-200 cursor-pointer hover:scale-105 active:scale-95"
                    >
                      Load More Messages
                    </button>
                  )}
                </div>
              )}

              {messages.map((message) => {
                const isOwnMessage = message.senderId._id === authUser._id;

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
                      <div className="chat-image avatar hidden md:block">
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
                        <div
                          className={`chat-bubble backdrop-blur-lg p-2 px-3 md:ml-0 ml-4 flex flex-col max-w-70 sm:max-w-lg ext-base-content ${
                            isOwnMessage ? "bg-base-300/70" : "bg-base-200/70"
                          }`}
                        >
                          {message.replyTo && (
                            <div className="bg-black/20 rounded p-2 mb-2 text-sm border-l-2 border-primary transition-all duration-200 hover:bg-black/30">
                              <p className="font-semibold text-xs">
                                {message.replyTo.senderId.fullName}
                              </p>
                              <p className="opacity-70">
                                <span className="sm:hidden">
                                  {message.replyTo.text &&
                                    (message.replyTo.text.length > 28
                                      ? `${message.replyTo.text.substring(0, 28)}...`
                                      : message.replyTo.text)}
                                </span>
                                <span className="hidden sm:inline">
                                  {message.replyTo.text &&
                                    (message.replyTo.text.length > 70
                                      ? `${message.replyTo.text.substring(0, 70)}...`
                                      : message.replyTo.text)}
                                </span>
                                {!message.replyTo.text && "Image"}
                              </p>
                            </div>
                          )}

                          {message.image && (
                            <img
                              src={message.image}
                              alt="Attachment"
                              loading="lazy"
                              className="sm:w-[200px] sm:max-h-[300px] max-h-[400px] object-cover rounded-md mb-2 cursor-pointer hover:opacity-90 transition-all duration-200"
                              onClick={() => handleImageClick(message)}
                            />
                          )}

                          {message.video && (
                            <div
                              className="relative sm:max-w-[300px] max-h-[400px] rounded-md mb-2 overflow-hidden cursor-pointer group/video"
                              onClick={() => handleVideoClick(message)}
                            >
                              <video
                                src={message.video}
                                className="w-full rounded-md transition-transform duration-200"
                                preload="metadata"
                                onError={(e) => {
                                  console.error("Video load error:", e);
                                  e.target.style.display = "none";
                                }}
                              >
                                Your browser does not support video playback.
                              </video>
                              <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover/video:bg-black/40 transition-all duration-200">
                                <div className="w-14 h-14 rounded-full bg-white/90 group-hover/video:bg-white flex items-center justify-center transition-all duration-200">
                                  <svg
                                    className="w-6 h-6 text-gray-800 ml-0.5"
                                    fill="currentColor"
                                    viewBox="0 0 16 16"
                                  >
                                    <path d="M5 3.5v9l7-4.5-7-4.5z" />
                                  </svg>
                                </div>
                              </div>
                            </div>
                          )}

                          {message.audio && (
                            <AudioPlayer
                              audioUrl={message.audio}
                              messageId={message._id}
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

                        <div className="absolute -bottom-3 right-0">
                          {message.reactions &&
                            message.reactions.length > 0 && (
                              <div className="flex flex-wrap items-center gap-1">
                                {Object.entries(
                                  message.reactions.reduce((acc, reaction) => {
                                    if (!acc[reaction.emoji]) {
                                      acc[reaction.emoji] = [];
                                    }
                                    acc[reaction.emoji].push(reaction);
                                    return acc;
                                  }, {}),
                                ).map(([emoji, reactions]) => {
                                  const enrichedReactions = reactions.map(
                                    (reaction) => {
                                      if (
                                        reaction.userId._id === authUser._id
                                      ) {
                                        return {
                                          ...reaction,
                                          userId: {
                                            ...reaction.userId,
                                            profilePic: authUser.profilePic,
                                            fullName: authUser.fullName,
                                          },
                                        };
                                      }
                                      if (
                                        reaction.userId._id ===
                                        message.senderId._id
                                      ) {
                                        return {
                                          ...reaction,
                                          userId: {
                                            ...reaction.userId,
                                            profilePic:
                                              message.senderId.profilePic,
                                            fullName: message.senderId.fullName,
                                          },
                                        };
                                      }
                                      return {
                                        ...reaction,
                                        userId: {
                                          _id: reaction.userId._id,
                                          fullName:
                                            reaction.userId.fullName || "User",
                                          profilePic:
                                            reaction.userId.profilePic ||
                                            "/avatar.png",
                                        },
                                      };
                                    },
                                  );

                                  return (
                                    <button
                                      key={emoji}
                                      onClick={() => {
                                        setReactionDetailsModal({
                                          emoji,
                                          reactions: enrichedReactions,
                                          message,
                                        });
                                      }}
                                      className="group relative inline-flex items-center gap-1.5 bg-base-100/10 backdrop-blur-lg border border-base-300/80 rounded-full px-1.5 py-0.5 hover:border-base-300 cursor-pointer transition-all duration-200 hover:scale-105 shadow-md hover:shadow-lg active:scale-95"
                                      title={enrichedReactions
                                        .map((r) => r.userId.fullName)
                                        .join(", ")}
                                    >
                                      <span className="text-md leading-none">
                                        {emoji}
                                      </span>
                                      {enrichedReactions.length > 1 && (
                                        <span className="text-[10px] font-semibold text-base-content/70 leading-none">
                                          {enrichedReactions.length}
                                        </span>
                                      )}
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                        </div>

                        {/* Quick reactions - Desktop hover */}
                        {hoveredMessage === message._id && !isMobile && (
                          <div
                            className={`absolute ${
                              isOwnMessage ? "right-0" : "left-0"
                            } top-0 -translate-y-8 backdrop-blur-lg bg-base-300/30 border border-base-300/20 rounded-full px-2 py-1 flex gap-2 shadow-lg opacity-0 group-hover:opacity-100 transition-all duration-200 z-100`}
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
                                    className="hover:scale-125 transition-transform duration-200 cursor-pointer text-lg active:scale-110"
                                  >
                                    {emoji}
                                  </button>
                                ))}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setShowEmojiSet2(true);
                                  }}
                                  className="text-xl text-center items-center justify-center transition-all duration-200 cursor-pointer p-1 bg-base-300/40 hover:bg-base-300/70 rounded-full active:scale-95"
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
                                  }}
                                  className="text-xl text-center items-center justify-center transition-all duration-200 cursor-pointer p-1 bg-base-300/40 hover:bg-base-300/70 rounded-full active:scale-95"
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
                                    className="hover:scale-125 transition-transform duration-200 cursor-pointer text-lg active:scale-110"
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
                <div className="chat chat-start animate-slide-up">
                  <div className="chat-image avatar">
                    <div className="size-10 rounded-full">
                      <img
                        src={selectedUser.profilePic || "/avatar.png"}
                        alt="profile pic"
                      />
                    </div>
                  </div>
                  <div className="chat-bubble animate-pulse-slow">
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

        {/* Scroll to Bottom Button with animation */}
        {showScrollButton && (
          <button
            onClick={() => {
              scrollToBottom("auto");
              setShowScrollButton(false);
            }}
            className="absolute left-1/2 -translate-x-1/2 bottom-24 z-10 w-8 h-8 bg-base-200 shadow-lg hover:shadow-xl rounded-full flex items-center justify-center transition-all duration-200 border border-base-200 animate-slide-up hover:scale-105 cursor-pointer"
            title="Scroll to bottom"
          >
            <ChevronsDown size={18} className="text-primary" />
          </button>
        )}

        <MessagesInput
          editingMessage={editingMessage}
          setEditingMessage={setEditingMessage}
        />
      </div>

      {/* Context Menu with smooth animation */}
      {contextMenu && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setContextMenu(null)}
          />
          <div
            ref={contextMenuRef}
            className="fixed z-50 backdrop-blur-lg bg-base-200/60 rounded-box shadow-xl p-1 min-w-[160px] max-w-[240px] animate-fade-in"
            style={{
              top: `${contextMenu.y}px`,
              left: `${contextMenu.x}px`,
              willChange: "transform",
            }}
          >
            <button
              onClick={() => handleReply(contextMenu.message)}
              className="w-full px-4 py-2 hover:bg-base-300/60 rounded-xl flex items-center gap-2 text-left cursor-pointer"
            >
              <Reply className="w-4 h-4" />
              Reply
            </button>

            {contextMenu.message.text && (
              <button
                onClick={() => handleCopy(contextMenu.message.text)}
                className="w-full px-4 py-2 hover:bg-base-300/60 rounded-xl flex items-center gap-2 text-left cursor-pointer"
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
                    className="w-full px-4 py-2 hover:bg-base-300/60 rounded-xl flex items-center gap-2 text-left cursor-pointer"
                  >
                    <Edit className="w-4 h-4" />
                    Edit
                  </button>
                )}

                <button
                  onClick={() => handleDelete(contextMenu.message, false)}
                  className="w-full px-4 py-2 hover:bg-base-300/60 rounded-xl flex items-center gap-2 text-left cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete for me
                </button>

                <button
                  onClick={() => handleDelete(contextMenu.message, true)}
                  className="w-full px-4 py-2 hover:bg-error/10 rounded-xl flex items-center gap-2 text-left text-red-500 cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete for everyone
                </button>
              </>
            )}
          </div>
        </>
      )}

      {/* Mobile Long Press Menu with smooth slide-up animation */}
      {longPressMessage && isMobile && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/50 animate-fade-in"
            onClick={() => setLongPressMessage(null)}
          />
          <div
            ref={menuRef}
            className={`fixed z-50 left-0 right-0 rounded-t-2xl backdrop-blur-xl bg-base-300/80 dark:bg-base-300/60 shadow-2xl pb-safe will-change-transform animate-slide-up ${
              isDragging
                ? "transition-none"
                : "transition-transform duration-300 ease-[cubic-bezier(0.2,0,0.1,1)]"
            }`}
            style={{
              bottom: "0",
              transform: isDragging
                ? `translateY(${Math.max(0, (touchY - touchStartY) * 0.6)}px)`
                : "translateY(0)",
              touchAction: "pan-y",
              transformOrigin: "bottom center",
              ...(isDragging && {
                transition: "none",
                transform: `translateY(${Math.max(0, (touchY - touchStartY) * 0.6)}px) scale(${1 - Math.min(0.02, (touchY - touchStartY) * 0.0005)})`,
              }),
            }}
            onTouchStart={(e) => {
              if (e.touches[0].clientY < 100) {
                const touch = e.touches[0];
                setTouchStartY(touch.clientY);
                setTouchY(touch.clientY);
                lastTouchY.current = touch.clientY;
                lastTouchTime.current = performance.now();
                setIsDragging(true);

                if (animationFrameId.current) {
                  cancelAnimationFrame(animationFrameId.current);
                  animationFrameId.current = null;
                }
              }
            }}
          >
            <div
              className="w-full py-3 flex justify-center touch-none"
              onTouchStart={(e) => {
                setTouchStartY(e.touches[0].clientY);
                setTouchY(e.touches[0].clientY);
                setIsDragging(true);
                e.stopPropagation();
              }}
            >
              <div className="w-12 h-1.5 bg-base-content/30 dark:bg-base-content/20 rounded-full"></div>
            </div>
            <div className="px-4 pb-4 space-y-3">
              {/* Quick Reactions */}
              <div className="py-3 border-b border-base-300">
                <div className="flex justify-center gap-4 mb-6">
                  {!mobileShowEmojiSet2 ? (
                    <div className="flex justify-center items-center gap-5">
                      {reactionEmojisSet1.map((emoji) => (
                        <button
                          key={`mobile-set1-${emoji}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleReaction(longPressMessage._id, emoji);
                            setLongPressMessage(null);
                          }}
                          className="text-2xl active:scale-110 transition-transform duration-200"
                        >
                          {emoji}
                        </button>
                      ))}
                      <button
                        onClick={() => setMobileShowEmojiSet2(true)}
                        className="text-2xl p-1 active:bg-base-300 border border-base-300 rounded-full flex items-center justify-center transition-all duration-200 active:scale-110"
                      >
                        <Plus className="w-6 h-6" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex justify-center items-center gap-5">
                      <button
                        onClick={() => setMobileShowEmojiSet2(false)}
                        className="text-2xl p-1 active:bg-base-300 border border-base-300 rounded-full flex items-center justify-center transition-all duration-200 active:scale-110"
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
                          className="text-2xl active:scale-110 transition-transform duration-200"
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
                      className={`w-1.5 h-1.5 rounded-full transition-all duration-200 ${!mobileShowEmojiSet2 ? "bg-primary scale-125" : "bg-base-300"}`}
                    ></div>
                    <div
                      className={`w-1.5 h-1.5 rounded-full transition-all duration-200 ${mobileShowEmojiSet2 ? "bg-primary scale-125" : "bg-base-300"}`}
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
                className="w-full px-4 py-3 bg-base-300 hover:bg-base-100 rounded-lg flex items-center gap-3 text-left transition-all duration-200 active:scale-95"
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
                  className="w-full px-4 py-3 bg-base-300 hover:bg-base-100 rounded-lg flex items-center gap-3 text-left transition-all duration-200 active:scale-95"
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
                      className="w-full px-4 py-3 bg-base-300 hover:bg-base-100 rounded-lg flex items-center gap-3 text-left transition-all duration-200 active:scale-95"
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
                    className="w-full px-4 py-3 bg-base-300 hover:bg-base-100 rounded-lg flex items-center gap-3 text-left transition-all duration-200 active:scale-95"
                  >
                    <Trash2 className="w-5 h-5" />
                    <span>Delete for me</span>
                  </button>

                  <button
                    onClick={() => {
                      handleDelete(longPressMessage, true);
                      setLongPressMessage(null);
                    }}
                    className="w-full px-4 py-3 bg-base-300 hover:bg-base-100 rounded-lg flex items-center gap-3 text-left text-red-500 transition-all duration-200 active:scale-95"
                  >
                    <Trash2 className="w-5 h-5" />
                    <span>Delete for everyone</span>
                  </button>
                </>
              )}

              <button
                onClick={() => setLongPressMessage(null)}
                className="w-full px-4 py-3 bg-base-100 hover:bg-base-300 rounded-lg text-center font-medium transition-all duration-200 active:scale-95"
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

      {/* Reaction Details Modal with animation */}
      {reactionDetailsModal && (
        <>
          <div
            className="fixed inset-0 z-[90] bg-black/50"
            onClick={() => setReactionDetailsModal(null)}
          />
          <div className="fixed z-[95] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 backdrop-blur-lg bg-base-200/90 rounded-box shadow-xl p-4 min-w-[280px] max-w-[90vw] max-h-[80vh] overflow-auto animate-slide-down">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <span className="text-2xl">{reactionDetailsModal.emoji}</span>
                <span>Reactions</span>
              </h3>
              <button
                onClick={() => setReactionDetailsModal(null)}
                className="btn btn-ghost btn-sm btn-circle transition-all duration-200 active:scale-95"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-2">
              {reactionDetailsModal.reactions.map((reaction, idx) => (
                <div
                  key={idx}
                  onClick={() => {
                    if (reaction.userId._id === authUser._id) {
                      handleRemoveReaction(
                        reactionDetailsModal.message._id,
                        reaction.emoji,
                      );
                    }
                  }}
                  className="flex items-center gap-3 p-2 hover:bg-base-300/70 rounded-lg transition-all duration-200 cursor-pointer"
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
                        ? "Tap to remove"
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
