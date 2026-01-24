import Navbar from "./components/Navbar";
import PWAInstallPrompt from "./components/PWAInstallPrompt";

import Home from "./pages/Home";
import SignUp from "./pages/Signup";
import Login from "./pages/Login";
import Setting from "./pages/Setting";
import Profile from "./pages/Profile";

import { Routes, Route, Navigate } from "react-router-dom";
import { useAuthStore } from "./store/useAuthStore";
import { useChatStore } from "./store/useChatStore";
import { useThemeStore } from "./store/useThemeStore";
import { useEffect, useCallback, useRef } from "react";

// import { Loader } from "lucide-react";
import { Toaster } from "react-hot-toast";

const App = () => {
  const { authUser, checkAuth, isCheckingAuth, onlineUsers } = useAuthStore();
  const { initNotifications } = useChatStore();
  const { theme } = useThemeStore();
  
  // Track render count to detect infinite loops
  const renderCount = useRef(0);
  const lastRenderTime = useRef(Date.now());
  
  renderCount.current += 1;
  const now = Date.now();
  const timeSinceLastRender = now - lastRenderTime.current;
  lastRenderTime.current = now;
  
  console.log(`🔄 App render #${renderCount.current} (${timeSinceLastRender}ms since last render)`);
  
  // Detect infinite render loop
  // if (renderCount.current > 100) {
  //   console.error("🚨 INFINITE RENDER LOOP DETECTED! Stopping execution.");
  //   console.error("Check the following:");
  //   console.error("1. useEffect dependencies");
  //   console.error("2. State updates in render");
  //   console.error("3. Zustand store updates");
  //   throw new Error("Infinite render loop detected");
  // }

  console.log({ onlineUsers });

  // CRITICAL FIX: Use a ref to track if checkAuth has been called
  const hasCheckedAuth = useRef(false);
  
  useEffect(() => {
    // Only run checkAuth ONCE
    if (!hasCheckedAuth.current) {
      console.log("✅ Running checkAuth for the first time");
      hasCheckedAuth.current = true;
      checkAuth();
    } else {
      console.log("⏭️ Skipping checkAuth - already called");
    }
  }, []); // COMPLETELY EMPTY - no dependencies at all

  // Initialize notifications when user is authenticated - run only once per auth change
  const hasInitNotifications = useRef(false);
  const lastAuthUserId = useRef(null);
  
  useEffect(() => {
    if (authUser && authUser._id !== lastAuthUserId.current) {
      if (!hasInitNotifications.current) {
        console.log("✅ Initializing notifications for user:", authUser._id);
        hasInitNotifications.current = true;
        lastAuthUserId.current = authUser._id;
        initNotifications();
      }
    } else if (!authUser) {
      // Reset when logged out
      hasInitNotifications.current = false;
      lastAuthUserId.current = null;
    }
  }, [authUser?._id]); // Only depend on user ID

  console.log({ authUser });

  if (isCheckingAuth && !authUser)
    return (
      <div className="flex items-center justify-center h-screen bg-transparent">
      </div>
    );

  return (
    <div data-theme={theme}>
      <Navbar />

      <Routes>
        <Route
          path="/"
          element={authUser ? <Home /> : <Navigate to="/login" />}
        />
        <Route
          path="/signup"
          element={!authUser ? <SignUp /> : <Navigate to="/" />}
        />
        <Route
          path="/login"
          element={!authUser ? <Login /> : <Navigate to="/" />}
        />
        <Route path="/settings" element={<Setting />} />
        <Route
          path="/profile"
          element={authUser ? <Profile /> : <Navigate to="/login" />}
        />
      </Routes>

      <Toaster />
      
      {/* PWA Install Prompt */}
      {authUser && <PWAInstallPrompt />}
    </div>
  );
};
export default App;
