import { THEMES } from "../constants";
import { useThemeStore } from "../store/useThemeStore";
import { Send, Mic, Smile, Paperclip } from "lucide-react";

const PREVIEW_MESSAGES = [
  { id: 1, content: "Hey! How's it going?", isSent: false },
  {
    id: 2,
    content: "I'm doing great! Just working on some new features.",
    isSent: true,
  },
];

const SettingsPage = () => {
  const { theme, setTheme } = useThemeStore();

  return (
    <div className="h-auto container mx-auto px-4 py-20 max-w-5xl">
      <div className="space-y-6">
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-semibold">Theme</h2>
          <p className="text-sm text-base-content/70">
            Choose a theme for your chat interface
          </p>
        </div>

        <div className="grid grid-cols-3 sm:grid-cols-6 md:grid-cols-8 gap-2">
          {THEMES.map((t) => (
            <button
              key={t}
              className={`
                  group flex flex-col items-center gap-1.5 p-2 rounded-lg transition-colors cursor-pointer border border-base-300
                  ${theme === t ? "bg-base-200 border border-secondary" : "hover:bg-base-200/50"}
                `}
              onClick={() => setTheme(t)}
            >
              <div
                className="relative h-8 w-full rounded-md border border-base-300 overflow-hidden"
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
        <div className="w-full max-w-md mx-auto bg-base-100 rounded-lg overflow-hidden shadow-sm">
          {/* Chat Header */}
          <div className="bg-base-200 px-4 py-3 border-b border-base-300 flex items-center">
            <div className="w-10 h-10 rounded-full bg-base-300 flex-shrink-0 mr-3 flex items-center justify-center">
              <span className="text-gray-600">T</span>
            </div>
            <div className="flex-1">
              <h3 className="font-medium text-base-content">Jhon Joe</h3>
              <p className="text-xs text-base-content/70">Last seen 3m ago</p>
            </div>
          </div>

          {/* Chat Messages */}
          <div className="p-4 space-y-4 bg-base-100 h-96 overflow-y-auto">
            {PREVIEW_MESSAGES.map((message) => (
              <div
                key={message.id}
                className={`chat ${message.isSent ? "chat-end" : "chat-start"}`}
              >
                {!message.isSent && (
                  <div className="chat-image avatar">
                    <div className="w-8 h-8 rounded-full bg-base-300 flex items-center justify-center">
                      <span className="text-xs text-gray-600">T</span>
                    </div>
                  </div>
                )}
                <div
                  className={`chat-bubble ${message.isSent ? "bg-primary text-primary-content" : "bg-base-200 text-base-content"}`}
                >
                  <p className="text-sm">{message.content}</p>
                  <div className="flex items-center justify-end gap-1 mt-1">
                    <span
                      className={`text-xs ${message.isSent ? "opacity-70" : "opacity-50"}`}
                    >
                      {message.isSent ? "02:43 AM" : "02:57 AM"}
                    </span>
                    {message.isSent && (
                      <svg
                        className="w-3 h-3 opacity-70"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {/* Sent Message */}
            <div className="chat chat-end">
              <div className="chat-bubble bg-primary text-primary-content">
                <p className="text-sm">hi??</p>
                <div className="flex items-center justify-end gap-1 mt-1">
                  <span className="text-xs opacity-70">02:57 AM</span>
                  <svg
                    className="w-3 h-3 opacity-70"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* Input Area */}
          <div className="bg-base-200 border-t border-base-300 p-3">
            <div className="flex items-center gap-2">
              <button className="btn btn-circle btn-ghost btn-sm">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
                  />
                </svg>
              </button>
              <div className="flex-1 bg-base-100 rounded-xl px-4 py-2">
                <input
                  type="text"
                  placeholder="Type a message..."
                  className="w-full bg-transparent border-none focus:outline-none text-sm"
                />
              </div>
              <button className="btn btn-circle btn-ghost btn-sm">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </button>
              <button className="btn btn-circle btn-ghost btn-sm">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
export default SettingsPage;
