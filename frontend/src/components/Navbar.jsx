import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Settings,
  User,
  LogOut,
  Download,
  Smartphone,
} from "lucide-react";
import { useAuthStore } from "../store/useAuthStore";

const Navbar = () => {
  const { authUser, logOut } = useAuthStore();
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstallButton, setShowInstallButton] = useState(false);

  useEffect(() => {
    // Check if already installed
    const isInstalled = window.matchMedia("(display-mode: standalone)").matches;

    if (!isInstalled) {
      // Listen for install prompt
      const handleBeforeInstallPrompt = (e) => {
        e.preventDefault();
        setDeferredPrompt(e);
        setShowInstallButton(true);
      };

      window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

      // Check iOS
      const isIOS =
        /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
      if (isIOS && !localStorage.getItem("pwa-installed")) {
        setShowInstallButton(true);
      }

      return () => {
        window.removeEventListener(
          "beforeinstallprompt",
          handleBeforeInstallPrompt,
        );
      };
    }
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;

      if (outcome === "accepted") {
        setShowInstallButton(false);
        localStorage.setItem("pwa-installed", "true");
      }

      setDeferredPrompt(null);
    } else {
      // iOS or already prompted
      const message = /iPad|iPhone|iPod/.test(navigator.userAgent)
        ? 'Tap Share (⎙) then "Add to Home Screen" to install!'
        : "Install the app for a better experience!";
      alert(message);
    }
  };

  return (
    <header className="border-b border-base-300 fixed w-full top-0 z-20 backdrop-blur-lg bg-base-100/80">
      <div className="container mx-auto px-4 h-16">
        <div className="flex items-center justify-between h-full">
          <div className="flex items-center gap-8">
            <Link
              to="/"
              className="flex items-center gap-2.5 hover:opacity-80 transition-all"
            >
              <div className="size-9 rounded-full bg-primary/10 border border-white/30 flex items-center justify-center">
                {/* <MessageSquare className="w-5 h-5 text-primary" /> */}
                <img src="/favicon.ico" alt="" />
              </div>
              <h1 className="text-lg hidden sm:block font-bold tracking-wider transition-all">
                ChatGeniusX
              </h1>
            </Link>
          </div>

          <div className="flex items-center gap-2">
            {/* Install App Button - Desktop */}
            {showInstallButton && (
              <button
                onClick={handleInstallClick}
                className="btn btn-sm gap-2 btn-primary hidden sm:flex"
                title="Install App"
              >
                <Download className="w-4 h-4" />
                <span className="hidden md:inline">Install App</span>
              </button>
            )}

            {/* Mobile Install Button */}
            {showInstallButton && (
              <button
                onClick={handleInstallClick}
                className="btn btn-sm btn-circle btn-primary sm:hidden"
                title="Install App"
              >
                <Smartphone className="w-4 h-4" />
              </button>
            )}

            <Link
              to={"/settings"}
              className="btn btn-sm gap-2 transition-colors"
            >
              <Settings className="w-4 h-4" />
              <span className="hidden sm:inline">Settings</span>
            </Link>

            {authUser ? (
              <>
                <Link to={"/profile"} className="btn btn-sm gap-2">
                  <User className="size-5" />
                  <span className="hidden sm:inline">Profile</span>
                </Link>

                <button
                  className="flex gap-2 hover:text-error items-center cursor-pointer"
                  onClick={logOut}
                >
                  <LogOut className="size-5" />
                  <span className="hidden sm:inline">Logout</span>
                </button>
              </>
            ) : (
              <>
                <Link to={"/login"} className="btn btn-sm gap-2">
                  <User className="size-5" />
                  <span className="hidden sm:inline">Login</span>
                </Link>
                <Link to={"/signup"} className="btn btn-sm gap-2">
                  <User className="size-5" />
                  <span className="hidden sm:inline">Sign Up</span>
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
