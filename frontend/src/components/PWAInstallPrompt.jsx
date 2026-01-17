import { useEffect, useState } from "react";
import { X, Download, Smartphone } from "lucide-react";

const PWAInstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSPrompt, setShowIOSPrompt] = useState(false);

  useEffect(() => {
    // Detect iOS
    const iOS =
      /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    setIsIOS(iOS);

    // Check if already installed
    const isInstalled = window.matchMedia("(display-mode: standalone)").matches;

    // Check if user dismissed prompt before
    const dismissedAt = localStorage.getItem("pwa-install-dismissed");
    const dismissedRecently =
      dismissedAt &&
      Date.now() - parseInt(dismissedAt) < 7 * 24 * 60 * 60 * 1000; // 7 days

    if (!isInstalled && !dismissedRecently) {
      if (iOS) {
        // Show iOS prompt after 3 seconds
        setTimeout(() => {
          const alreadyInstalled = localStorage.getItem("pwa-installed");
          if (!alreadyInstalled) {
            setShowIOSPrompt(true);
          }
        }, 3000);
      }
    }

    // Listen for beforeinstallprompt (Android/Chrome)
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);

      // Show prompt after 3 seconds
      setTimeout(() => {
        if (!dismissedRecently) {
          setShowPrompt(true);
        }
      }, 3000);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    // Listen for app installed
    window.addEventListener("appinstalled", () => {
      console.log("PWA installed");
      setShowPrompt(false);
      setShowIOSPrompt(false);
      localStorage.setItem("pwa-installed", "true");
    });

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt
      );
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    // Show install prompt
    deferredPrompt.prompt();

    // Wait for user response
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User response: ${outcome}`);

    if (outcome === "accepted") {
      localStorage.setItem("pwa-installed", "true");
    }

    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    setShowIOSPrompt(false);
    localStorage.setItem("pwa-install-dismissed", Date.now().toString());
  };

  if (showIOSPrompt && isIOS) {
    return (
      <div className="fixed bottom-0 left-0 right-0 z-[9999] p-4 pb-safe">
        <div className="backdrop-blur-xl bg-base-100/95 border-2 border-primary/20 rounded-2xl shadow-2xl p-4 max-w-md mx-auto">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
              <Smartphone className="w-6 h-6 text-primary" />
            </div>

            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-base mb-1">Install Chat App</h3>
              <p className="text-sm text-base-content/70 mb-3">
                Add to your home screen for the best experience!
              </p>

              <div className="bg-base-200/50 rounded-lg p-3 mb-3 text-xs space-y-1">
                <p className="flex items-center gap-2">
                  <span className="text-lg">1️⃣</span>
                  <span>
                    Tap the Share button{" "}
                    <span className="inline-block text-primary">⎙</span>
                  </span>
                </p>
                <p className="flex items-center gap-2">
                  <span className="text-lg">2️⃣</span>
                  <span>Scroll and tap "Add to Home Screen"</span>
                </p>
                <p className="flex items-center gap-2">
                  <span className="text-lg">3️⃣</span>
                  <span>Tap "Add" to install</span>
                </p>
              </div>

              <button
                onClick={handleDismiss}
                className="btn btn-sm btn-ghost w-full"
              >
                Maybe Later
              </button>
            </div>

            <button
              onClick={handleDismiss}
              className="btn btn-ghost btn-sm btn-circle flex-shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (showPrompt && deferredPrompt) {
    return (
      <div className="fixed bottom-0 left-0 right-0 z-[9999] p-4 pb-safe">
        <div className="backdrop-blur-xl bg-base-100/95 border-2 border-primary/20 rounded-2xl shadow-2xl p-4 max-w-md mx-auto animate-slide-up">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-primary to-secondary rounded-xl flex items-center justify-center shadow-lg">
              <Download className="w-6 h-6 text-white" />
            </div>

            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-base mb-1">Install Chat App</h3>
              <p className="text-sm text-base-content/70 mb-3">
                Get instant notifications and faster access! Works offline too.
              </p>

              <div className="flex gap-2">
                <button
                  onClick={handleInstallClick}
                  className="btn btn-primary btn-sm flex-1"
                >
                  <Download className="w-4 h-4" />
                  Install Now
                </button>
                <button
                  onClick={handleDismiss}
                  className="btn btn-ghost btn-sm"
                >
                  Later
                </button>
              </div>
            </div>

            <button
              onClick={handleDismiss}
              className="btn btn-ghost btn-sm btn-circle flex-shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default PWAInstallPrompt;
