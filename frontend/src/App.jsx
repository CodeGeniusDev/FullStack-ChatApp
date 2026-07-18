import Navbar from "./components/Navbar";
import PWAInstallPrompt from "./components/PWAInstallPrompt";
import ErrorBoundary from "./components/ErrorBoundary";

import { Routes, Route, Navigate } from "react-router-dom";
import { useAuthStore } from "./store/useAuthStore";
import { useChatStore } from "./store/useChatStore";
import { useThemeStore } from "./store/useThemeStore";
import { lazy, Suspense, useEffect } from "react";

// import { Loader } from "lucide-react";
import { Toaster } from "react-hot-toast";

const Home = lazy(() => import("./pages/Home"));
const SignUp = lazy(() => import("./pages/Signup"));
const Login = lazy(() => import("./pages/Login"));
const Setting = lazy(() => import("./pages/Setting"));
const Profile = lazy(() => import("./pages/Profile"));
const NotFound = lazy(() => import("./pages/NotFound"));

const RouteLoader = () => (
  <div className="flex min-h-[calc(100dvh-4rem)] items-center justify-center bg-base-100">
    <span className="loading loading-spinner loading-lg text-primary" aria-label="Loading page" />
  </div>
);

const App = () => {
  const authUser = useAuthStore((state) => state.authUser);
  const checkAuth = useAuthStore((state) => state.checkAuth);
  const isCheckingAuth = useAuthStore((state) => state.isCheckingAuth);
  const socket = useAuthStore((state) => state.socket);
  const initNotifications = useChatStore((state) => state.initNotifications);
  const { theme } = useThemeStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (authUser) {
      useChatStore.setState({ pinnedContacts: authUser.pinnedContacts || [], mutedChats: authUser.mutedChats || [] });
      initNotifications();
    } else {
      useChatStore.getState().resetSession();
    }
  }, [authUser, initNotifications]);

  useEffect(() => {
    if (!authUser || !socket) return undefined;
    const chatStore = useChatStore.getState();
    chatStore.subscribeToMessages();
    return () => chatStore.unsubscribeFromMessages();
  }, [authUser, socket]);

  if (isCheckingAuth && !authUser)
    return (
      // <div className="flex items-center justify-center h-screen bg-transparent">
      // </div>
      <div className="flex flex-col items-center justify-center min-h-screen bg-base-100 p-4">
        <div className="relative">
          {/* Pulsing circle animation */}
          <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
            <div className="w-10 h-10 rounded-full bg-primary animate-ping opacity-75"></div>
          </div>

          {/* Optional: App logo can be placed here */}
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-2xl font-bold text-primary">
              <img loading="eager" src="/favicon.ico" alt="logo" />
            </span>
          </div>
        </div>

        <p className="mt-4 text-base-content/70">
          Loading your chat experience...
        </p>

        {/* Optional: Progress bar */}
        <div className="w-48 h-1.5 bg-base-300 rounded-full overflow-hidden mt-6">
          <div className="h-full bg-primary rounded-full animate-pulse"></div>
        </div>
      </div>
    );

  return (
    <ErrorBoundary>
      <div data-theme={theme}>
        <Navbar />

        <Suspense fallback={<RouteLoader />}>
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
            <Route path="/settings" element={authUser ? <Setting /> : <Navigate to="/login" replace />} />
            <Route
              path="/profile"
              element={authUser ? <Profile /> : <Navigate to="/login" replace />}
            />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>

        <Toaster />

        {/* PWA Install Prompt */}
        {authUser && <PWAInstallPrompt />}
      </div>
    </ErrorBoundary>
  );
};
export default App;
