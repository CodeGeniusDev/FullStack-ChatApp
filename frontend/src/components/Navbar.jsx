"use client";
import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Settings,
  User,
  LogOut,
  Download,
  Smartphone,
  Home,
  ArrowLeft,
} from "lucide-react";
import { useAuthStore } from "../store/useAuthStore";
import { useChatStore } from "../store/useChatStore";
import { useNavigate } from "react-router-dom";

const Navbar = () => {
  const { authUser, logOut } = useAuthStore();
  const { selectedUser } = useChatStore();
  const navigate = useNavigate();
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstallButton, setShowInstallButton] = useState(false);
  const [selectedImg, setSelectedImg] = useState(null);

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
    <>
      <header className="border-b border-base-300 fixed w-full top-0 z-20 backdrop-blur-lg bg-base-100/80">
        <div className="container mx-auto px-4 h-16">
          <div className="flex items-center justify-between h-full">
            <div className="flex items-center gap-8">
              <Link
                to="/"
                className="flex items-center gap-2.5 hover:opacity-80 transition-all"
              >
                <div className="size-9 rounded-full bg-primary/10 border border-white/30 flex items-center justify-center">
                  <img loading="eager" src="/favicon.ico" alt="logo" />
                </div>
                <h1 className="text-lg block font-bold tracking-wider transition-all">
                  ChatGeniusX
                </h1>
              </Link>
            </div>

            <div className="flex items-center gap-2">
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

              {showInstallButton && (
                <button
                  onClick={handleInstallClick}
                  className="btn btn-sm btn-circle btn-primary sm:hidden"
                  title="Install App"
                >
                  <Smartphone className="w-4 h-4" />
                </button>
              )}

              {!authUser && (
                <Link
                  to={"/settings"}
                  className="btn btn-sm gap-2 transition-colors"
                >
                  <Settings className="w-4 h-4" />
                  <span className="hidden sm:inline">Settings</span>
                </Link>
              )}

              {authUser ? (
                <>
                  {window.location.pathname !== "/" && (
                    <Link to="/">
                      <button className="btn btn-xs btn-circle btn-primary sm:mr-2">
                        <ArrowLeft className="w-4 h-4" />
                      </button>
                    </Link>
                  )}

                  <div className="hidden md:block">
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <h3 className="font-medium text-sm">
                          {authUser?.fullName}
                        </h3>
                        <p className="text-xs text-base-content/70">
                          {authUser?.bio}
                        </p>
                        {/* <p className="text-xs text-base-content/70">
                          {selectedUser ? `Chatting with ${selectedUser.fullName}` : 'No active chat'}
                        </p> */}
                      </div>
                    </div>
                  </div>
                  <div className="dropdown dropdown-end">
                    <div
                      tabIndex={0}
                      role="button"
                      className="btn btn-ghost btn-circle avatar"
                    >
                      <div className="w-10 rounded-full border border-gray-500">
                        <img
                          src={
                            selectedImg || authUser.profilePic || "/avatar.png"
                          }
                          alt="Profile"
                        />
                      </div>
                    </div>
                    <ul
                      tabIndex={0}
                      className="dropdown-content z-1 menu p-2 shadow bg-base-100 border border-base-300 rounded-box w-52 mt-2"
                    >
                      <li>
                        <Link
                          to={"/"}
                          className="gap-2"
                          onClick={() => document.activeElement?.blur()}
                        >
                          <Home className="size-4" />
                          <span className="inline">Back to Chat</span>
                        </Link>
                      </li>
                      <li>
                        <Link
                          to={"/profile"}
                          className="gap-2"
                          onClick={() => document.activeElement?.blur()}
                        >
                          <User className="size-4" />
                          <span className="inline">Profile</span>
                        </Link>
                      </li>
                      <li>
                        <Link
                          to={"/settings"}
                          className="gap-2"
                          onClick={() => document.activeElement?.blur()}
                        >
                          <Settings className="size-4" />
                          <span className="inline">Settings</span>
                        </Link>
                      </li>
                      <li>
                        <button
                          className="flex gap-2 hover:text-error items-center cursor-pointer"
                          onClick={logOut}
                        >
                          <LogOut className="size-4" />
                          <span className="inline">Logout</span>
                        </button>
                      </li>
                    </ul>
                  </div>
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
    </>
  );
};

export default Navbar;
