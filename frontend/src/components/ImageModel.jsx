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
} from "lucide-react";
import { useEffect, useState, useCallback } from "react";

const ImageModal = ({ user, message, onClose }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [isStarred, setIsStarred] = useState(false);
  const imageSrc = message?.image || user?.profilePic || "/avatar.png";

  const imgAlt = message?.image
    ? "Chat image"
    : user?.profilePic
    ? "Profile picture"
    : "Avatar";

  const imageFrom = message?.image
    ? "chat"
    : user?.profilePic
    ? "profile"
    : "default";

  const handleShare = useCallback(
    async (e) => {
      e.stopPropagation();
      try {
        if (navigator.share) {
          await navigator.share({
            title: `${user?.fullName || "User"}'s Profile Picture`,
            url: imageSrc,
          });
        } else {
          await navigator.clipboard.writeText(imageSrc || "");
          alert("Link copied!");
        }
      } catch (err) {
        console.error("Share error:", err);
      }
    },
    [user, imageSrc]
  );

  const handleDownload = useCallback(
    async (e) => {
      e.stopPropagation();
      if (!imageSrc) return;

      try {
        const response = await fetch(imageSrc, { mode: "cors" });
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `${
          user?.fullName?.replace(/\s+/g, "-") || "profile"
        }-${Date.now()}.jpg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      } catch (err) {
        console.error("Download error:", err);
        setError("Download failed");
      }
    },
    [user, imageSrc]
  );

  const handleStar = useCallback((e) => {
    e.stopPropagation();
    setIsStarred((v) => !v);
  }, []);

  useEffect(() => {
    const onEsc = (e) => e.key === "Escape" && onClose?.();
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [onClose]);

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
      className="fixed inset-0 z-[100] bg-black/90 flex flex-col"
      onClick={() => onClose?.()}
    >
      {/* Header */}
      <div
        className="absolute top-0 left-0 right-0 h-14 px-4 flex items-center justify-between text-white bg-black/40 backdrop-blur-md z-10"
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
              {imageFrom === "chat"
                ? "Image"
                : `${user?.fullName || "User"}'s Profile`}
            </div>
            <div className="text-sm font-light">
              {imageFrom === "chat"
                ? "Sent in chat"
                : imageFrom === "profile"
                ? "Profile photo"
                : "Default avatar"}
            </div>
          </div>
        </div>

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

      {/* Image */}
      <div
        className="flex-1 flex items-center justify-center p-4 pt-20 pb-20"
        onClick={(e) => e.stopPropagation()}
      >
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-white" />
          </div>
        )}
        <img
          src={imageSrc}
          alt={imgAlt}
          className="max-w-full max-h-[85vh] object-contain transition-transform select-none"
          style={{ transform: `scale(${zoom}) rotate(${rotation}deg)` }}
          onLoad={() => setIsLoading(false)}
          onError={() => setError("Failed to load image")}
        />
      </div>

      {/* Controls */}
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

        <span className="min-w-16 text-center">{Math.round(zoom * 100)}%</span>

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
    </div>
  );
};

export default ImageModal;
