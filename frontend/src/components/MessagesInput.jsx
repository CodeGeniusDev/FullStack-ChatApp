import { useEffect, useRef, useState } from "react";
import { useChatStore } from "../store/useChatStore";
import { Image, Send, X, Smile } from "lucide-react";
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

  useEffect(() => {
    if (editingMessage) {
      setText(editingMessage.text || "");
      textareaRef.current?.focus();
    }
  }, [editingMessage]);

  const handleImageChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    // Check file size (max 5MB before compression)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image size should be less than 5MB");
      return;
    }

    setIsUploading(true);
    toast.loading("Compressing image...", { id: "compress" });

    try {
      // Compress image before upload
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

  // Debounced typing indicator
  const debouncedStopTyping = useRef(
    debounce(() => {
      setTyping(false);
    }, 3000)
  ).current;

  const handleTyping = (value) => {
    setText(value);

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    setTyping(true);
    debouncedStopTyping();
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();

    if (!text.trim() && !imagePreview) return;

    try {
      if (editingMessage) {
        await editMessage(editingMessage._id, text.trim());
        setEditingMessage(null);
      } else {
        await sendMessage({
          text: text.trim(),
          image: imagePreview,
        });
      }

      // Clear form
      setText("");
      setImagePreview(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      setTyping(false);

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = "40px";
      }
    } catch (error) {
      console.error("Failed to send message:", error);
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
    <div className="p-4 w-full border-t border-base-300">
      {/* Reply Preview */}
      {replyingTo && (
        <div className="mb-2 flex items-center gap-2 bg-base-200 p-2 rounded-lg">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-primary font-semibold">
              Replying to {replyingTo.senderId.fullName}
            </p>
            <p className="text-sm truncate opacity-70">
              {replyingTo.text || "Image"}
            </p>
          </div>
          <button
            onClick={clearReplyingTo}
            className="btn btn-ghost btn-sm btn-circle flex-shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Edit Preview */}
      {editingMessage && (
        <div className="mb-2 flex items-center gap-2 bg-base-200 p-2 rounded-lg">
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
            className="btn btn-ghost btn-sm btn-circle flex-shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Image Preview */}
      {imagePreview && (
        <div className="mb-3 flex items-center gap-2">
          <div className="relative">
            <img
              src={imagePreview}
              alt="Preview"
              className="w-20 h-20 object-cover rounded-lg border border-zinc-700"
            />
            <button
              onClick={removeImage}
              className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-base-300 cursor-pointer
              flex items-center justify-center"
              type="button"
            >
              <X className="size-3" />
            </button>
          </div>
        </div>
      )}

      <form onSubmit={handleSendMessage} className="flex items-end gap-2">
        <div className="flex-1 flex flex-col gap-2">
          <div className="flex items-end gap-2">
            <textarea
              ref={textareaRef}
              rows={1}
              className="flex-1 textarea textarea-bordered resize-none overflow-hidden overflow-y-auto outline-none text-sm sm:text-base"
              placeholder="Type a message..."
              value={text}
              onChange={(e) => handleTyping(e.target.value)}
              onKeyPress={handleKeyPress}
              style={{
                minHeight: "40px",
                maxHeight: "120px",
              }}
              onInput={(e) => {
                e.target.style.height = "40px";
                e.target.style.height = e.target.scrollHeight + "px";
              }}
            />

            <input
              type="file"
              accept="image/*"
              className="hidden"
              ref={fileInputRef}
              onChange={handleImageChange}
              disabled={isUploading}
            />

            {/* Emoji Picker Button */}
            <div className="relative">
              <button
                type="button"
                className="btn btn-circle btn-ghost btn-sm sm:btn-md"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              >
                <Smile size={20} />
              </button>

              {showEmojiPicker && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowEmojiPicker(false)}
                  />
                  <div className="absolute bottom-12 right-0 z-50">
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
                </>
              )}
            </div>

            {/* Image Upload Button */}
            {!editingMessage && (
              <button
                type="button"
                className={`btn btn-circle btn-ghost btn-sm sm:btn-md ${
                  imagePreview ? "text-emerald-500" : "text-zinc-400"
                } ${isUploading ? "loading" : ""}`}
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
              >
                {!isUploading && <Image size={20} />}
              </button>
            )}
          </div>
        </div>

        {/* Send Button */}
        <button
          type="submit"
          className="btn btn-circle btn-primary btn-sm sm:btn-md"
          disabled={(!text.trim() && !imagePreview) || isUploading}
        >
          <Send size={18} />
        </button>
      </form>
    </div>
  );
};

export default MessageInput;
