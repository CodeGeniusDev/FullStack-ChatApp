import { useChatStore } from "../store/useChatStore";
import { useEffect } from "react";

import Sidebar from "../components/Sidebar.jsx";
import NoChatSelected from "../components/NoChatSelected.jsx";
import ChatContainer from "../components/ChatContainer.jsx";

const HomePage = () => {
  const { selectedUser, initNotifications } = useChatStore();

  // Initialize notifications on mount
  useEffect(() => {
    initNotifications();
  }, [initNotifications]);

  return (
    <div className="relative h-screen overflow-hidden">
      {/* Background */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-10"
        style={{
          backgroundImage: "url('/bg.png')",
        }}
      />

      {/* Main Container */}
      <div className="flex items-center justify-center lg:pt-20 pt-16 px-0 border-2 border-base-300 lg:px-4 z-20">
        <div className="bg-base-100 rounded-none lg:rounded-lg shadow-cl w-full h-[calc(100vh-4.2rem)] lg:h-[calc(100vh-6rem)] z-20 border-0 lg:border-2 border-base-300">
          <div className="flex h-full rounded-none lg:rounded-lg overflow-hidden">
            {/* Sidebar - Hidden on mobile when chat is selected */}
            <div
              className={`${
                selectedUser ? "hidden lg:flex" : "flex"
              } w-full lg:w-auto`}
            >
              <Sidebar />
            </div>

            {/* Chat Area - Only visible on mobile when chat is selected */}
            <div
              className={`${selectedUser ? "flex" : "hidden lg:flex"} flex-1`}
            >
              {!selectedUser ? <NoChatSelected /> : <ChatContainer />}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
