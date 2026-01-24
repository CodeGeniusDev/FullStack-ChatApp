"use client";
import {
  X,
  Star,
  Share2,
  Download,
  MoreVertical,
  ZoomIn,
  ZoomOut,
  RotateCw,
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  SkipBack,
  SkipForward,
} from "lucide-react";
import { useEffect, useState, useCallback, useRef } from "react";

const MediaGalleryModal = ({ user, message, onClose, allMessages = [] }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [isStarred, setIsStarred] = useState(false);

  // Video player states
  const videoRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [playbackRate, setPlaybackRate] = useState(1);
  const controlsTimeoutRef = useRef(null);

  // Get all media (images and videos) from messages
  const mediaMessages = allMessages.filter((msg) => msg.image || msg.video);

  // Find the index of the current message in the media messages array
  const currentIndex = mediaMessages.findIndex(
    (msg) =>
      msg._id === message?._id ||
      msg.image === message?.image ||
      msg.video === message?.video ||
      msg === message,
  );

  // Set initial active index based on whether we found the message in mediaMessages
  const [activeIndex, setActiveIndex] = useState(
    currentIndex >= 0 ? currentIndex : 0,
  );

  // Always use the message prop if it exists and has media, otherwise use the indexed message
  const currentMessage =
    message?.image || message?.video
      ? message
      : mediaMessages[activeIndex] || message;

  // Determine if we're in profile view or chat media view
  const isProfileView = !message?.image && !message?.video && user?.profilePic;

  // Set media source based on view type
  let mediaSrc, mediaAlt, mediaFrom, isVideo;

  if (isProfileView) {
    // For profile view
    mediaSrc = user.profilePic;
    mediaAlt = "Profile picture";
    mediaFrom = "profile";
    isVideo = false;
  } else {
    // For chat media view
    isVideo = !!currentMessage?.video;
    mediaSrc = currentMessage?.video || currentMessage?.image || "/avatar.png";
    mediaAlt = isVideo ? "Chat video" : "Chat image";
    mediaFrom = "chat";
  }

  // Only show navigation if there are multiple media items and we're not in profile view
  const hasMultipleMedia = !isProfileView && mediaMessages.length > 1;
  const canGoNext = !isProfileView && activeIndex < mediaMessages.length - 1;
  const canGoPrev = !isProfileView && activeIndex > 0;

  // Video player functions
  const togglePlay = useCallback(() => {
    if (!videoRef.current) return;

    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
    setIsPlaying(!isPlaying);
  }, [isPlaying]);

  const toggleMute = useCallback(() => {
    if (!videoRef.current) return;
    videoRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  }, [isMuted]);

  const handleVolumeChange = useCallback((e) => {
    const newVolume = parseFloat(e.target.value);
    if (!videoRef.current) return;
    videoRef.current.volume = newVolume;
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
  }, []);

  const handleSeek = useCallback((e) => {
    const newTime = parseFloat(e.target.value);
    if (!videoRef.current) return;
    videoRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  }, []);

  const skipTime = useCallback(
    (seconds) => {
      if (!videoRef.current) return;
      videoRef.current.currentTime = Math.max(
        0,
        Math.min(duration, currentTime + seconds),
      );
    },
    [currentTime, duration],
  );

  const changePlaybackRate = useCallback(() => {
    if (!videoRef.current) return;
    const rates = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];
    const currentRateIndex = rates.indexOf(playbackRate);
    const nextRate = rates[(currentRateIndex + 1) % rates.length];
    videoRef.current.playbackRate = nextRate;
    setPlaybackRate(nextRate);
  }, [playbackRate]);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      videoRef.current?.parentElement?.requestFullscreen?.();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.();
      setIsFullscreen(false);
    }
  }, []);

  // Auto-hide controls after 3 seconds of no mouse movement
  const resetControlsTimeout = useCallback(() => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    if (isPlaying && isVideo) {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    }
  }, [isPlaying, isVideo]);

  useEffect(() => {
    resetControlsTimeout();
    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, [resetControlsTimeout]);

  // Video event listeners
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !isVideo) return;

    const handleTimeUpdate = () => setCurrentTime(video.currentTime);
    const handleDurationChange = () => setDuration(video.duration);
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };
    const handleLoadedMetadata = () => {
      setDuration(video.duration);
      setIsLoading(false);
    };

    video.addEventListener("timeupdate", handleTimeUpdate);
    video.addEventListener("durationchange", handleDurationChange);
    video.addEventListener("play", handlePlay);
    video.addEventListener("pause", handlePause);
    video.addEventListener("ended", handleEnded);
    video.addEventListener("loadedmetadata", handleLoadedMetadata);

    return () => {
      video.removeEventListener("timeupdate", handleTimeUpdate);
      video.removeEventListener("durationchange", handleDurationChange);
      video.removeEventListener("play", handlePlay);
      video.removeEventListener("pause", handlePause);
      video.removeEventListener("ended", handleEnded);
      video.removeEventListener("loadedmetadata", handleLoadedMetadata);
    };
  }, [isVideo]);

  const goToNext = useCallback(() => {
    if (canGoNext) {
      setActiveIndex((prev) => prev + 1);
      setZoom(1);
      setRotation(0);
      setIsLoading(true);
      // Reset video states
      setIsPlaying(false);
      setCurrentTime(0);
    }
  }, [canGoNext]);

  const goToPrev = useCallback(() => {
    if (canGoPrev) {
      setActiveIndex((prev) => prev - 1);
      setZoom(1);
      setRotation(0);
      setIsLoading(true);
      // Reset video states
      setIsPlaying(false);
      setCurrentTime(0);
    }
  }, [canGoPrev]);

  const handleShare = useCallback(
    async (e) => {
      e.stopPropagation();
      try {
        if (navigator.share) {
          await navigator.share({
            title: `${user?.fullName || "User"}'s ${isVideo ? "Video" : "Image"}`,
            url: mediaSrc,
          });
        } else {
          await navigator.clipboard.writeText(mediaSrc || "");
          alert("Link copied!");
        }
      } catch (err) {
        console.error("Share error:", err);
      }
    },
    [user, mediaSrc, isVideo],
  );

  const handleDownload = useCallback(
    async (e) => {
      e.stopPropagation();
      if (!mediaSrc) return;

      try {
        const response = await fetch(mediaSrc, { mode: "cors" });
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        const extension = isVideo ? "mp4" : "jpg";
        link.download = `${
          user?.fullName?.replace(/\s+/g, "-") || "media"
        }-${Date.now()}.${extension}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      } catch (err) {
        console.error("Download error:", err);
        setError("Download failed");
      }
    },
    [user, mediaSrc, isVideo],
  );

  const handleStar = useCallback((e) => {
    e.stopPropagation();
    setIsStarred((v) => !v);
  }, []);

  const formatTime = (seconds) => {
    if (isNaN(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  useEffect(() => {
    const onEsc = (e) => e.key === "Escape" && onClose?.();
    const onArrowKey = (e) => {
      if (e.key === "ArrowLeft") goToPrev();
      if (e.key === "ArrowRight") goToNext();
      if (e.key === " " && isVideo) {
        e.preventDefault();
        togglePlay();
      }
    };

    window.addEventListener("keydown", onEsc);
    window.addEventListener("keydown", onArrowKey);

    return () => {
      window.removeEventListener("keydown", onEsc);
      window.removeEventListener("keydown", onArrowKey);
    };
  }, [onClose, goToNext, goToPrev, isVideo, togglePlay]);

  if (error) {
    return (
      <div className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center">
        <div className="bg-base-100 p-6 rounded-lg text-center">
          <p className="text-error mb-4">{error}</p>
          <button
            onClick={() => {
              setError(null);
              onClose?.();
            }}
            className="px-5 py-2 bg-primary rounded hover:bg-primary/80 cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/95 flex flex-col"
      onClick={() => !isVideo && onClose?.()}
      onMouseMove={resetControlsTimeout}
    >
      {/* Header */}
      <div
        className={`absolute top-0 left-0 right-0 h-14 px-4 flex items-center justify-between text-white bg-gradient-to-b from-black/70 to-transparent z-20 transition-opacity duration-300 ${
          isVideo && !showControls && isPlaying
            ? "opacity-0 pointer-events-none"
            : "opacity-100"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-full transition-colors cursor-pointer"
            title="Close"
          >
            <X size={24} />
          </button>
          <div>
            <div className="font-medium">
              {mediaFrom === "chat"
                ? hasMultipleMedia
                  ? `${isVideo ? "Video" : "Image"} ${activeIndex + 1} of ${mediaMessages.length}`
                  : isVideo
                    ? "Video"
                    : "Image"
                : `${user?.fullName || "User"}'s Profile`}
            </div>
            <div className="text-sm font-light">
              {mediaFrom === "chat"
                ? "Sent in chat"
                : mediaFrom === "profile"
                  ? "Profile photo"
                  : "Default avatar"}
            </div>
          </div>
        </div>

        {/* Thumbnail Navigation (for multiple media) */}
        {hasMultipleMedia && mediaMessages.length > 1 && (
          <div
            className={`absolute top-0 left-1/2 -translate-x-1/2 flex gap-2 p-2 bg-black/60 backdrop-blur-md  transition-opacity duration-300 ${
              isVideo && !showControls && isPlaying
                ? "opacity-0 pointer-events-none"
                : "opacity-100"
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            {mediaMessages
              .slice(
                Math.max(0, activeIndex - 2),
                Math.min(mediaMessages.length, activeIndex + 3),
              )
              .map((media, idx) => {
                const realIndex = Math.max(0, activeIndex - 2) + idx;
                const isActive = realIndex === activeIndex;
                const isVideoThumb = !!media.video;

                return (
                  <button
                    key={media._id}
                    onClick={() => {
                      setActiveIndex(realIndex);
                      setIsLoading(true);
                      setZoom(1);
                      setRotation(0);
                      setIsPlaying(false);
                    }}
                    className={`relative w-12 h-12 rounded overflow-hidden transition-all cursor-pointer ${
                      isActive
                        ? "ring-1 ring-white scale-105"
                        : "opacity-60 hover:opacity-100"
                    }`}
                    title={`${isVideoThumb ? "Video" : "Image"} ${realIndex + 1}`}
                  >
                    {isVideoThumb ? (
                      <video
                        src={media.video}
                        className="w-full h-full object-cover"
                        preload="metadata"
                      />
                    ) : (
                      <img
                        src={media.image}
                        alt={`Media ${realIndex + 1}`}
                        className="w-full h-full object-cover"
                      />
                    )}
                    {isVideoThumb && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                        <Play size={16} className="text-white" />
                      </div>
                    )}
                  </button>
                );
              })}
          </div>
        )}

        <div className="flex gap-1">
          <button
            onClick={handleStar}
            className="p-2 hover:bg-white/10 rounded-full transition-colors cursor-pointer"
            title="Favorite"
          >
            <Star
              size={20}
              fill={isStarred ? "#fbbf24" : "none"}
              color={isStarred ? "#fbbf24" : "white"}
            />
          </button>
          <button
            onClick={handleShare}
            className="p-2 hover:bg-white/10 rounded-full transition-colors cursor-pointer"
            title="Share"
          >
            <Share2 size={20} />
          </button>
          <button
            onClick={handleDownload}
            className="p-2 hover:bg-white/10 rounded-full transition-colors cursor-pointer"
            title="Download"
          >
            <Download size={20} />
          </button>
          <button
            className="p-2 hover:bg-white/10 rounded-full transition-colors cursor-pointer"
            title="More"
          >
            <MoreVertical size={20} />
          </button>
        </div>
      </div>

      {/* Media Content */}
      <div
        className="flex-1 flex items-center justify-center p-4 pt-20 pb-24 relative"
        onClick={(e) => {
          e.stopPropagation();
          if (isVideo) {
            togglePlay();
          }
        }}
      >
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-white" />
          </div>
        )}

        {/* Previous Button */}
        {hasMultipleMedia && canGoPrev && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              goToPrev();
            }}
            className={`absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-black/50 hover:bg-black/70 rounded-full transition-all cursor-pointer z-10 ${
              isVideo && !showControls && isPlaying
                ? "opacity-0 pointer-events-none"
                : "opacity-100"
            }`}
            title="Previous"
          >
            <ChevronLeft size={32} className="text-white" />
          </button>
        )}

        {/* Image Display */}
        {!isVideo && (
          <img
            src={mediaSrc}
            alt={mediaAlt}
            className="max-w-full max-h-[85vh] object-contain transition-transform select-none"
            style={{ transform: `scale(${zoom}) rotate(${rotation}deg)` }}
            onLoad={() => setIsLoading(false)}
            onError={() => setError("Failed to load media")}
          />
        )}

        {/* Video Display */}
        {isVideo && (
          <div className="relative max-w-full max-h-[85vh] w-full flex items-center justify-center">
            <video
              ref={videoRef}
              src={mediaSrc}
              className="max-w-full max-h-[85vh] object-contain rounded-lg"
              preload="metadata"
              onError={() => setError("Failed to load video")}
              onClick={(e) => {
                e.stopPropagation();
                togglePlay();
              }}
            />

            {/* Play/Pause Overlay */}
            {!isPlaying && !isLoading && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  togglePlay();
                }}
                className="absolute inset-0 flex items-center justify-center bg-black/20 hover:bg-black/30 transition-colors cursor-pointer"
              >
                <div className="p-6 bg-black/60 hover:bg-black/70 rounded-full">
                  <Play size={30} className="text-white" />
                </div>
              </button>
            )}
          </div>
        )}

        {/* Next Button */}
        {hasMultipleMedia && canGoNext && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              goToNext();
            }}
            className={`absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-black/50 hover:bg-black/70 rounded-full transition-all cursor-pointer z-10 ${
              isVideo && !showControls && isPlaying
                ? "opacity-0 pointer-events-none"
                : "opacity-100"
            }`}
            title="Next"
          >
            <ChevronRight size={32} className="text-white" />
          </button>
        )}
      </div>

      {/* Controls - Image Controls */}
      {!isVideo && (
        <div
          className="absolute bottom-0 left-0 right-0 h-16 flex items-center justify-center gap-4 bg-gradient-to-t from-black/70 to-transparent text-white"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => setZoom((v) => Math.max(0.5, v - 0.25))}
            className="p-2 hover:bg-white/10 rounded-full transition-colors cursor-pointer"
            title="Zoom out"
          >
            <ZoomOut size={24} />
          </button>

          <span className="min-w-16 text-center">
            {Math.round(zoom * 100)}%
          </span>

          <button
            onClick={() => setZoom((v) => Math.min(4, v + 0.25))}
            className="p-2 hover:bg-white/10 rounded-full transition-colors cursor-pointer"
            title="Zoom in"
          >
            <ZoomIn size={24} />
          </button>

          <div className="w-px h-8 bg-white/30 mx-2" />

          <button
            onClick={() => setRotation((v) => (v + 90) % 360)}
            className="p-2 hover:bg-white/10 rounded-full transition-colors cursor-pointer"
            title="Rotate"
          >
            <RotateCw size={24} />
          </button>

          <button
            className="px-4 py-1.5 bg-white/10 hover:bg-white/20 rounded transition-colors cursor-pointer"
            onClick={() => {
              setZoom(1);
              setRotation(0);
            }}
            title="Reset"
          >
            Reset
          </button>
        </div>
      )}

      {/* Controls - Video Controls (WhatsApp Style) */}
      {isVideo && (
        <div
          className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/70 to-transparent text-white transition-all duration-300 ${
            !showControls && isPlaying
              ? "opacity-0 translate-y-full pointer-events-none"
              : "opacity-100 translate-y-0"
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Progress Bar */}
          <div className="px-6 pt-4">
            <input
              type="range"
              min="0"
              max={duration || 0}
              value={currentTime}
              onChange={handleSeek}
              className="w-full h-1 bg-white/30 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:cursor-pointer"
            />
            <div className="flex justify-between text-xs mt-1">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Control Buttons */}
          <div className="flex items-center justify-between px-4 pb-4 pt-2">
            {/* Left Controls */}
            <div className="flex items-center gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  togglePlay();
                }}
                className="p-2 hover:bg-white/10 rounded-full transition-colors cursor-pointer"
              >
                {isPlaying ? <Pause size={24} /> : <Play size={24} />}
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  skipTime(-10);
                }}
                className="p-2 hover:bg-white/10 rounded-full transition-colors cursor-pointer"
                title="Rewind 10s"
              >
                <SkipBack size={20} />
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  skipTime(10);
                }}
                className="p-2 hover:bg-white/10 rounded-full transition-colors cursor-pointer"
                title="Forward 10s"
              >
                <SkipForward size={20} />
              </button>

              {/* Volume Control */}
              <div className="flex items-center gap-2 ml-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleMute();
                  }}
                  className="p-2 hover:bg-white/10 rounded-full transition-colors cursor-pointer"
                >
                  {isMuted || volume === 0 ? (
                    <VolumeX size={20} />
                  ) : (
                    <Volume2 size={20} />
                  )}
                </button>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={volume}
                  onChange={handleVolumeChange}
                  className="w-20 h-1 bg-white/30 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:cursor-pointer hidden sm:block"
                />
              </div>
            </div>

            {/* Right Controls */}
            <div className="flex items-center gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  changePlaybackRate();
                }}
                className="px-3 py-1 text-sm bg-white/10 hover:bg-white/20 rounded transition-colors cursor-pointer"
                title="Playback speed"
              >
                {playbackRate}x
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleFullscreen();
                }}
                className="p-2 hover:bg-white/10 rounded-full transition-colors cursor-pointer"
                title="Fullscreen"
              >
                {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MediaGalleryModal;
