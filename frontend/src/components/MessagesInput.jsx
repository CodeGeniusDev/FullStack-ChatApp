import { useEffect, useRef, useState } from "react";
import { useChatStore } from "../store/useChatStore";
import { Image, Send, X, Smile } from "lucide-react";
import toast from "react-hot-toast";
import EmojiPicker from "emoji-picker-react";

const MessageInput = ({
  editingMessage,
  setEditingMessage,
  onSendMessage,
  isPreview = false,
}) => {
  const [text, setText] = useState("");
  const [imagePreview, setImagePreview] = useState(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
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

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleTyping = (value) => {
    setText(value);

    // Clear previous timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Emit typing status
    setTyping(true);

    // Stop typing after 3 seconds of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      setTyping(false);
    }, 3000);
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();

    if (!text.trim() && !imagePreview) return;

    try {
      if (isPreview && onSendMessage) {
        // In preview mode, use the provided callback
        onSendMessage({ text: text.trim(), image: imagePreview });
      } else if (editingMessage) {
        // Edit existing message
        await editMessage(editingMessage._id, text.trim());
        setEditingMessage(null);
      } else {
        // Send new message
        await sendMessage({
          text: text.trim(),
          image: imagePreview,
        });
      }

      setText("");
      setImagePreview(null);
      if (!isPreview) {
        clearReplyingTo();
      }
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Failed to send message");
    }

    // Clear typing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
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
    <div className="p-4 w-full border-t border-base-300 bg-base-200/50 backdrop-blur-md -webkit-backdrop-blur-md relative overflow-x-hidden">
      {/* Reply Preview */}
      {replyingTo && (
        <div className="mb-2 flex items-center gap-2 backdrop-blur-lg bg-base-100/90 p-2 rounded-lg">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-primary font-semibold truncate">
              Replying to {replyingTo?.senderId?.fullName || "Unknown User"}
            </p>
            <p className="text-sm text-ellipsis overflow-hidden whitespace-nowrap opacity-70">
              {replyingTo?.text || (replyingTo?.image ? "Image" : "Message")}
            </p>
          </div>
          <button
            onClick={clearReplyingTo}
            className="btn btn-ghost btn-sm btn-circle"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Edit Preview */}
      {editingMessage && (
        <div className="mb-2 flex items-center gap-2 backdrop-blur-lg bg-base-100/90 p-2 rounded-lg">
          <div className="flex-1">
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
            className="btn btn-ghost btn-sm btn-circle"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Image Preview */}
      {imagePreview && (
        <div className="mb-3 flex items-center gap-2 backdrop-blur-lg bg-base-100/90 p-2 rounded-lg">
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
              className="flex-1 textarea textarea-bordered overflow-y-auto outline-none resize-none overflow-hidden"
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
            />

            {/* Emoji Picker Button */}
            <div className="relative">
              <button
                type="button"
                className="btn btn-circle btn-ghost"
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
                      width={300}
                      height={400}
                    />
                  </div>
                </>
              )}
            </div>

            {/* Image Upload Button */}
            {!editingMessage && !isPreview && (
              <button
                type="button"
                className={`btn btn-circle btn-ghost
                     ${
                       imagePreview
                         ? "text-primary bg-primary/10 border-primary/20"
                         : "text-base-400/60"
                     }`}
                onClick={() => fileInputRef.current?.click()}
              >
                <Image size={20} />
              </button>
            )}
          </div>
        </div>

        {/* Send Button */}
        <button
          type="submit"
          className="btn btn-circle btn-primary"
          disabled={!text.trim() && !imagePreview}
        >
          <Send size={20} />
        </button>
      </form>
    </div>
  );
};

export default MessageInput;
