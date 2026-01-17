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
    <div className="relative h-screen">
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-10"
        style={{
          backgroundImage: "url('/bg.png')",
        }}
      />
      <div className="flex items-center justify-center pt-20 px-4 z-20">
        <div className="bg-base-100 rounded-lg shadow-cl w-full h-[calc(100vh-6rem)] z-20 border-2 border-base-300">
          <div className="flex h-full rounded-lg overflow-hidden">
            <Sidebar />

            {!selectedUser ? <NoChatSelected /> : <ChatContainer />}
          </div>
        </div>
      </div>
    </div>
  );
};
export default HomePage;
