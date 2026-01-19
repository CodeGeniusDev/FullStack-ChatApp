import { useEffect, useRef, useState } from "react";
import { useChatStore } from "../store/useChatStore";
import { Image, Send, X, Smile, Paperclip, Mic } from "lucide-react";
import toast from "react-hot-toast";
import EmojiPicker from "emoji-picker-react";
import { compressImage, debounce } from "../lib/utils";

const MessageInput = ({ editingMessage, setEditingMessage }) => {
  const [text, setText] = useState("");
  const [imagePreview, setImagePreview] = useState(null);
  const [mediaPreviews, setMediaPreviews] = useState([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  const { sendMessage, replyingTo, clearReplyingTo, editMessage, setTyping } =
    useChatStore();

  const debouncedStopTyping = useRef(
    debounce(() => setTyping(false), 3000)
  ).current;

  useEffect(() => {
    if (editingMessage) {
      setText(editingMessage.text || "");
      textareaRef.current?.focus();
    }
  }, [editingMessage]);

  const handleImageChange = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    await processFiles(files);
  };

  const processFiles = async (files) => {
    const validFiles = [];
    const maxSize = 10 * 1024 * 1024; // 10MB

    for (const file of files) {
      // Check file type
      const isImage = file.type.startsWith("image/");
      const isVideo = file.type.startsWith("video/");
      const isAudio = file.type.startsWith("audio/");

      if (!isImage && !isVideo && !isAudio) {
        toast.error(`${file.name}: Unsupported file type`);
        continue;
      }

      // Check file size
      if (file.size > maxSize) {
        toast.error(`${file.name}: File too large (max 10MB)`);
        continue;
      }

      validFiles.push(file);
    }

    if (validFiles.length === 0) return;

    setIsUploading(true);
    toast.loading(`Processing ${validFiles.length} file(s)...`, { id: "process" });

    try {
      const previews = [];
      
      for (const file of validFiles) {
        if (file.type.startsWith("image/")) {
          const compressedBase64 = await compressImage(file, 1024, 1024, 0.8);
          previews.push({ type: "image", data: compressedBase64, name: file.name });
        } else if (file.type.startsWith("video/")) {
          const base64 = await fileToBase64(file);
          previews.push({ type: "video", data: base64, name: file.name });
        } else if (file.type.startsWith("audio/")) {
          const base64 = await fileToBase64(file);
          previews.push({ type: "audio", data: base64, name: file.name });
        }
      }

      setMediaPreviews(prev => [...prev, ...previews]);
      toast.success(`${validFiles.length} file(s) ready to send`, { id: "process" });
    } catch (error) {
      console.error("File processing error:", error);
      toast.error("Failed to process some files", { id: "process" });
    } finally {
      setIsUploading(false);
    }
  };

  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const removeMedia = (index) => {
    setMediaPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const removeImage = () => {
    setImagePreview(null);
    setMediaPreviews([]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Drag and drop handlers
  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.target === e.currentTarget) {
      setIsDragging(false);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      await processFiles(files);
    }
  };

  const handleTyping = (value) => {
    setText(value);
    setTyping(true);
    debouncedStopTyping();
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();

    if (!text.trim() && !imagePreview && mediaPreviews.length === 0) return;

    // Store values before clearing
    const messageText = text.trim();
    const messageImage = imagePreview;
    const messageMedia = mediaPreviews;

    // IMMEDIATELY clear input for instant feedback
    setText("");
    setImagePreview(null);
    setMediaPreviews([]);
    setTyping(false);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }

    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    try {
      if (editingMessage) {
        await editMessage(editingMessage._id, messageText);
        setEditingMessage(null);
      } else {
        // Send multiple messages if multiple media files
        if (messageMedia.length > 0) {
          for (const media of messageMedia) {
            await sendMessage({
              text: messageMedia.length === 1 ? messageText : "",
              image: media.data,
            });
          }
          // Send text separately if multiple media
          if (messageMedia.length > 1 && messageText) {
            await sendMessage({ text: messageText, image: null });
          }
        } else {
          await sendMessage({
            text: messageText,
            image: messageImage,
          });
        }
      }
    } catch (error) {
      console.error("Failed to send/edit message:", error);
      // On error, restore the text
      setText(messageText);
      setImagePreview(messageImage);
      setMediaPreviews(messageMedia);
    }
  };

  const handleEmojiClick = (emojiObject) => {
    setText((prev) => prev + emojiObject.emoji);
    setShowEmojiPicker(false);
    textareaRef.current?.focus();
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(e);
    }
  };

  return (
    <div 
      className="p-3 w-full border-t border-base-300 backdrop-blur-lg bg-base-100/10 relative"
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Drag and Drop Overlay */}
      {isDragging && (
        <div className="absolute inset-0 bg-primary/20 backdrop-blur-sm border-2 border-dashed border-primary rounded-lg z-50 flex items-center justify-center">
          <div className="text-center">
            <Paperclip size={48} className="mx-auto mb-2 text-primary" />
            <p className="text-lg font-semibold">Drop files here</p>
            <p className="text-sm opacity-70">Images, videos, or audio files</p>
          </div>
        </div>
      )}
      {/* Reply preview */}
      {replyingTo && (
        <div className="mb-2 flex items-center gap-2 backdrop-blur-md bg-base-200/70 p-2.5 rounded-lg border border-base-300/50">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-primary font-semibold">
              Replying to {replyingTo.senderId.fullName}
            </p>
            <p className="text-sm truncate opacity-70">
              {replyingTo.text || "📷 Image"}
            </p>
          </div>
          <button
            onClick={clearReplyingTo}
            className="btn btn-ghost btn-sm btn-circle flex-shrink-0 hover:bg-base-300/50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Edit preview */}
      {editingMessage && (
        <div className="mb-2 flex items-center gap-2 backdrop-blur-md bg-warning/20 p-2.5 rounded-lg border border-warning/30">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-warning font-semibold">
              Editing message
            </p>
            <p className="text-sm truncate opacity-70">{editingMessage.text}</p>
          </div>
          <button
            onClick={() => {
              setEditingMessage(null);
              setText("");
            }}
            className="btn btn-ghost btn-sm btn-circle flex-shrink-0 hover:bg-warning/20"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Image preview (legacy - kept for single image) */}
      {imagePreview && mediaPreviews.length === 0 && (
        <div className="mb-3 flex items-center gap-2">
          <div className="relative">
            <img
              src={imagePreview}
              alt="Preview"
              className="w-20 h-20 object-cover rounded-lg border-2 border-base-300/50"
            />
            <button
              onClick={removeImage}
              className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-error text-error-content flex items-center justify-center shadow-lg hover:scale-110 transition-transform"
              type="button"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Multiple Media Previews */}
      {mediaPreviews.length > 0 && (
        <div className="mb-3">
          <div className="flex items-center gap-2 mb-2">
            <p className="text-sm font-medium">{mediaPreviews.length} file(s) selected</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {mediaPreviews.map((media, index) => (
              <div key={index} className="relative">
                {media.type === "image" && (
                  <img
                    src={media.data}
                    alt={media.name}
                    className="w-20 h-20 object-cover rounded-lg border-2 border-base-300/50"
                  />
                )}
                {media.type === "video" && (
                  <div className="w-20 h-20 bg-base-300 rounded-lg border-2 border-base-300/50 flex items-center justify-center">
                    <span className="text-2xl">🎥</span>
                  </div>
                )}
                {media.type === "audio" && (
                  <div className="w-20 h-20 bg-base-300 rounded-lg border-2 border-base-300/50 flex items-center justify-center">
                    <span className="text-2xl">🎵</span>
                  </div>
                )}
                <button
                  onClick={() => removeMedia(index)}
                  className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-error text-error-content flex items-center justify-center shadow-lg hover:scale-110 transition-transform"
                  type="button"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <form onSubmit={handleSendMessage} className="flex items-center gap-2">
        {/* Attachment */}
        {!editingMessage && (
          <button
            type="button"
            className="btn btn-circle btn-ghost btn-sm sm:btn-md"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            title="Attach file"
          >
            {isUploading ? (
              <span className="loading loading-spinner loading-sm" />
            ) : (
              <Paperclip size={20} />
            )}
          </button>
        )}

        <input
          type="file"
          accept="image/*,video/*,audio/*"
          className="hidden"
          ref={fileInputRef}
          onChange={handleImageChange}
          disabled={isUploading}
          multiple
        />

        {/* Input + emoji */}
        <div className="flex-1 backdrop-blur-lg bg-base-200/50 rounded-xl border border-base-300/50 flex items-end overflow-hidden">
          <textarea
            ref={textareaRef}
            rows={1}
            className="flex-1 bg-transparent px-4 py-2.5 resize-none outline-none text-sm sm:text-base placeholder:text-base-content/50 max-h-32 overflow-y-auto"
            placeholder="Type a message..."
            value={text}
            onChange={(e) => handleTyping(e.target.value)}
            onKeyPress={handleKeyPress}
            onInput={(e) => {
              e.target.style.height = "auto";
              e.target.style.height =
                Math.min(e.target.scrollHeight, 128) + "px";
            }}
          />
        </div>

        {/* Emoji button moved outside */}
        <div className="relative">
          <button
            type="button"
            className="btn btn-circle btn-ghost btn-sm sm:btn-md"
            onClick={(e) => {
              e.stopPropagation();
              setShowEmojiPicker(!showEmojiPicker);
            }}
          >
            <Smile size={20} />
          </button>

          {showEmojiPicker && (
            <div className="absolute bottom-full right-0 mb-2 z-[100]">
              <div
                className="fixed inset-0 -z-10"
                onClick={() => setShowEmojiPicker(false)}
              />
              <EmojiPicker
                onEmojiClick={handleEmojiClick}
                theme="dark"
                width={280}
                height={400}
                searchDisabled
                skinTonesDisabled
                previewConfig={{ showPreview: false }}
              />
            </div>
          )}
        </div>

        {/* Send / Mic */}
        {text.trim() || imagePreview || mediaPreviews.length > 0 ? (
          <button
            type="submit"
            className="btn btn-circle btn-primary btn-md shadow-lg hover:shadow-xl transition-all hover:scale-105"
            disabled={(!text.trim() && !imagePreview && mediaPreviews.length === 0) || isUploading}
            title="Send message"
          >
            <Send size={20} className="ml-0.5" />
          </button>
        ) : (
          <button
            type="button"
            className="btn btn-circle btn-ghost btn-md hover:bg-base-200/50 text-base-content/70 hover:text-base-content"
            title="Voice message"
          >
            <Mic size={20} />
          </button>
        )}
      </form>
    </div>
  );
};

export default MessageInput;
