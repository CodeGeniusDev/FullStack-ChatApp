import { useChatStore } from "../store/useChatStore";
import { useEffect } from "react";

import Sidebar from "../components/Sidebar.jsx";
import NoChatSelected from "../components/NoChatSelected.jsx";
import ChatContainer from "../components/ChatContainer.jsx";

const HomePage = () => {
  const { selectedUser } = useChatStore();

  return (
    <div className="relative h-screen overflow-hidden">
      {/* Background */}
      {/* <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-[0.1]"
        style={{
          backgroundImage: "url('/bg.png')",
        }}
      /> */}

      {/* Main Container */}
      <div className="flex items-center justify-center lg:pt-20 pt-15 px-0 lg:px-4 z-20 border-t-2 border-base-300">
        <div className="bg-base-100 rounded-none lg:rounded-box shadow-cl w-full h-[calc(100vh-3.8rem)] lg:h-[calc(100vh-6rem)] border-0 lg:border-2 border-base-300">
          <div className="flex h-full rounded-none lg:rounded-box overflow-hidden">
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
