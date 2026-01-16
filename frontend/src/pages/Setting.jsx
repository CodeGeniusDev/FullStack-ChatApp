import { THEMES } from "../constants";
import { useThemeStore } from "../store/useThemeStore";
import { useState } from "react";
import MessageInput from "../components/MessagesInput";
import { useAuthStore } from "../store/useAuthStore";
import { formatMessageTime } from "../lib/utils";
import { Check, CheckCheck } from "lucide-react";

const PREVIEW_MESSAGES = [
  {
    _id: 1,
    text: "Hey! How's it going?",
    senderId: { _id: "preview-user", fullName: "Preview User" },
    createdAt: new Date(),
    status: "delivered",
  },
  {
    _id: 2,
    text: "I'm doing great! Just working on some new features.",
    senderId: { _id: "current-user", fullName: "You" },
    createdAt: new Date(),
    status: "read",
  },
];

const SettingsPage = () => {
  const { theme, setTheme } = useThemeStore();
  const { authUser } = useAuthStore();
  const [messages, setMessages] = useState(PREVIEW_MESSAGES);

  const handleSendMessage = async (message) => {
    const newMessage = {
      _id: Date.now(),
      text: message.text,
      senderId: { _id: "current-user", fullName: "You" },
      createdAt: new Date(),
      status: "sent",
    };

    setMessages((prev) => [...prev, newMessage]);

    // Simulate reply after 1 second
    setTimeout(() => {
      const replyMessage = {
        _id: Date.now() + 1,
        text: "Thanks for your message! This is a preview, so I can't actually respond.",
        senderId: { _id: "preview-user", fullName: "Preview User" },
        createdAt: new Date(),
        status: "delivered",
      };
      setMessages((prev) => [...prev, replyMessage]);
    }, 1000);
  };

  return (
    <div className="h-auto container mx-auto px-4 py-20 max-w-5xl">
      <div className="space-y-6">
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-semibold">Theme</h2>
          <p className="text-sm text-base-content/70">
            Choose a theme for your chat interface
          </p>
        </div>

        {/* Theme Section */}
        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
          {THEMES.map((t) => (
            <button
              key={t}
              className={`
                group flex flex-col items-center gap-1.5 p-2 rounded-lg border-2 border-base-300 transition-colors cursor-pointer
                ${
                  theme === t
                    ? "bg-base-200 border-2 border-secondary"
                    : "hover:bg-base-200/50"
                }
              `}
              onClick={() => setTheme(t)}
            >
              <div
                className="relative h-8 w-full rounded-md overflow-hidden"
                data-theme={t}
              >
                <div className="absolute inset-0 grid grid-cols-4 gap-px p-1">
                  <div className="rounded bg-primary"></div>
                  <div className="rounded bg-secondary"></div>
                  <div className="rounded bg-accent"></div>
                  <div className="rounded bg-neutral"></div>
                </div>
              </div>
              <span className="text-[11px] font-medium truncate w-full text-center">
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </span>
            </button>
          ))}
        </div>

        {/* Preview Section */}
        <h3 className="text-lg font-semibold mb-3">Preview</h3>
        <div className="rounded-xl border border-base-300 overflow-hidden bg-base-100 shadow-lg">
          <div className="p-4 bg-base-200">
            <div className="max-w-lg mx-auto">
              <div className="bg-base-100 rounded-xl shadow-sm overflow-hidden">
                {/* Chat Header */}
                <div className="px-4 py-3 border-b border-base-300 bg-base-100 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium">
                    {authUser?.fullName?.charAt(0) || "U"}
                  </div>
                  <div>
                    <h3 className="font-medium">Theme Preview</h3>
                    <p className="text-xs text-base-content/70">Online</p>
                  </div>
                </div>

                {/* Chat Messages */}
                <div className="p-4 space-y-4 min-h-[300px] max-h-[300px] overflow-y-auto bg-base-100">
                  {messages.map((message) => {
                    const isOwnMessage =
                      message.senderId._id === "current-user";

                    return (
                      <div
                        key={message._id}
                        className={`chat ${
                          isOwnMessage ? "chat-end" : "chat-start"
                        }`}
                      >
                        {!isOwnMessage && (
                          <div className="chat-image avatar">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                              {message.senderId.fullName.charAt(0)}
                            </div>
                          </div>
                        )}
                        <div className="chat-header opacity-70 text-xs mb-1">
                          {isOwnMessage ? "You" : message.senderId.fullName}
                          <time className="text-xs opacity-50 ml-1">
                            {formatMessageTime(message.createdAt)}
                          </time>
                        </div>
                        <div
                          className={`chat-bubble ${
                            isOwnMessage
                              ? "chat-bubble"
                              : "bg-base-200 text-base-content"
                          }`}
                        >
                          {message.text}
                        </div>
                        {isOwnMessage && (
                          <div className="chat-footer opacity-50 flex items-center gap-0.5">
                            {message.status === "sent" && (
                              <Check className="w-3 h-3" />
                            )}
                            {message.status === "delivered" && (
                              <CheckCheck className="w-3 h-3" />
                            )}
                            {message.status === "read" && (
                              <CheckCheck className="w-3 h-3 text-primary" />
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Chat Input */}
                <div className="p-4 border-t border-base-300 bg-base-100">
                  <MessageInput
                    onSendMessage={handleSendMessage}
                    isPreview={true}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
export default SettingsPage;
