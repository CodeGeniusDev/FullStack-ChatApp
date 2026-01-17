import { useEffect, useRef, useState } from "react";
import { useChatStore } from "../store/useChatStore";
import { Image, Send, X, Smile, Paperclip, Mic } from "lucide-react";
import toast from "react-hot-toast";
import EmojiPicker from "emoji-picker-react";
import { compressImage, debounce } from "../lib/utils";

const MessageInput = ({ editingMessage, setEditingMessage }) => {
  const [text, setText] = useState("");
  const [imagePreview, setImagePreview] = useState(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

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
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image size should be less than 5MB");
      return;
    }

    setIsUploading(true);
    toast.loading("Compressing image...", { id: "compress" });

    try {
      const compressedBase64 = await compressImage(file, 1024, 1024, 0.8);
      setImagePreview(compressedBase64);
      toast.success("Image ready to send", { id: "compress" });
    } catch (error) {
      console.error("Image compression error:", error);
      toast.error("Failed to process image", { id: "compress" });
    } finally {
      setIsUploading(false);
    }
  };

  const removeImage = () => {
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleTyping = (value) => {
    setText(value);
    setTyping(true);
    debouncedStopTyping();
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();

    if (!text.trim() && !imagePreview) return;

    // Store values before clearing
    const messageText = text.trim();
    const messageImage = imagePreview;

    // IMMEDIATELY clear input for instant feedback
    setText("");
    setImagePreview(null);
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
        await sendMessage({
          text: messageText,
          image: messageImage,
        });
      }
    } catch (error) {
      console.error("Failed to send/edit message:", error);
      // On error, restore the text
      setText(messageText);
      setImagePreview(messageImage);
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
    <div className="p-3 w-full border-t border-base-300 backdrop-blur-md bg-base-100/80">
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

      {/* Image preview */}
      {imagePreview && (
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
          accept="image/*"
          className="hidden"
          ref={fileInputRef}
          onChange={handleImageChange}
          disabled={isUploading}
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
        {text.trim() || imagePreview ? (
          <button
            type="submit"
            className="btn btn-circle btn-primary btn-md shadow-lg hover:shadow-xl transition-all hover:scale-105"
            disabled={(!text.trim() && !imagePreview) || isUploading}
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
